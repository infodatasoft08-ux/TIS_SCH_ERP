const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadSchoolGallery } = require('../middleware/uploadMiddleware');
const schoolGalleryController = require('../controller/schoolGalleryController');

// All routes are protected and typically for admins
router.get('/', auth, schoolGalleryController.getImages);
router.post('/upload', auth, uploadSchoolGallery.single('image'), schoolGalleryController.uploadImage);
router.delete('/:id', auth, schoolGalleryController.deleteImage);

// School Settings
router.get('/settings', auth, schoolGalleryController.getSettings);
router.post('/settings', auth, schoolGalleryController.updateSettings);

module.exports = router;
