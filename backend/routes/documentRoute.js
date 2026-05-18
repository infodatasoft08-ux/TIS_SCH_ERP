const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentController = require('../controller/documentController');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFields = upload.fields([
    { name: 'template', maxCount: 1 },
    { name: 'background_image', maxCount: 1 }
]);

// Template Management
router.post('/templates', uploadFields, documentController.uploadTemplate);
router.get('/templates', documentController.getTemplates);
router.put('/templates/:id', uploadFields, documentController.updateTemplate);
router.delete('/templates/:id', documentController.deleteTemplate);

// Document Generation
router.post('/generate', documentController.generate);
router.get('/templates/:id/preview', documentController.getTemplatePreview);
router.get('/download/:id', documentController.downloadDocument);

module.exports = router;
