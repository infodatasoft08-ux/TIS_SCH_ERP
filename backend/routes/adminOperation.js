const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
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
router.post('/add/academic-years', auth, restrictRoles([1, 5]), AddAcademicYear);
router.put('/update/academic-year/:id', auth, restrictRoles([1, 5]), UpdateAcademicYear);
router.delete('/delete/academic-year/:id', auth, restrictRoles([1, 5]), DeleteAcademicYear);


// Grade APIs will go here
// curl -X POST http://localhost:3000/api/admin/add/grades -H "Content-Type: application/json" -d '{"name":"Grade 9"}'
router.post('/add/grades', auth, restrictRoles([1, 5]), vaildation(createGrade), AddGrades);

// curl -X GET http://localhost:3000/api/admin/get/grades?
router.get('/get/grades', auth, GetGrades);
router.get('/get/open-grades', GetGrades);

// curl -X PUT http://localhost:5000/api/admin/update/grades/1 -H "Content-Type: application/json" -d '{"name":"Grade 9 - Updated"}'
router.put('/update/grades/:id', auth, restrictRoles([1, 5]), vaildation(createGrade), UpdateGrades);

// curl -X DELETE http://localhost:3000/api/admin/delete/grades/1
router.delete('/delete/grades/:id', auth, restrictRoles([1, 5]), DeleteGrades);

// curl -X POST http://localhost:3000/api/admin/asign/subject/on/grade/1 -H "Content-Type: application/json" -d '{"subject_ids":[1,2,3]}'
router.post('/asign/subject/on/grade/:id', auth, restrictRoles([1, 5]), AsignSubjectOnGrade);

// Get subjects assigned to a grade
router.get('/get/grade/:id/subjects', auth, GetSubjectsByGrade);

// Remove subject from grade
router.delete('/delete/grade/:id/subject/:subject_id', auth, restrictRoles([1, 5]), RemoveSubjectFromGrade);



// Subject APIs will go here
// curl -X POST http://localhost:5000/api/admin/add/subjects -H "Content-Type: application/json" -d '{"name":"Physics Advanced"}'
router.post('/add/subjects', auth, restrictRoles([1, 5]), uploadSubjectImage.single('image'), AddSubjects);

// curl -X GET http://localhost:5000/api/admin/get/subjects?
router.get('/get/subjects', auth, GetSubjects);

// curl -X PUT http://localhost:3000/api/admin/update/subjects/2 -H "Content-Type: application/json" -d '{"name":"Physics Advanced"}'
router.put('/update/subjects/:id', auth, restrictRoles([1, 5]), uploadSubjectImage.single('image'), UpdateSubjects);

// curl -X DELETE http://localhost:3000/api/admin/delete/subjects/2
router.delete('/delete/subjects/:id', auth, restrictRoles([1, 5]), DeleteSubjects);



// Class APIs will go here
// curl -X POST http://localhost:3000/api/admin/add/classes -H "Content-Type: application/json" -d '{"name":"10-B","room":"B-201"}'
router.post('/add/classes', auth, restrictRoles([1, 5]), vaildation(createClassSchema), AddClass);

// http://localhost:5000/api/admin/get/classes?q=?&q=?&grade_id=2&limit=0&offset=0
// curl -X GET http://localhost:3000/api/admin/get/classes
router.get('/get/classes', auth, GetClass);
router.get('/get/open-classes', GetClass);

// curl -X PUT http://localhost:3000/api/admin/update/classes/3 -H "Content-Type: application/json" -d '{"name":"10-B","room":"B-201"}'
router.put('/update/classes/:id', auth, restrictRoles([1, 5]), vaildation(updateClassSchema), UpdateClass);

// curl -X DELETE http://localhost:3000/api/admin/delete/classes/3
router.delete('/delete/classes/:id', auth, restrictRoles([1, 5]), DeleteClass);

router.put('/update/admin/:admin_id', auth, restrictRoles([1, 5]), uploadAdminImage.single("image"), UpdateAdminUser);
router.put('/update/superadmin/:superadmin_id', auth, restrictRoles([1, 5]), uploadAdminImage.single("image"), UpdateSuperAdminUser);

router.put('/update/admin/:admin_id/password', auth, restrictRoles([1, 5]), UpdateAdminPassword);
router.put('/update/superadmin/:superadmin_id/password', auth, restrictRoles([1, 5]), updateSuperAdminPassword);


// Registration Approval & Management Endpoints
router.get('/registrations', auth, restrictRoles([1, 5]), getRegistrations);
router.put('/registrations/bulk-approve', auth, restrictRoles([1, 5]), bulkApproveRegistrations);
router.put('/registrations/:id/approve', auth, restrictRoles([1, 5]), approveRegistration);
router.delete('/registrations/:id', auth, restrictRoles([1, 5]), deleteRegistration);

// Exports Endpoints
router.get('/export/students', auth, restrictRoles([1, 5]), exportStudents);
router.get('/export/teachers', auth, restrictRoles([1, 5]), exportTeachers);
router.get('/export/staff', auth, restrictRoles([1, 5]), exportStaff);
module.exports = router;