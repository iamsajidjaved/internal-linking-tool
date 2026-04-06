const path = require('path');
require('dotenv').config({ path: path.join(process.env.ILT_ROOT || path.join(__dirname, '..'), '.env') });
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', apiRoutes);

// Serve React frontend in production (only if build exists)
const fs = require('fs');
const ROOT = process.env.ILT_ROOT || path.join(__dirname, '..');
const frontendBuild = path.join(ROOT, 'frontend', 'build');
if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Internal Linking Tool server running on http://localhost:${PORT}`);
});

module.exports = app;
