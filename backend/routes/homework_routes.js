const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    createHomework,
    getHomeworks,
    updateHomework,
    deleteHomework,
    getStudentHomework,
    sendHomeworkWhatsApp
} = require('../controller/homeworkController');

const { uploadHomework } = require('../middleware/uploadMiddleware');

router.post('/add', auth, uploadHomework.single('file'), createHomework);
router.get('/list', auth, getHomeworks);
router.put('/update/:id', auth, uploadHomework.single('file'), updateHomework);
router.delete('/delete/:id', auth, deleteHomework);
router.get('/student/:student_id', auth, getStudentHomework);
router.post('/send-whatsapp/:id', auth, sendHomeworkWhatsApp);

module.exports = router;
