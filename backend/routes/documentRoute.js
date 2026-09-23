const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
const multer = require('multer');
const documentController = require('../controller/documentController');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const uploadFields = upload.fields([
    { name: 'template', maxCount: 1 },
    { name: 'background_image', maxCount: 1 }
]);

// Template Management
router.post('/templates', auth, restrictRoles([1, 5]), uploadFields, documentController.uploadTemplate);
router.get('/templates', auth, restrictRoles([1, 5]), documentController.getTemplates);
router.put('/templates/:id', auth, restrictRoles([1, 5]), uploadFields, documentController.updateTemplate);
router.delete('/templates/:id', auth, restrictRoles([1, 5]), documentController.deleteTemplate);

// Document Generation
router.post('/generate', auth, restrictRoles([1, 5]), documentController.generate);
router.get('/templates/:id/preview', auth, restrictRoles([1, 5]), documentController.getTemplatePreview);
router.get('/download/:id', auth, restrictRoles([1, 5]), documentController.downloadDocument);

module.exports = router;

