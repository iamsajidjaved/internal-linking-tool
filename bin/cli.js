#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Set the working directory so dotenv and data paths resolve correctly
const ROOT = path.resolve(__dirname, '..');
process.env.ILT_ROOT = ROOT;

// Ensure frontend build exists (may be missing after global npm install)
const frontendBuild = path.join(ROOT, 'frontend', 'build');
if (!fs.existsSync(frontendBuild)) {
  const frontendDir = path.join(ROOT, 'frontend');
  if (fs.existsSync(path.join(frontendDir, 'package.json'))) {
    console.log('Building frontend for first run...');
    try {
      execSync('npm install && npm run build', { cwd: frontendDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('Warning: Frontend build failed. The API will still work but the UI won\'t be available.');
      console.warn(e.message);
    }
  }
}

require('../backend/server.js');
