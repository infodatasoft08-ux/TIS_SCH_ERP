const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDashboardStats, getPersonalAttendanceStats, getPersonalAttendanceHistory } = require('../controller/analyticsController');

// In a real app, you would add authentication middleware here
// const verifyToken = require('../middleware/verifyToken');
// router.get('/dashboard', verifyToken, getDashboardStats);

router.get('/dashboard', auth, getDashboardStats);
router.get('/personal/attendance', auth, getPersonalAttendanceStats);
router.get('/personal/attendance/history', auth, getPersonalAttendanceHistory);

module.exports = router;
