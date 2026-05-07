const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const { BulkAddStudents, BulkAddTeachers, BulkAddStaff } = require('../controller/bulkController');

// Memory storage for Excel files as they are parsed then thrown away
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/students', auth, upload.single('file'), BulkAddStudents);
router.post('/teachers', auth, upload.single('file'), BulkAddTeachers);
router.post('/staff', auth, upload.single('file'), BulkAddStaff);

module.exports = router;
