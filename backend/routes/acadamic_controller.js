const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const academicController = require('../controller/acadimicController');

router.post('/create', auth, academicController.createAcademicRecord);
router.post('/bulk-promote', auth, academicController.bulkPromote);
router.get('/get', auth, academicController.getAcademicRecords);
router.put('/update/:id', auth, academicController.updateAcademicRecord);
router.delete('/delete/:id', auth, academicController.deleteAcademicRecord);

module.exports = router;