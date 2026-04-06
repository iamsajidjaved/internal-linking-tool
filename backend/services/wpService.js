const axios = require('axios');

function createWpClient(domain, username, appPassword) {
  const baseURL = `${domain.replace(/\/+$/, '')}/wp-json/wp/v2`;
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { Authorization: `Basic ${token}` },
  });

  return client;
}

/**
 * Fetch all items from a paginated WP REST endpoint.
 */
async function fetchAllPaginated(client, endpoint, params = {}) {
  const items = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, headers } = await client.get(endpoint, {
      params: { ...params, per_page: perPage, page },
    });
    items.push(...data);
    const totalPages = parseInt(headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
  }
  return items;
}

/**
 * Fetch posts from WordPress REST API.
 */
async function fetchPosts(domain, username, appPassword) {
  const client = createWpClient(domain, username, appPassword);
  const posts = await fetchAllPaginated(client, '/posts', { status: 'publish' });
  return posts.map((p) => ({
    id: p.id,
    title: p.title?.rendered || '',
    slug: p.slug,
    url: p.link,
    content: p.content?.rendered || '',
    type: 'post',
  }));
}

/**
 * Fetch pages from WordPress REST API.
 */
async function fetchPages(domain, username, appPassword) {
  const client = createWpClient(domain, username, appPassword);
  const pages = await fetchAllPaginated(client, '/pages', { status: 'publish' });
  return pages.map((p) => ({
    id: p.id,
    title: p.title?.rendered || '',
    slug: p.slug,
    url: p.link,
    content: p.content?.rendered || '',
    type: 'page',
  }));
}

/**
 * Fetch categories from WordPress REST API.
 */
async function fetchCategories(domain, username, appPassword) {
  const client = createWpClient(domain, username, appPassword);
  const cats = await fetchAllPaginated(client, '/categories');
  return cats.map((c) => ({
    id: c.id,
    title: c.name,
    slug: c.slug,
    url: c.link,
    content: c.description || '',
    type: 'category',
  }));
}

/**
 * Fetch all WP content (posts + pages + categories).
 */
async function fetchAllWpContent(domain, username, appPassword) {
  const [posts, pages, categories] = await Promise.all([
    fetchPosts(domain, username, appPassword),
    fetchPages(domain, username, appPassword),
    fetchCategories(domain, username, appPassword),
  ]);
  return [...posts, ...pages, ...categories];
}

/**
 * Update a post/page content via WP REST API.
 */
async function updatePostContent(domain, username, appPassword, postId, newContent) {
  const client = createWpClient(domain, username, appPassword);
  const { data } = await client.post(`/posts/${postId}`, { content: newContent });
  return data;
}

module.exports = {
  fetchPosts,
  fetchPages,
  fetchCategories,
  fetchAllWpContent,
  updatePostContent,
};
