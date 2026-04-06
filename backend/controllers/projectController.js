const sitemapService = require('../services/sitemapService');
const wpService = require('../services/wpService');
const contentService = require('../services/contentService');
const geminiService = require('../services/geminiService');
const storageService = require('../services/storageService');
const { geminiLimiter } = require('../middleware/rateLimiter');

// List all projects
exports.listProjects = (req, res) => {
  const projects = storageService.listProjects();
  res.json(projects);
};

// Get a project by domain
exports.getProject = (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

  const project = storageService.loadProject(domain);
  if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

  res.json(project);
};

// Delete a project
exports.deleteProject = (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });
  storageService.deleteProject(domain);
  res.json({ success: true });
};

// Fetch content from sitemap or WP API
exports.fetchContent = async (req, res, next) => {
  try {
    const { domain, source } = req.body;
    if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

    let articles = [];

    if (source === 'wordpress') {
      const username = req.body.wpUsername || process.env.WP_USERNAME;
      const appPassword = req.body.wpAppPassword || process.env.WP_APP_PASSWORD;
      if (!username || !appPassword) {
        return res.status(400).json({ error: true, message: 'WordPress credentials required' });
      }

      const wpContent = await wpService.fetchAllWpContent(domain, username, appPassword);
      articles = wpContent.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        url: item.url,
        content: contentService.stripHtml(item.content),
        rawContent: item.content,
        type: item.type,
        analysis: null,
        suggestions: null,
        status: 'fetched',
      }));
    } else {
      // Sitemap mode
      const urls = await sitemapService.fetchAllSitemapUrls(domain);
      const extracted = [];
      for (const url of urls) {
        try {
          const data = await contentService.extractContentFromUrl(url);
          extracted.push(data);
        } catch (err) {
          console.error(`Failed to extract ${url}:`, err.message);
        }
      }
      articles = extracted.map((item, idx) => ({
        id: idx + 1,
        title: item.title,
        slug: item.slug,
        url: item.url,
        content: item.content,
        rawContent: '',
        type: 'unknown',
        analysis: null,
        suggestions: null,
        status: 'fetched',
      }));
    }

    const project = {
      domain,
      source,
      articles,
      logs: [{ timestamp: new Date().toISOString(), action: 'fetch', message: `Fetched ${articles.length} articles` }],
      lastUpdated: new Date().toISOString(),
      status: 'fetched',
    };

    storageService.saveProject(domain, project);
    res.json({ success: true, articleCount: articles.length, project });
  } catch (err) {
    next(err);
  }
};

// Analyze all articles with Gemini
exports.analyzeContent = async (req, res, next) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

    const project = storageService.loadProject(domain);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

    let analyzed = 0;
    let skipped = 0;
    let failed = 0;
    for (let i = 0; i < project.articles.length; i++) {
      const article = project.articles[i];
      // Skip already successfully analyzed articles (resume support)
      if (article.analysis && !article.analysis.error) {
        skipped++;
        analyzed++;
        continue;
      }
      try {
        article.analysis = await geminiLimiter.execute(() =>
          geminiService.analyzeContent(article)
        );
        article.status = 'analyzed';
        analyzed++;

        // Save progress after every article for crash resilience
        storageService.saveProject(domain, project);
        console.log(`Analyzed ${analyzed}/${project.articles.length}: ${article.title}`);
      } catch (err) {
        failed++;
        console.error(`Failed to analyze ${article.url}:`, err.message);
        // Store error but keep analysis null-ish so retry picks it up
        article.analysis = { main_topic: '', keywords: [], semantic_tags: [], summary: '', error: err.message };
        storageService.saveProject(domain, project);
      }
    }

    project.status = 'analyzed';
    project.lastUpdated = new Date().toISOString();
    project.logs.push({ timestamp: new Date().toISOString(), action: 'analyze', message: `Analyzed ${analyzed} articles (${skipped} resumed, ${failed} failed)` });
    storageService.saveProject(domain, project);

    res.json({ success: true, analyzed, project });
  } catch (err) {
    next(err);
  }
};

