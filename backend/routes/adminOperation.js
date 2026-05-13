const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { UpdateGrades, AddGrades, GetGrades, DeleteGrades, AsignSubjectOnGrade, GetSubjectsByGrade, RemoveSubjectFromGrade } = require('../controller/gradeController');
const { AddSubjects, GetSubjects, UpdateSubjects, DeleteSubjects } = require('../controller/subjectController');
const { uploadSubjectImage, uploadAdminImage } = require('../middleware/uploadMiddleware');
const { AddClass, GetClass, UpdateClass, DeleteClass } = require('../controller/classController');
const { GetAcademicYears, AddAcademicYear, UpdateAcademicYear, DeleteAcademicYear } = require('../controller/academicYearController');
const { vaildation } = require('../middleware/validateMiddleware');
const { createGrade } = require('../middleware/gradeMiddleware');
const { createSubject } = require('../middleware/subjectMiddleware');
const { createClassSchema, updateClassSchema } = require('../middleware/classMiddleware');
const { UpdateAdminUser, UpdateAdminPassword, UpdateSuperAdminUser, updateSuperAdminPassword } = require('../controller/authController');
const { getRegistrations, approveRegistration, bulkApproveRegistrations, deleteRegistration } = require('../controller/registrationController');
const { exportStudents, exportTeachers, exportStaff } = require('../controller/exportController');

// Academic Year APIs
router.get('/get/academic-years', auth, GetAcademicYears);
router.get('/get/open-academic-year', GetAcademicYears);
router.post('/add/academic-years', auth, AddAcademicYear);
router.put('/update/academic-year/:id', auth, UpdateAcademicYear);
router.delete('/delete/academic-year/:id', auth, DeleteAcademicYear);


// Grade APIs will go here
// curl -X POST http://localhost:3000/api/admin/add/grades -H "Content-Type: application/json" -d '{"name":"Grade 9"}'
router.post('/add/grades', auth, vaildation(createGrade), AddGrades);

// curl -X GET http://localhost:3000/api/admin/get/grades?
router.get('/get/grades', auth, GetGrades);
router.get('/get/open-grades', GetGrades);

// curl -X PUT http://localhost:5000/api/admin/update/grades/1 -H "Content-Type: application/json" -d '{"name":"Grade 9 - Updated"}'
router.put('/update/grades/:id', auth, vaildation(createGrade), UpdateGrades);

// curl -X DELETE http://localhost:3000/api/admin/delete/grades/1
router.delete('/delete/grades/:id', auth, DeleteGrades);

// curl -X POST http://localhost:3000/api/admin/asign/subject/on/grade/1 -H "Content-Type: application/json" -d '{"subject_ids":[1,2,3]}'
router.post('/asign/subject/on/grade/:id', auth, AsignSubjectOnGrade);

// Get subjects assigned to a grade
router.get('/get/grade/:id/subjects', auth, GetSubjectsByGrade);

// Remove subject from grade
router.delete('/delete/grade/:id/subject/:subject_id', auth, RemoveSubjectFromGrade);



// Subject APIs will go here
// curl -X POST http://localhost:5000/api/admin/add/subjects -H "Content-Type: application/json" -d '{"name":"Physics Advanced"}'
router.post('/add/subjects', auth, uploadSubjectImage.single('image'), AddSubjects);

// curl -X GET http://localhost:5000/api/admin/get/subjects?
router.get('/get/subjects', auth, GetSubjects);

// curl -X PUT http://localhost:3000/api/admin/update/subjects/2 -H "Content-Type: application/json" -d '{"name":"Physics Advanced"}'
router.put('/update/subjects/:id', auth, uploadSubjectImage.single('image'), UpdateSubjects);

// curl -X DELETE http://localhost:3000/api/admin/delete/subjects/2
router.delete('/delete/subjects/:id', auth, DeleteSubjects);



// Class APIs will go here
// curl -X POST http://localhost:3000/api/admin/add/classes -H "Content-Type: application/json" -d '{"name":"10-B","room":"B-201"}'
router.post('/add/classes', auth, vaildation(createClassSchema), AddClass);

// http://localhost:5000/api/admin/get/classes?q=?&q=?&grade_id=2&limit=0&offset=0
// curl -X GET http://localhost:3000/api/admin/get/classes
router.get('/get/classes', auth, GetClass);
router.get('/get/open-classes', GetClass);

// curl -X PUT http://localhost:3000/api/admin/update/classes/3 -H "Content-Type: application/json" -d '{"name":"10-B","room":"B-201"}'
router.put('/update/classes/:id', auth, vaildation(updateClassSchema), UpdateClass);

// curl -X DELETE http://localhost:3000/api/admin/delete/classes/3
router.delete('/delete/classes/:id', auth, DeleteClass);

router.put('/update/admin/:admin_id', auth, uploadAdminImage.single("image"), UpdateAdminUser);
router.put('/update/superadmin/:superadmin_id', auth, uploadAdminImage.single("image"), UpdateSuperAdminUser);

router.put('/update/admin/:admin_id/password', auth, UpdateAdminPassword);
router.put('/update/superadmin/:superadmin_id/password', auth, updateSuperAdminPassword);


// Registration Approval & Management Endpoints
router.get('/registrations', auth, getRegistrations);
router.put('/registrations/bulk-approve', auth, bulkApproveRegistrations);
router.put('/registrations/:id/approve', auth, approveRegistration);
router.delete('/registrations/:id', auth, deleteRegistration);

// Exports Endpoints
router.get('/export/students', auth, exportStudents);
router.get('/export/teachers', auth, exportTeachers);
router.get('/export/staff', auth, exportStaff);
module.exports = router;