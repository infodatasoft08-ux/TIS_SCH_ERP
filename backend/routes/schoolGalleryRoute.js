const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { uploadSchoolGallery } = require('../middleware/uploadMiddleware');
const schoolGalleryController = require('../controller/schoolGalleryController');

const { cacheMiddleware, clearCachePattern } = require('../middleware/cacheMiddleware');

// All routes are protected and typically for admins
router.get('/', auth, cacheMiddleware(300), schoolGalleryController.getImages);
router.post('/upload', auth, uploadSchoolGallery.single('image'), (req, res, next) => {
  clearCachePattern('school-gallery');
  next();
}, schoolGalleryController.uploadImage);
router.delete('/:id', auth, (req, res, next) => {
  clearCachePattern('school-gallery');
  next();
}, schoolGalleryController.deleteImage);

// School Settings
router.get('/settings', auth, cacheMiddleware(300), schoolGalleryController.getSettings);
router.post('/settings', auth, (req, res, next) => {
  clearCachePattern('school-gallery');
  next();
}, schoolGalleryController.updateSettings);

module.exports = router;
