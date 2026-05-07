const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  GetEmployees,
  TakeEmployeeAttendance,
  GetEmployeeAttendanceSummery,
  UpdateSingleEmployeeAttendance
} = require('../controller/employeeAttendanceController');

// All employee attendance routes require authentication (Admin usually takes attendance)
router.get('/employees', auth, GetEmployees);
router.post('/take', auth, TakeEmployeeAttendance);
router.get('/summery', auth, GetEmployeeAttendanceSummery);
router.put('/update-single', auth, UpdateSingleEmployeeAttendance);

module.exports = router;
