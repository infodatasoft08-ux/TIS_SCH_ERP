const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    AddExamGroup,
    GetExamGroups,
    UpdateExamGroup,
    DeleteExamGroup,
    UpdateExamRoutine,
    AddExamGroupMarks,
    GetExamGroupResults,
    GetExamsForStudent,
    GetStudentExamHistory,
    GetAllStudentExamSummaries,
    GetSupervisedClassExamTrends
} = require('../controller/examController');

// Exam Groups
router.post('/add/exams', auth, AddExamGroup);
router.get('/list/exams', auth, GetExamGroups);
router.put('/update/exams/:id', auth, UpdateExamGroup);
router.delete('/delete/exam/:id', auth, DeleteExamGroup);

// Exam Routine
router.put('/update/routine', auth, UpdateExamRoutine);

// Exam Marks/Results
router.post('/insert/exam/:id/results', auth, AddExamGroupMarks); // :id is exam_group_id
router.get('/list/exam/:id/results', auth, GetExamGroupResults); // :id is exam_group_id
router.get('/list/all-student-summaries', auth, GetAllStudentExamSummaries);

// Student View
router.get('/student/exams', auth, GetExamsForStudent);
router.get('/student/:student_id/history', auth, GetStudentExamHistory);

// Keep existing routes just in case they are explicitly called in unused frontend code
router.get('/supervised-class/trends', auth, GetSupervisedClassExamTrends);
router.get('/get/exams/:id', auth, (req, res) => res.json({ exam: {} })); // Dummy
router.get('/get/exam/results/:id', auth, (req, res) => res.json({ result: {} })); // Dummy

module.exports = router;