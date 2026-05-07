const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const pool = require('../db');
const { getUsers } = require('../controller/getUsersController');
const { AddStudent, GetStudent, GetStudentById, UpdateStudent, UpdateStudentPassword, AddParentOnStudent, DeleteStudent, DeleteParentOnStudent, GetStudentByClassId, GetStudentsByClassId, GetStudentSubjects, DownloadAdmissionForm } = require('../controller/studentController');
const { GetStudentExamHistory } = require('../controller/examController');
const { uploadStudentImage } = require('../middleware/uploadMiddleware');
const { createStudent, updateStudent } = require('../middleware/studentMiddleware');
const { vaildation } = require('../middleware/validateMiddleware');


router.get('/', getUsers);

// curl -X POST http://localhost:5000/api/students/add/student \
//  -H "Content-Type: application/json" \
//  -d '{
//    "first_name":"Rahul","last_name":"Kumar","email":"rahul@test.com","password":"Secret123",
//    "role_id":4, "grade_id":1, "class_id":2, "admission_no":"ADM-2025-001", "roll_no":"12"
//  }'
router.post('/add/student', auth, uploadStudentImage.single("image"), AddStudent);

// curl "http://localhost:5000/api/students?limit=20&offset=0&q=rahul"
router.get('/get/student', auth, GetStudent);

// curl http://localhost:5000/api/students/1
router.get('/get/student_id', auth, GetStudentById);
router.get('/get/my-subjects', auth, GetStudentSubjects);
// router.get('/get/student/class/:classId', auth, GetStudentByClassId);

// curl -X PUT http://localhost:5000/api/students/update/student/1 -H "Content-Type: application/json" -d '{"first_name":"Rahul","class_id":3}'
router.put('/update/student/:id', auth, uploadStudentImage.single("image"), UpdateStudent);


// curl -X PUT http://localhost:5000/api/students/update/student/1/password -H "Content-Type: application/json" -d '{"current_password":"Secret123","new_password":"NewPass456"}'
router.put('/update/student/:id/password', auth, UpdateStudentPassword);


// curl -X POST http://localhost:5000/api/students/1/parents -H "Content-Type: application/json" -d '{"parent_ids":[5,6]}'
router.post('/add/student/:id/parents', auth, AddParentOnStudent);

// curl -X POST http://localhost:5000/api/students/delete/student/:id/parents/:id -H "Content-Type: application/json" -d '{"parent_ids":[5,6]}'
router.post('/delete/student/:id/parents/:id', auth, DeleteParentOnStudent);

// curl -X DELETE http://localhost:5000/api/students/delete/student/1
router.delete('/delete/student/:id', auth, DeleteStudent);

// Student results history:
// curl http://localhost:3000/api/students/10/exam-results
router.get('/get/exam/history/:id/exam-results', auth, GetStudentExamHistory);

// curl http://localhost:5000/api/students/get/student/class/:classId
router.get('/get/student/class/:classId', auth, GetStudentsByClassId);

// Download Admission Form
router.get('/download/admission-form/:id', auth, DownloadAdmissionForm);

module.exports = router;