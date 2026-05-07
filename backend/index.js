const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
require('../backend/db');
require('./cron/autoGenerateInvoices'); // initialize the cron job
// const exphbs = require('express-handlebars');
// const hbs = require('hbs');
// const path = require('path');

const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const getMenuByRoles = require('./routes/getMenuByRoles');
const adminOperationRoute = require('./routes/adminOperation');
const teacherOperationRouter = require('./routes/teachersOperation');
const parentOperationRouter = require('./routes/parentRoute');
const attendanceOperationRouter = require('./routes/attendanceRoute');
const examOperationRouter = require('./routes/examRoute');
const assignmentRouter = require('./routes/assignmentRoute');
const lessonRouter = require('./routes/lessonRoute');
const feeRouter = require('./routes/feeRoute');
const announcementRouter = require('./routes/announcementRoute');
const timeTableRoutine = require('./routes/timeTableRoutineRoute');
const staffRouter = require('./routes/staffUserRoute');
const academicRouter = require('./routes/acadamic_controller');
const analyticsRouter = require('./routes/analyticsRoute');
const noteRouter = require('./routes/noteRoute');
const bulkRouter = require('./routes/bulkRoute');
const schoolGalleryRouter = require('./routes/schoolGalleryRoute');
const employeeAttendanceRouter = require('./routes/employeeAttendanceRoute');
const homeworkRouter = require('./routes/homework_routes');

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));



app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/staffUser', staffRouter);
app.use('/api/admin', adminOperationRoute);
app.use('/api/teachers', teacherOperationRouter);
app.use('/api/parents', parentOperationRouter);
app.use('/api/attendance', attendanceOperationRouter);
app.use('/api/exam', examOperationRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/lesson', lessonRouter);
app.use('/api/fee', feeRouter);
app.use('/api/announcement', announcementRouter);
app.use('/api/classroutine', timeTableRoutine);
app.use('/api/getmenu', getMenuByRoles);
app.use('/api/academic', academicRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notes', noteRouter);
app.use('/api/bulk', bulkRouter);
app.use('/api/school-gallery', schoolGalleryRouter);
app.use('/api/employee-attendance', employeeAttendanceRouter);
app.use('/api/homework', homeworkRouter);


const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));