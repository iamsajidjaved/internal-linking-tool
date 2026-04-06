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
export const generateSuggestions = (domain, articleUrl) =>
  api.post('/suggest', { domain, articleUrl }).then((r) => r.data);
export const updateSuggestions = (domain, articleUrl, suggestions) =>
  api.put('/suggestions', { domain, articleUrl, suggestions }).then((r) => r.data);
export const applyLinks = (payload) => api.post('/apply', payload).then((r) => r.data);

// Reporting
export const getLogs = (domain) => api.get('/logs', { params: { domain } }).then((r) => r.data);
export const exportReport = (domain, format = 'json') =>
  api.get('/export', { params: { domain, format } }).then((r) => r.data);

export default api;
