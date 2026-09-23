const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
const multer = require('multer');
const { BulkAddStudents, BulkAddTeachers, BulkAddStaff } = require('../controller/bulkController');

// Memory storage for Excel files as they are parsed then thrown away
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/students', auth, restrictRoles([1, 5]), upload.single('file'), BulkAddStudents);
router.post('/teachers', auth, restrictRoles([1, 5]), upload.single('file'), BulkAddTeachers);
router.post('/staff', auth, restrictRoles([1, 5]), upload.single('file'), BulkAddStaff);

module.exports = router;

