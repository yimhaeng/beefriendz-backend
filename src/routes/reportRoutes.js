const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/:projectId/export', reportController.exportProjectReport);

module.exports = router;
