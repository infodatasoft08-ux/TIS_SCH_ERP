const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
const {
    createHomework,
    getHomeworks,
    updateHomework,
    deleteHomework,
    getStudentHomework,
    sendHomeworkWhatsApp
} = require('../controller/homeworkController');

const { uploadHomework } = require('../middleware/uploadMiddleware');

router.post('/add', auth, restrictRoles([1, 5]), uploadHomework.single('file'), createHomework);
router.get('/list', auth, getHomeworks);
router.put('/update/:id', auth, restrictRoles([1, 5]), uploadHomework.single('file'), updateHomework);
router.delete('/delete/:id', auth, restrictRoles([1, 5]), deleteHomework);
router.get('/student/:student_id', auth, getStudentHomework);
router.post('/send-whatsapp/:id', auth, restrictRoles([1, 5]), sendHomeworkWhatsApp);

module.exports = router;

