const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

router.post('/start', exportController.startExport);
router.get('/status/:exportId', exportController.getExportStatus);
router.get('/history', exportController.getExportHistory);
router.get('/download/:exportId', exportController.downloadExportFile);

module.exports = router;
