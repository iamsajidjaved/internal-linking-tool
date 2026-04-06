import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 300000, // 5 min for long operations
});

// Projects
export const listProjects = () => api.get('/projects').then((r) => r.data);
export const getProject = (domain) => api.get('/project', { params: { domain } }).then((r) => r.data);
export const deleteProject = (domain) => api.delete('/project', { data: { domain } }).then((r) => r.data);

// Workflow
export const fetchContent = (payload) => api.post('/fetch', payload).then((r) => r.data);
export const analyzeContent = (domain) => api.post('/analyze', { domain }).then((r) => r.data);

/**
 * Start analysis with real-time SSE progress.
 * Returns an object with { eventSource, close() } so the caller can listen to events.
 * Events: 'init', 'progress', 'done'
 */
export const analyzeContentStream = (domain, { onInit, onProgress, onDone, onError }) => {
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const url = `${baseURL}/analyze-stream?domain=${encodeURIComponent(domain)}`;
  const es = new EventSource(url);
  let completed = false;

  es.addEventListener('init', (e) => {
    if (onInit) onInit(JSON.parse(e.data));
  });

  es.addEventListener('progress', (e) => {
    if (onProgress) onProgress(JSON.parse(e.data));
  });

  es.addEventListener('done', (e) => {
    completed = true;
    if (onDone) onDone(JSON.parse(e.data));
    es.close();
  });

  es.onerror = (e) => {
    if (!completed && onError) onError(e);
    es.close();
  };

  return { eventSource: es, close: () => { completed = true; es.close(); } };
};

export const generateSuggestions = (domain, articleUrl) =>
  api.post('/suggest', { domain, articleUrl }).then((r) => r.data);

/**
 * Start suggestion generation with real-time SSE progress.
 * Events: 'init', 'progress', 'done'
 */
export const generateSuggestionsStream = (domain, { onInit, onProgress, onDone, onError }) => {
  const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const url = `${baseURL}/suggest-stream?domain=${encodeURIComponent(domain)}`;
  const es = new EventSource(url);
  let completed = false;

  es.addEventListener('init', (e) => {
    if (onInit) onInit(JSON.parse(e.data));
  });

  es.addEventListener('progress', (e) => {
    if (onProgress) onProgress(JSON.parse(e.data));
  });

  es.addEventListener('done', (e) => {
    completed = true;
    if (onDone) onDone(JSON.parse(e.data));
    es.close();
  });

  es.onerror = (e) => {
    // Only treat as error if we haven't already received 'done'
    if (!completed && onError) onError(e);
    es.close();
  };

  return { eventSource: es, close: () => { completed = true; es.close(); } };
};
export const updateSuggestions = (domain, articleUrl, suggestions) =>
  api.put('/suggestions', { domain, articleUrl, suggestions }).then((r) => r.data);
export const applyLinks = (payload) => api.post('/apply', payload).then((r) => r.data);

// Reporting
export const getLogs = (domain) => api.get('/logs', { params: { domain } }).then((r) => r.data);
export const exportReport = (domain, format = 'json') =>
  api.get('/export', { params: { domain, format } }).then((r) => r.data);

// Settings
export const getSettings = (domain) => api.get('/settings', { params: { domain } }).then((r) => r.data);
export const saveSettings = (payload) => api.put('/settings', payload).then((r) => r.data);

export default api;
