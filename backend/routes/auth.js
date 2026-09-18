const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { login, googleLogin, logout, forgotPassword, sendOtp, verifyOtp, submitContactForm, submitAdmissionForm } = require('../controller/authController');
require('dotenv').config();

router.post('/login', login);
router.post('/contact', submitContactForm);
router.post('/admission-inquiry', submitAdmissionForm);
router.post('/google-login', googleLogin);
router.post('/logout', logout);

// Password Reset via Email OTP
router.post('/forgot/send-otp', sendOtp);
router.post('/forgot/verify-otp', verifyOtp);
router.put('/forgot/password', forgotPassword);
router.post('/forgot/reset-password', forgotPassword);

module.exports = router;