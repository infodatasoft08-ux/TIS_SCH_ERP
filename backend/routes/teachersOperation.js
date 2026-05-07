const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { AddTeacher, GetTeacher, GetTeacherById, UpdateTeacher, UpdateTeacherPassword, DeleteTeacher, AsignTeacherForSubject, GetClassByteacherSuperviser, GetSubjectByAssignTeacher, GetTeachersAssignOnSubject, DeleteSubjectAssignOnTeacher, GetAllTeacherSubjectAssignments, GetStudentsOfMySupervisedClass, GetSubjectsByTeacherId, GetPublicTeachers, DownloadTeacherPdf } = require('../controller/teachersController');
const { vaildation } = require('../middleware/validateMiddleware');
const { createTeacher } = require('../middleware/teacherMiddleware');
const { uploadTeacherImage } = require('../middleware/uploadMiddleware');


// Public routes for landing page
router.get('/public', GetPublicTeachers);
router.get('/public/:id/download-pdf', DownloadTeacherPdf);

// Create teacher:
// curl -X POST http://localhost:5000/api/teachers \
//  -H "Content-Type: application/json" \
//  -d '{"first_name":"Asha","last_name":"Sharma","email":"asha@example.com","password":"Secret123","role_id":2,"employee_code":"T-100","hire_date":"2024-08-01","qualification":"MSc","bio":"Math teacher"}'
router.post('/add/teacher', auth, uploadTeacherImage.single('image'), AddTeacher);

// List teachers:
// curl http://localhost:5000/api/teachers?q=asha&limit=20
router.get('/get/teacher', auth, GetTeacher);

// Get teacher:
// curl http://localhost:5000/api/teachers/1
router.get('/get/teacher/me', auth, GetTeacherById);


// Update teacher basic/profile:
// curl -X PUT http://localhost:5000/api/teachers/1 \
//  -H "Content-Type: application/json" \
//  -d '{"first_name":"Asha","last_name":"K.","email":"asha.k@example.com","qualification":"MSc, BEd"}'
router.put('/update/teacher/:id', auth, uploadTeacherImage.single('image'), UpdateTeacher);

// Change password:
// curl -X PUT http://localhost:5000/api/teachers/1/password \
//  -H "Content-Type: application/json" \
//  -d '{"current_password":"Secret123","new_password":"NewSecret456"}'
router.put('/update/teacher/:id/password', auth, UpdateTeacherPassword);

// Delete teacher:
// curl -X DELETE http://localhost:5000/api/teachers/1
router.delete('/delete/teacher/:id', auth, DeleteTeacher);

// Get assigned subject for teacher (me):
router.get('/get/teacher/subjects', auth, GetSubjectByAssignTeacher);

// Get assigned subject by teacher id (admin):
router.get('/get/teacher/:id/subjects', auth, GetSubjectsByTeacherId);

router.get('/get/teacher/:subject_id/teachers', auth, GetTeachersAssignOnSubject);

// Assign subjects:
// curl -X POST http://localhost:5000/api/teachers/1/subjects \
//  -H "Content-Type: application/json" \
//  -d '{"subject_ids":[1,2,3]}'
router.post('/add/teacher/:id/subjects', auth, AsignTeacherForSubject);

// Remove subject:
// curl -X DELETE http://localhost:5000/api/teachers/delete/teacher/:id/subject/:id
router.delete('/delete/teacher/:id/subject/:subject_id', auth, DeleteSubjectAssignOnTeacher);
router.get('/get/teacher-subjects', auth, GetAllTeacherSubjectAssignments);

/**
 * GET /api/teachers/:id/classes
 * Lists classes where teacher is supervisor
 */
router.get('/get/teacher/my/supervised-class', auth, GetClassByteacherSuperviser);

router.get('/get/teacher/my/supervised-class/students', auth, GetStudentsOfMySupervisedClass);


module.exports = router;