const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
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
    GetSupervisedClassExamTrends,
    GenerateMarksheetPDF,
    GenerateAdmitCardPDF,
    GenerateExamRoutinePDF,
    GenerateCombinedMarksheetPDF,
    GenerateConsolidatedMarksheetPDF,
    GenerateBulkMarksheetPDF,
    GenerateBulkAdmitCardPDF,
    PublishExam
} = require('../controller/examController');

// Exam Groups
router.post('/add/exams', auth, restrictRoles([1, 5]), AddExamGroup);
router.get('/list/exams', auth, GetExamGroups);
router.put('/update/exams/:id', auth, restrictRoles([1, 5]), UpdateExamGroup);
router.put('/publish/exams/:id', auth, restrictRoles([1, 5]), PublishExam);
router.delete('/delete/exam/:id', auth, restrictRoles([1, 5]), DeleteExamGroup);

// Exam Routine
router.put('/update/routine', auth, restrictRoles([1, 5]), UpdateExamRoutine);

// Exam Marks/Results
router.post('/insert/exam/:id/results', auth, restrictRoles([1, 5]), AddExamGroupMarks); // :id is exam_group_id

router.get('/list/exam/:id/results', auth, GetExamGroupResults); // :id is exam_group_id
router.get('/list/all-student-summaries', auth, GetAllStudentExamSummaries);
router.post('/generate-marksheet', auth, GenerateMarksheetPDF);
router.post('/generate-admit-card', auth, GenerateAdmitCardPDF);
router.post('/generate-exam-routine', auth, GenerateExamRoutinePDF);
router.post('/generate-combined-marksheet', auth, GenerateCombinedMarksheetPDF);
router.post('/generate-consolidated-marksheet', auth, GenerateConsolidatedMarksheetPDF);
router.post('/generate-bulk-marksheet', auth, GenerateBulkMarksheetPDF);
router.post('/generate-bulk-admit-card', auth, GenerateBulkAdmitCardPDF);

// Student View
router.get('/student/exams', auth, GetExamsForStudent);
router.get('/student/:student_id/history', auth, GetStudentExamHistory);

// Keep existing routes just in case they are explicitly called in unused frontend code
router.get('/supervised-class/trends', auth, GetSupervisedClassExamTrends);
router.get('/get/exams/:id', auth, (req, res) => res.json({ exam: {} })); // Dummy
router.get('/get/exam/results/:id', auth, (req, res) => res.json({ result: {} })); // Dummy

module.exports = router;