// Analyze with SSE progress streaming
exports.analyzeContentStream = async (req, res) => {
  const { domain } = req.query;
  if (!domain) {
    res.status(400).json({ error: true, message: 'domain is required' });
    return;
  }

  const project = storageService.loadProject(domain);
  if (!project) {
    res.status(404).json({ error: true, message: 'Project not found' });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const total = project.articles.length;
  const alreadyDone = project.articles.filter((a) => a.analysis && !a.analysis.error).length;

  send('init', { total, alreadyDone });

  let analyzed = alreadyDone;
  let failed = 0;
  let aborted = false;

  req.on('close', () => { aborted = true; });

  for (let i = 0; i < project.articles.length; i++) {
    if (aborted) break;

    const article = project.articles[i];
    if (article.analysis && !article.analysis.error) continue;

    try {
      article.analysis = await geminiLimiter.execute(() =>
        geminiService.analyzeContent(article)
      );
      article.status = 'analyzed';
      analyzed++;
      storageService.saveProject(domain, project);

      send('progress', {
        index: i,
        analyzed,
        failed,
        total,
        remaining: total - analyzed - failed,
        article: {
          url: article.url,
          title: article.title,
          status: article.status,
          analysis: article.analysis,
        },
      });
    } catch (err) {
      failed++;
      console.error(`Failed to analyze ${article.url}:`, err.message);
      article.analysis = { main_topic: '', keywords: [], semantic_tags: [], summary: '', error: err.message };
      storageService.saveProject(domain, project);

      send('progress', {
        index: i,
        analyzed,
        failed,
        total,
        remaining: total - analyzed - failed,
        article: {
          url: article.url,
          title: article.title,
          status: article.status,
          analysis: article.analysis,
        },
      });
    }
  }

  project.status = 'analyzed';
  project.lastUpdated = new Date().toISOString();
  project.logs.push({
    timestamp: new Date().toISOString(),
    action: 'analyze',
    message: `Analyzed ${analyzed} articles (${alreadyDone} resumed, ${failed} failed)`,
  });
  storageService.saveProject(domain, project);

  send('done', { analyzed, failed, total });
  res.end();
};

// Generate linking suggestions
exports.generateSuggestions = async (req, res, next) => {
  try {
    const { domain, articleUrl } = req.body;
    if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

    const project = storageService.loadProject(domain);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

    const targetArticles = articleUrl
      ? project.articles.filter((a) => a.url === articleUrl)
      : project.articles;

    let generated = 0;
    for (const article of targetArticles) {
      try {
        const result = await geminiLimiter.execute(() =>
          geminiService.generateLinkingSuggestions(article, project.articles)
        );
        article.suggestions = result.links || [];
        article.status = 'suggestions_ready';
        generated++;

        if (generated % 3 === 0) {
          storageService.saveProject(domain, project);
        }
      } catch (err) {
        console.error(`Failed to generate suggestions for ${article.url}:`, err.message);
        article.suggestions = [];
      }
    }

    project.status = 'suggestions_ready';
    project.lastUpdated = new Date().toISOString();
    project.logs.push({ timestamp: new Date().toISOString(), action: 'suggest', message: `Generated suggestions for ${generated} articles` });
    storageService.saveProject(domain, project);

    res.json({ success: true, generated, project });
  } catch (err) {
    next(err);
  }
};

// Approve / reject / edit link suggestions
exports.updateSuggestions = (req, res) => {
  const { domain, articleUrl, suggestions } = req.body;
  if (!domain || !articleUrl || !suggestions) {
    return res.status(400).json({ error: true, message: 'domain, articleUrl, and suggestions are required' });
  }

  const project = storageService.loadProject(domain);
  if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

  const article = project.articles.find((a) => a.url === articleUrl);
  if (!article) return res.status(404).json({ error: true, message: 'Article not found' });

  article.suggestions = suggestions;
  article.status = 'reviewed';
  project.lastUpdated = new Date().toISOString();
  project.logs.push({ timestamp: new Date().toISOString(), action: 'review', message: `Updated suggestions for ${articleUrl}` });
  storageService.saveProject(domain, project);

  res.json({ success: true, article });
};

// Apply approved links to WordPress
exports.applyLinks = async (req, res, next) => {
  try {
    const { domain, articleUrl, wpUsername, wpAppPassword } = req.body;
    if (!domain || !articleUrl) {
      return res.status(400).json({ error: true, message: 'domain and articleUrl are required' });
    }

    const username = wpUsername || process.env.WP_USERNAME;
    const appPassword = wpAppPassword || process.env.WP_APP_PASSWORD;
    if (!username || !appPassword) {
      return res.status(400).json({ error: true, message: 'WordPress credentials required' });
    }

    const project = storageService.loadProject(domain);
    if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

    const article = project.articles.find((a) => a.url === articleUrl);
    if (!article) return res.status(404).json({ error: true, message: 'Article not found' });

    const approvedLinks = (article.suggestions || []).filter((s) => s.approved !== false);
    if (approvedLinks.length === 0) {
      return res.status(400).json({ error: true, message: 'No approved links to apply' });
    }

    // Get current content from WP
    const wpContent = await wpService.fetchPosts(domain, username, appPassword);
    const wpArticle = wpContent.find((p) => p.id === article.id || p.url === article.url);
    const currentContent = wpArticle?.content || article.rawContent;

    if (!currentContent) {
      return res.status(400).json({ error: true, message: 'Could not retrieve article content' });
    }

    // Use Gemini to inject links
    const modifiedContent = await geminiService.injectLinks(currentContent, approvedLinks);

    // Update via WP API
    await wpService.updatePostContent(domain, username, appPassword, article.id, modifiedContent);

    article.status = 'applied';
    article.appliedAt = new Date().toISOString();
    project.lastUpdated = new Date().toISOString();
    project.logs.push({ timestamp: new Date().toISOString(), action: 'apply', message: `Applied ${approvedLinks.length} links to ${articleUrl}` });
    storageService.saveProject(domain, project);

    res.json({ success: true, appliedLinks: approvedLinks.length, article });
  } catch (err) {
    next(err);
  }
};

// Get execution logs
exports.getLogs = (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

  const project = storageService.loadProject(domain);
  if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

  res.json(project.logs || []);
};

// Export report
exports.exportReport = (req, res) => {
  const { domain, format } = req.query;
  if (!domain) return res.status(400).json({ error: true, message: 'domain is required' });

  const project = storageService.loadProject(domain);
  if (!project) return res.status(404).json({ error: true, message: 'Project not found' });

  const report = project.articles.map((a) => ({
    url: a.url,
    title: a.title,
    topic: a.analysis?.main_topic || '',
    keywords: a.analysis?.keywords?.join(', ') || '',
    suggestedLinks: (a.suggestions || []).length,
    status: a.status,
  }));

  if (format === 'csv') {
    const headers = 'URL,Title,Topic,Keywords,Suggested Links,Status\n';
    const rows = report
      .map((r) => `"${r.url}","${r.title}","${r.topic}","${r.keywords}",${r.suggestedLinks},"${r.status}"`)
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${Date.now()}.csv`);
    return res.send(headers + rows);
  }

  res.json(report);
};
