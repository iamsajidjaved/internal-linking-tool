const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(domain) {
  const safeName = domain.replace(/https?:\/\//g, '').replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(DATA_DIR, `${safeName}.json`);
}

function loadProject(domain) {
  ensureDataDir();
  const filePath = getFilePath(domain);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  }
  return null;
}

function saveProject(domain, data) {
  ensureDataDir();
  const filePath = getFilePath(domain);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function listProjects() {
  ensureDataDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
    try {
      const data = JSON.parse(raw);
      return {
        domain: data.domain,
        articleCount: data.articles?.length || 0,
        lastUpdated: data.lastUpdated || null,
        status: data.status || 'unknown',
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function deleteProject(domain) {
  const filePath = getFilePath(domain);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

module.exports = { loadProject, saveProject, listProjects, deleteProject };
