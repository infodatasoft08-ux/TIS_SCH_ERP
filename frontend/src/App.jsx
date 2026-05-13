import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AnimatePresence } from 'framer-motion';
import AnimatedLayout from './AnimatedLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './main/pages/mainLayout';
import AddStudents from './student/forms/pages/addStudentForm';
import Dashboard from './main/pages/Dashboard';
import StudentsDatable from './student/datatable/pages/studentDataTable';
import AddClasses from './admin/forms/pages/AddClass';
import AddSubject from './admin/forms/pages/AddSubject';
import RoleMenuAdmin from './admin/pages/setting/MenuRoleAssign';
import ForgotPasswordPage from './pages/ForgotPassword';
import { Toaster } from "sonner";
import TeachersOperation from './teacher/DataTable/pages/teachersDataTable';
import TeacherSubjectAssign from './teacher/DataTable/pages/teacherSubjectAssign';
import TakeAttendance from './teacher/DataTable/pages/attendanceTaker';
import StaffOperation from './staff/dataTable/staffDataTable';
import ClassFeeStructure from './finance/form/classFeeStructure';
import Invoices from './finance/form/invoiceGenerationManagement';
import InvoiceDetails from './finance/form/invoiceDetailsPayment';
import StudentFeeSummary from './finance/form/studentFeeSummaryDashboard';
import PaymentHistory from './finance/form/paymentHistory';
import FeeTypes from './finance/form/addFeeType';
import StudentAttendanceSummary from './widgets/studentAttendaceSummeryCalender';
import CreateTimeTable from './admin/forms/pages/AddTimeTable';
import ClassTimeTablePage from './features/ClassTimeTable';
import AcademicRecordsPage from './academicRecord/AcademicRecordsPage';
import ExamDataTable from './exam/ExamDataTable';
import Assignment from './assignment/Assignment';
import SubmitAssignment from './assignment/SubmitAssignment';
import ViewSubjectAssignToTeacher from './teacher/DataTable/pages/viewSubjectAssignToTeacher';
import AssignSubjectOnClass from './admin/forms/pages/AssignSubjectOnClass';
import CheckExams from './student/features/CheckExams';
import StudentFeeDetails from './student/features/StudentFeeDetails';
import ClassStudent from './teacher/features/ClassStudent';
import NotesManagement from './notes/NotesManagement';
import NotesViewer from './notes/NotesViewer';
import BulkImport from './pages/BulkImport';
import ViewMySubjects from './student/pages/ViewMySubjects';
import AcademicYearDataTable from './admin/datatable/pages/AcademicYearDataTable';
import Contact from './pages/Contact';
import DynamicAnnouncement from './components/announcements/DynamicAnnouncement';
import NotFoundFallback from './pages/NotFoundFallback';
import EmployeeAttendanceTaker from './admin/pages/EmployeeAttendanceTaker';
import HomeworkPage from './homework/HomeworkPage';
import StudentHomeworkPage from './homework/StudentHomeworkPage';
import CreateAnouncementDatable from './components/announcements/CreateAnouncementDatable';
import RegistrationPage from './pages/RegistrationPage';
import RegisteredRequests from './admin/pages/RegisteredRequests';


