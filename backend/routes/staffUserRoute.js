const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { AddStaffUser, GetStaffUsers, GetStaffUserById, UpdateStaffUser, DeleteStaffUser, UpdateStaffPassword } = require('../controller/authController');
const { uploadStaffImage } = require('../middleware/uploadMiddleware');



router.post('/add/staff', auth, uploadStaffImage.single("image"), AddStaffUser);
router.get('/get/staff', auth, GetStaffUsers);
router.get('/get/staff_id', auth, GetStaffUserById);
router.put('/update/staff/:staff_id', auth, uploadStaffImage.single("image"), UpdateStaffUser);
router.delete('/delete/staff/:staff_id', auth, DeleteStaffUser);
router.put('/update/staff/:id/password', auth, UpdateStaffPassword);



module.exports = router;