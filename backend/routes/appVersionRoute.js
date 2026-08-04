const express = require('express');
const router = express.Router();
const appVersionController = require('../controller/appVersionController');
const auth = require('../middleware/auth');

// Public route for mobile app
router.get('/latest', appVersionController.getLatestVersion);

// Admin routes (Protected by auth middleware)
router.get('/', auth, appVersionController.getAllVersions);
router.put('/:id', auth, appVersionController.updateVersion);

module.exports = router;