export default function App() {
  const location = useLocation();
  return (
    <LanguageProvider>
      <AuthProvider>
        <AnimatePresence>
          {/* <Toaster
            position="top-right"
            reverseOrder={true}
          /> */}
          <Toaster position="top-center" richColors closeButton />

          <Routes location={location} key={location.pathname}>
            {/* Root -> show landing page */}
            <Route index element={<LoginPage />} />

            {/* Login route */}
            <Route
              path="/login"
              element={
                <AnimatedLayout>
                  <LoginPage />
                </AnimatedLayout>
              }
            />
            <Route
              path="/forgotpassword"
              element={
                <AnimatedLayout>
                  <ForgotPasswordPage />
                </AnimatedLayout>
              }
            />
            <Route
              path="/contact"
              element={
                <AnimatedLayout>
                  <Contact />
                </AnimatedLayout>
              }
            />
            <Route
              path="/registration"
              element={
                <AnimatedLayout>
                  <RegistrationPage />
                </AnimatedLayout>
              }
            />

            {/* Admin area (protected by token) */}
            <Route
              path="/school"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* index child -> shows when /school is visited */}
              <Route index element={<Dashboard />} />

              {/* Relative child paths (NO leading slash) */}
              <Route path="dashboard" element={<Dashboard />} />
              {/* Student Route */}
              <Route path="students/list" element={<StudentsDatable />} />
              <Route path="students/add" element={<AddStudents />} />
              <Route path="students/attendance" element={<TakeAttendance />} />
              <Route path="student/acadamic" element={<AcademicRecordsPage />} />
              {/* Teacher Route */}
              <Route path="teachers/list" element={<TeachersOperation />} />
              <Route path="teacher/students" element={<ClassStudent />} />
              {/* Class Route */}
              {/* <Route path="classes/list" element={<ClassesDataTable />} /> */}
              <Route path="class/add" element={<AddClasses />} />
              <Route path="class/attendance" element={<StudentAttendanceSummary />} />
              <Route path="class/time_table" element={<CreateTimeTable />} />
              <Route path="class/class_time_table" element={<ClassTimeTablePage />} />
              <Route path="class/subjects" element={<AssignSubjectOnClass />} />
              {/* Subject Route */}
              <Route path="subject/assign" element={<TeacherSubjectAssign />} />
              <Route path="subject/teacher_subject" element={<ViewSubjectAssignToTeacher />} />
              <Route path="subject/student_subject" element={<ViewMySubjects />} />
              <Route path="subject/add" element={<AddSubject />} />
              {/* Staff Route */}
              <Route path="staff/add" element={<StaffOperation />} />
              <Route path="employees/attendance" element={<EmployeeAttendanceTaker />} />

              {/* Finance Route */}
              <Route path="finance/fee-structure/list" element={<FeeTypes />} />
              <Route
                path="finance/transactions/list"
                element={<PaymentHistory />}
              />
              <Route
                path="finance/feestructure/add"
                element={<ClassFeeStructure />}
              />
              <Route
                path="finance/students/fees"
                element={<StudentFeeSummary />}
              />
              <Route path="finance/invoice/manage" element={<Invoices />} />
              <Route
                path="finance/invoices/:invoiceId"
                element={<InvoiceDetails />}
              />
              {/* Exam */}
              <Route path="exam/create_exam" element={<ExamDataTable />} />
              <Route path="academic-years" element={<AcademicYearDataTable />} />
              <Route
                path="exam/exams_student"
                element={<CheckExams />}
              />
              <Route
                path="students/fees"
                element={<StudentFeeDetails />}
              />
              {/* <Route path="/fee-types" element={<FeeTypes />} />
              <Route path="fee/add" element={<AddFeeStructure />} />
              <Route path="/class-fee-structure" element={<ClassFeeStructure />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:invoiceId" element={<InvoiceDetails />} />
              <Route path="/student-fee-summary" element={<StudentFeeSummary />} />
              <Route path="/payment-history" element={<PaymentHistory />} /> */}
              {/* Announcement Route */}
              <Route path="announcement/list" element={<DynamicAnnouncement />} />
              {/* <Route path="notices/list" element={<NoticeDataTable />} /> */}
              <Route path="announcement/add" element={<CreateAnouncementDatable />} />

              {/* Assignment Route */}
              <Route path="assignments/manage" element={<Assignment />} />
              {/* <Route path="assignments/submit" element={<SubmitAssignment />} /> */}
              <Route path="assignments/student" element={<SubmitAssignment />} />
              {/* Notes Route */}
              <Route path="notes/manage" element={<NotesManagement />} />
              <Route path="notes/view" element={<NotesViewer />} />
              {/* Homework Route */}
              <Route path="homework/manage" element={<HomeworkPage />} />
              <Route path="homework/student" element={<StudentHomeworkPage />} />
              <Route path="bulk-import" element={<BulkImport />} />
              {/* Setting Route */}
              <Route path="setting" element={<RoleMenuAdmin />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              <Route path="registered" element={<RegisteredRequests />} />
            </Route>

            {/* fallback -> go to login or dashboard */}
            {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
            <Route path="*" element={<NotFoundFallback />} />
          </Routes>
        </AnimatePresence>
      </AuthProvider>
    </LanguageProvider>
  );
}
