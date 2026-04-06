const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Fetch a URL and extract title, text content, and slug.
 */
async function extractContentFromUrl(url) {
  const { data: html } = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'InternalLinkingBot/1.0' },
  });

  const $ = cheerio.load(html);

  // Remove script/style elements
  $('script, style, nav, footer, header, aside').remove();

  const title =
    $('h1.entry-title').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim();

  const content =
    $('article').text().trim() ||
    $('.entry-content').text().trim() ||
    $('main').text().trim() ||
    $('body').text().trim();

  // Derive slug from URL
  const slug = new URL(url).pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';

  return {
    url,
    title,
    content: cleanText(content),
    slug,
  };
}

/**
 * Clean extracted text: collapse whitespace, trim.
 */
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Strip HTML tags from a string and return plain text.
 */
function stripHtml(html) {
  const $ = cheerio.load(html);
  $('script, style').remove();
  return cleanText($.text());
}

module.exports = { extractContentFromUrl, stripHtml, cleanText };
