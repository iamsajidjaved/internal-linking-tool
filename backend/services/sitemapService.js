const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

/**
 * Fetch and parse the sitemap index to get individual sitemap URLs.
 */
async function fetchSitemapIndex(domain) {
  const url = `${domain.replace(/\/+$/, '')}/sitemap_index.xml`;
  const { data } = await axios.get(url, { timeout: 15000 });
  const parsed = parser.parse(data);

  const sitemaps = [];
  const entries = parsed.sitemapindex?.sitemap;
  if (!entries) return sitemaps;

  const list = Array.isArray(entries) ? entries : [entries];
  for (const entry of list) {
    const loc = entry.loc || entry['loc'];
    if (loc) sitemaps.push(loc);
  }
  return sitemaps;
}

/**
 * Parse a single sitemap XML and return all <loc> URLs.
 */
async function parseSitemap(sitemapUrl) {
  const { data } = await axios.get(sitemapUrl, { timeout: 15000 });
  const parsed = parser.parse(data);

  const urls = [];
  const entries = parsed.urlset?.url;
  if (!entries) return urls;

  const list = Array.isArray(entries) ? entries : [entries];
  for (const entry of list) {
    const loc = entry.loc || entry['loc'];
    if (loc) urls.push(loc);
  }
  return urls;
}

/**
 * Fetch all URLs from the sitemap index (post, page, category sitemaps).
 */
async function fetchAllSitemapUrls(domain) {
  const sitemapUrls = await fetchSitemapIndex(domain);

  // Filter for post, page, and category sitemaps
  const relevantSitemaps = sitemapUrls.filter((u) => {
    const lower = u.toLowerCase();
    return (
      lower.includes('post-sitemap') ||
      lower.includes('page-sitemap') ||
      lower.includes('category-sitemap')
    );
  });

  // If no relevant sitemaps matched, parse all of them
  const toParse = relevantSitemaps.length > 0 ? relevantSitemaps : sitemapUrls;

  const allUrls = [];
  for (const smUrl of toParse) {
    try {
      const urls = await parseSitemap(smUrl);
      allUrls.push(...urls);
    } catch (err) {
      console.error(`Failed to parse sitemap ${smUrl}:`, err.message);
    }
  }

  return [...new Set(allUrls)];
}

module.exports = { fetchSitemapIndex, parseSitemap, fetchAllSitemapUrls };
