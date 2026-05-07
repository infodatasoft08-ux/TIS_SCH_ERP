const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { AddAssignment, SubmitAssignment, GetAssignmentSubmissions, GradeAssignmentSubmission, GetStudentAssignments, GetAssignment, UpdateAssignment, DeleteAssignment, DeleteAssignmentSubmission } = require('../controller/assignmentController');


// Create assignment for class + subject:
// curl -X POST http://localhost:5000/api/assignments/add/assignment \
//  -H "Content-Type: application/json" \
//  -d '{"class_id":3,"subject_id":7,"title":"Math HW 1","description":"Ch 1-2 problems","assigned_date":"2025-11-20","due_date":"2025-11-27","max_marks":20}'
router.post('/add/assignment', auth, AddAssignment);


router.get('/get/assignment', auth, GetAssignment);


// Create assignment for lesson:
// curl -X POST http://localhost:5000/api/assignments/add/assignments/lesseion \
//  -H "Content-Type: application/json" \
//  -d '{"lesson_id":12,"title":"Lesson 12 Quiz","assigned_date":"2025-11-25","due_date":"2025-11-25"}'
router.post('/add/assignments/lesseion', auth, AddAssignment);


router.put('/update/assignment/:id', auth, UpdateAssignment);


// Student submit:
// curl -X POST http://localhost:5000/api/assignments/submit/assignment/:id/submissions \
//  -H "Content-Type: application/json" \
//  -d '{"student_id":10,"file_url":"https://your-bucket/path/assignment5_10.pdf","remarks":"Please find my HW attached."}'

router.post('/submit/assignment/:id/submissions', auth, SubmitAssignment);



// List submissions (teacher/admin):

// curl "http://localhost:5000/api/assignments/list/assignment/:id/submissions?limit=50&offset=0&status=ungraded"
router.get('/list/assignment/:id/submissions', auth, GetAssignmentSubmissions);



// Grade submission:

// curl -X PUT http://localhost:5000/api/assignments/grade/assignment/submissions/:id \
//  -H "Content-Type: application/json" \
//  -d '{"marks_obtained":18,"remarks":"Good work","graded_by_teacher_id":2}'
router.put('/grade/assignment/submissions/:submission_id', auth, GradeAssignmentSubmission);


// Student dashboard assignments:

// curl http://localhost:5000/api/assignments/students/10/assignments
router.get('/get/dashboard/student/:id/assignments', auth, GetStudentAssignments);

router.delete('/del/assignment/:assignment_id', auth, DeleteAssignment);

router.delete('/del/assignment/submissions/:submission_id', auth, DeleteAssignmentSubmission);



module.exports = router;