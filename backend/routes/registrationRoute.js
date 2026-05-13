const express = require('express');
const router = express.Router();
const { registerStudent, registerTeacher, registerStaff } = require('../controller/registrationController');

// Public endpoints requiring no authentication
router.post('/student', registerStudent);
router.post('/teacher', registerTeacher);
router.post('/staff', registerStaff);

module.exports = router;
