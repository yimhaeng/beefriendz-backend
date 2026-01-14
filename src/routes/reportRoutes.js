const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/project/:projectId/export', reportController.exportProjectReport);

module.exports = router;
