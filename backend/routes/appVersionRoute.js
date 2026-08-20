const express = require('express');
const router = express.Router();
const appVersionController = require('../controller/appVersionController');
const auth = require('../middleware/auth');

const { cacheMiddleware, clearCachePattern } = require('../middleware/cacheMiddleware');

// Public route for mobile app (cached for 5 minutes)
router.get('/latest', cacheMiddleware(300), appVersionController.getLatestVersion);

// Admin routes (Protected by auth middleware)
router.get('/', auth, appVersionController.getAllVersions);
router.put('/:id', auth, (req, res, next) => {
  clearCachePattern('app-version');
  next();
}, appVersionController.updateVersion);

module.exports = router;
