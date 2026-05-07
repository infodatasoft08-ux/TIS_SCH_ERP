const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { TakeAttendance, GetAttendance, GetAttendanceById, DeleteAttendace, GetAttendanceSummery, GetStudentAttendanceRecords, UpdateSingleAttendance, GetSupervisedClassAttendanceTrends } = require('../controller/attendanceController');

// curl -X POST http://localhost:5000/api/attendance/add/attendance \
//   -H "Content-Type: application/json" \
//   -d '{
//     "records": [
//       {"student_id":1,"class_id":2,"lesson_id":5,"date":"2025-11-28","status":"present","recorded_by":10},
//       {"student_id":2,"class_id":2,"date":"2025-11-28","status":"absent","recorded_by":10}
//     ]
//   }'
router.post('/add/attendance', auth, TakeAttendance);

router.put('/update/attend/update-single', UpdateSingleAttendance); // Single student update today

// Fetch attendance for a class/date range:
// curl "http://localhost:5000/api/attendance/get/attendance?class_id=2&from=2025-11-01&to=2025-11-30&limit=500"
router.get('/get/attendance', auth, GetAttendance);

// Get one record:
// curl http://localhost:5000/api/attendance/get/attendance/:id
router.get('/get/attendance/:id', auth, GetAttendanceById);


// curl -X DELETE http://localhost:5000/api/attendance/delete/attendance/:id
router.delete('/delete/attendance/:id', auth, DeleteAttendace);

// Get class summary:
// curl "http://localhost:5000/api/attendance/get/attendace/summery/class?class_id=2&from=2025-11-01&to=2025-11-30"
router.get('/get/attendace/summery/class', auth, GetStudentAttendanceRecords)

// Get student summary:
// curl "http://localhost:5000/api/attendance/get/attendace/summery/student?student_id=1&from=2025-11-01&to=2025-11-30"
router.get('/get/attendace/summery/student', auth, GetStudentAttendanceRecords)


// GET "http://localhost:5000/api/attendance/summery?class_id=5&from=2024-01-01&to=2024-01-31
router.get('/get/attend/summery', auth, GetAttendanceSummery)

// Get attendance trends for supervised class
router.get('/supervised-class/trends', auth, GetSupervisedClassAttendanceTrends);




module.exports = router;