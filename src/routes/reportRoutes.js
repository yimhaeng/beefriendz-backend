// routes/reportRoutes.js
const express = require('express');
const router = express.Router();

const reportController = require('../controllers/reportController');

// /reports/:projectId/export
router.get('/:projectId/export', reportController.exportProjectReport);

module.exports = router;
