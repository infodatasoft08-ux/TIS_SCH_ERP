const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { login, googleLogin, logout, forgotPassword, sendOtp, verifyOtp, verifyStudentDetails, resetPasswordWithToken, submitContactForm, submitAdmissionForm } = require('../controller/authController');
require('dotenv').config();

router.post('/login', login);
router.post('/contact', submitContactForm);
router.post('/admission-inquiry', submitAdmissionForm);
router.post('/google-login', googleLogin);
router.post('/logout', logout);
router.post('/forgot/send-otp', sendOtp);
router.post('/forgot/verify-otp', verifyOtp);
router.put('/forgot/password', forgotPassword);
router.post('/forgot/verify-student', verifyStudentDetails);
router.put('/forgot/reset-with-token', resetPasswordWithToken);

module.exports = router;