const fs = require('fs');
const path = require('path');

const ROOT = process.env.ILT_ROOT || path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

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
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json') && f !== '_config.json');
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
    try {
      const data = JSON.parse(raw);
      if (!data.domain) return null;
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

// --- Config / Settings ---
const CONFIG_FILE = path.join(DATA_DIR, '_config.json');

function loadConfig() {
  ensureDataDir();
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  }
  return { global: {}, projects: {} };
}

function saveConfig(config) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function getSettings(domain) {
  const config = loadConfig();
  return {
    geminiApiKey: config.projects?.[domain]?.geminiApiKey || config.global?.geminiApiKey || '',
    wpUsername: config.projects?.[domain]?.wpUsername || '',
    wpAppPassword: config.projects?.[domain]?.wpAppPassword || '',
  };
}

function saveSettings(domain, settings) {
  const config = loadConfig();
  if (!config.projects) config.projects = {};
  if (!config.projects[domain]) config.projects[domain] = {};

  if (settings.geminiApiKey !== undefined) {
    config.projects[domain].geminiApiKey = settings.geminiApiKey;
  }
  if (settings.wpUsername !== undefined) {
    config.projects[domain].wpUsername = settings.wpUsername;
  }
  if (settings.wpAppPassword !== undefined) {
    config.projects[domain].wpAppPassword = settings.wpAppPassword;
  }
  saveConfig(config);
  return getSettings(domain);
}

module.exports = { loadProject, saveProject, listProjects, deleteProject, loadConfig, saveConfig, getSettings, saveSettings };
