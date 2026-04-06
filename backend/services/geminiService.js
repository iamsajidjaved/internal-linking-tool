const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;
let lastApiKey = null;

function getModel(apiKey) {
  if (!apiKey || apiKey === 'your_google_ai_studio_key' || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured for this project. Set it in Settings.');
  }

  // Recreate model if API key changed
  if (!model || lastApiKey !== apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    lastApiKey = apiKey;
  }
  return model;
}

/**
 * Analyze a single article's content and extract topic, keywords, semantic relevance.
 */
async function analyzeContent(article, apiKey) {
  const m = getModel(apiKey);

  const prompt = `You are an advanced SEO content analyst specializing in Vietnamese-language websites and internal linking strategy.

Analyze this Vietnamese article and extract structured information for internal linking optimization.
Keep keywords and tags in Vietnamese as they appear in the content.

Title: ${article.title}
URL: ${article.url}
Content (first 3000 chars): ${article.content.substring(0, 3000)}

Return a JSON object with:
{
  "main_topic": "primary topic of the article (in Vietnamese)",
  "keywords": ["keyword1", "keyword2", ...],
  "semantic_tags": ["tag1", "tag2", ...],
  "summary": "1-2 sentence summary in Vietnamese",
  "content_type": "pillar | supporting | standalone",
  "topic_cluster": "the broad topic cluster this article belongs to (in Vietnamese)",
  "content_depth": "shallow | medium | deep",
  "link_worthy_phrases": ["natural Vietnamese phrases in the content that would work well as anchor text for outbound internal links"]
}

Guidelines:
- "content_type": Mark as "pillar" if this is a comprehensive guide/overview, "supporting" if it dives deep into a subtopic, "standalone" otherwise.
- "topic_cluster": Identify the broad thematic group (e.g., "cá cược thể thao", "casino trực tuyến").
- "content_depth": Assess the depth — "deep" pages are good link equity donors, "shallow" pages need link equity.
- "link_worthy_phrases": Extract 3-8 natural Vietnamese phrases from the content that could serve as keyword-rich anchor text for internal links.

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
async function generateLinkingSuggestions(article, allArticles, apiKey) {
  const m = getModel(apiKey);

  // Build enriched candidate list with analysis metadata for smarter suggestions
  const enrichedCandidates = allArticles
    .filter((a) => a.url !== article.url)
    .map((a) => ({
      url: a.url,
      title: a.title,
      topic: a.analysis?.main_topic || '',
      keywords: (a.analysis?.keywords || []).join(', '),
      content_type: a.analysis?.content_type || 'standalone',
      topic_cluster: a.analysis?.topic_cluster || '',
      content_depth: a.analysis?.content_depth || 'medium',
    }));

  const currentAnalysis = article.analysis || {};

  const prompt = `You are an advanced SEO internal linking strategist specializing in Vietnamese-language websites.
You must apply the following 12 internal linking techniques when generating suggestions:

## Internal Linking Techniques to Apply:
1. **Keyword-Rich Anchor Text**: Use relevant Vietnamese keywords as anchor text — never generic phrases like "nhấn vào đây" or "xem thêm".
2. **Contextual Linking**: Place links naturally within the content body where they add genuine value and topical relevance.
3. **Topic Clusters (Pillar Strategy)**: Prioritize linking between articles in the same topic cluster. Link supporting articles to their pillar page and vice versa.
4. **Bidirectional Linking**: When suggesting A→B links, also note if B should link back to A (flag as "suggest_reverse": true).
5. **Deep Linking**: Prefer linking to deeper internal pages rather than the homepage or category pages.
6. **Link Equity Distribution**: Distribute links FROM high-authority/deep content TO weaker/newer/shallow pages to pass link equity.
7. **Strategic Link Placement**: Place high-value links in the introduction or mid-content for maximum SEO impact. Lower-priority links can go in the conclusion.
8. **Controlled Link Density**: Suggest 3-5 links maximum. Never overload — quality over quantity.
9. **Relevance First**: Only suggest links that are genuinely topically relevant — irrelevant links hurt SEO.
10. **Avoid Over-Optimization**: Vary anchor text naturally. Don't repeat exact-match keywords across multiple links.
11. **Avoid Broken Patterns**: Don't link to the same target URL more than once. Don't suggest links to URLs that are clearly the same page.
12. **Content Freshness Linking**: If newer articles exist in the same topic cluster, prioritize linking to them to boost their indexing.

## Current Article:
- Title: ${article.title}
- URL: ${article.url}
- Topic Cluster: ${currentAnalysis.topic_cluster || 'unknown'}
- Content Type: ${currentAnalysis.content_type || 'unknown'}
- Content Depth: ${currentAnalysis.content_depth || 'unknown'}
- Link-Worthy Phrases: ${JSON.stringify(currentAnalysis.link_worthy_phrases || [])}
- Content (first 3000 chars):
${article.content.substring(0, 3000)}

## Available Internal Pages:
${JSON.stringify(enrichedCandidates.slice(0, 50), null, 2)}

## Task:
Generate internal linking suggestions applying ALL the techniques above.
Anchor text MUST be natural Vietnamese — use phrases that actually appear (or fit naturally) in the content.

Return JSON:
{
  "links": [
    {
      "anchor_text": "natural Vietnamese anchor text from or fitting in the content",
      "target_url": "the URL to link to",
      "target_title": "title of target page",
      "placement_hint": "specific location: intro / paragraph N / mid-content / conclusion",
      "placement_context": "the surrounding sentence or phrase where the link should be inserted",
      "relevance_score": 0.95,
      "technique_applied": ["contextual", "topic_cluster", "deep_linking"],
      "suggest_reverse": false,
      "link_equity_direction": "donor_to_receiver | peer_to_peer"
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
async function injectLinks(articleContent, approvedLinks, apiKey) {
  const m = getModel(apiKey);

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
