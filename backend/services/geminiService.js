const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function getModel() {
  if (!model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_google_ai_studio_key') {
      throw new Error('GEMINI_API_KEY is not configured. Set it in .env');
    }
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return model;
}

/**
 * Analyze a single article's content and extract topic, keywords, semantic relevance.
 */
async function analyzeContent(article) {
  const m = getModel();

  const prompt = `You are an SEO content analyst.

Analyze this article and extract structured information.

Title: ${article.title}
URL: ${article.url}
Content (first 3000 chars): ${article.content.substring(0, 3000)}

Return a JSON object with:
{
  "main_topic": "primary topic of the article",
  "keywords": ["keyword1", "keyword2", ...],
  "semantic_tags": ["tag1", "tag2", ...],
  "summary": "1-2 sentence summary"
}

Return ONLY valid JSON, no markdown fences.`;

  const result = await m.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini analysis response:', text);
    return { main_topic: '', keywords: [], semantic_tags: [], summary: '' };
  }
}

/**
 * Generate internal linking suggestions for a given article.
 */
async function generateLinkingSuggestions(article, allArticles) {
  const m = getModel();

  // Build the list of candidate URLs (exclude self)
  const candidates = allArticles
    .filter((a) => a.url !== article.url)
    .map((a) => ({
      url: a.url,
      title: a.title,
      topic: a.analysis?.main_topic || '',
      keywords: (a.analysis?.keywords || []).join(', '),
    }));

  const prompt = `You are an SEO expert.

Given:
- Current article title: ${article.title}
- Current article URL: ${article.url}
- Current article content (first 3000 chars):
${article.content.substring(0, 3000)}

- List of internal URLs with titles and topics:
${JSON.stringify(candidates.slice(0, 50), null, 2)}

Task:
Suggest internal linking opportunities for the current article.

Rules:
- Insert links naturally in context
- Use human-like anchor text (not just the page title)
- Do not over-optimize keywords
- Max 5 links
- Only suggest links that are contextually relevant
- Avoid duplicate target URLs
- Return output as JSON:

{
  "links": [
    {
      "anchor_text": "the natural anchor text to use",
      "target_url": "the URL to link to",
      "target_title": "title of target page",
      "placement_hint": "description of where in the article to place the link",
      "relevance_score": 0.95
    }
  ]
}

Return ONLY valid JSON, no markdown fences.`;

  const result = await m.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse Gemini linking response:', text);
    return { links: [] };
  }
}

/**
 * Generate the modified HTML content with links injected.
 */
async function injectLinks(articleContent, approvedLinks) {
  const m = getModel();

  const prompt = `You are an HTML content editor.

Given this HTML content:
${articleContent.substring(0, 8000)}

And these approved internal links to inject:
${JSON.stringify(approvedLinks, null, 2)}

Task:
- Insert each link naturally into the HTML content
- Use the anchor_text as the link text: <a href="target_url">anchor_text</a>
- Use the placement_hint to determine where to place each link
- If the anchor text (or very similar text) already appears in the content, wrap it with the link tag
- If it doesn't appear, find the most natural insertion point based on the placement_hint
- Do NOT add links that would break HTML structure
- Do NOT modify existing links
- Preserve all existing HTML formatting

Return ONLY the modified HTML content, no explanations, no markdown fences.`;

  const result = await m.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { analyzeContent, generateLinkingSuggestions, injectLinks };
