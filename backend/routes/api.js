const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projectController');

// Project management
router.get('/projects', ctrl.listProjects);
router.get('/project', ctrl.getProject);
router.delete('/project', ctrl.deleteProject);

// Workflow steps
router.post('/fetch', ctrl.fetchContent);
router.post('/analyze', ctrl.analyzeContent);
router.post('/suggest', ctrl.generateSuggestions);
router.put('/suggestions', ctrl.updateSuggestions);
router.post('/apply', ctrl.applyLinks);

// Reporting
router.get('/logs', ctrl.getLogs);
router.get('/export', ctrl.exportReport);

module.exports = router;
