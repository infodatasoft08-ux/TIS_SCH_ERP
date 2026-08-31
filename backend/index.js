const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
require('../backend/db');

// Centralized process safety error handlers to prevent unhandledRejection crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🚨 [Uncaught Exception]:', error);
});

// Only initialize cron jobs on PM2 instance 0 (or single-process dev mode) to prevent multi-worker duplicate execution
if (!process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0') {
  require('./cron/autoGenerateInvoices');
  console.log(`[CRON] Auto-generate invoices cron scheduled on instance ${process.env.NODE_APP_INSTANCE || '0'}`);
}

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
const registrationRouter = require('./routes/registrationRoute');
const documentRouter = require('./routes/documentRoute');
const appVersionRoute = require('./routes/appVersionRoute');
const path = require('path');
const compression = require('compression');
app.use(compression());

app.use(cors({
  exposedHeaders: ['x-refreshed-token'],
  maxAge: 86400 // Cache CORS Preflight (204 OPTIONS) for 24 hours in browser
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const whatsappQueue = require('./queues/whatsappQueue');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(whatsappQueue)],
  serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

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
app.use('/api/registration', registrationRouter);
app.use('/api/documents', documentRouter);
app.use('/api/app-version', appVersionRoute);

// Global Express Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('🚨 Central Express Error:', err.message || err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Server running on port ${PORT} (Process PID: ${process.pid})`));
