#!/usr/bin/env node

const path = require('path');

// Set the working directory so dotenv and data paths resolve correctly
process.env.ILT_ROOT = path.resolve(__dirname, '..');

require('../backend/server.js');
