import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AnimatePresence } from 'framer-motion';
import AnimatedLayout from './AnimatedLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import MainLayout from './main/pages/mainLayout';
import Dashboard from './main/pages/Dashboard';
import { LanguageProvider } from './context/LanguageContext';
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import lazyWithRetry from './utils/lazyWithRetry';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy loading heavy secondary components for Code Splitting with Retry logic
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const AddStudents = lazyWithRetry(() => import('./student/forms/pages/addStudentForm'));
const StudentsDatable = lazyWithRetry(() => import('./student/datatable/pages/studentDataTable'));
const AddClasses = lazyWithRetry(() => import('./admin/forms/pages/AddClass'));
const AddSubject = lazyWithRetry(() => import('./admin/forms/pages/AddSubject'));
const RoleMenuAdmin = lazyWithRetry(() => import('./admin/pages/setting/MenuRoleAssign'));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/ForgotPassword'));
const TeachersOperation = lazyWithRetry(() => import('./teacher/DataTable/pages/teachersDataTable'));
const TeacherSubjectAssign = lazyWithRetry(() => import('./teacher/DataTable/pages/teacherSubjectAssign'));
const TakeAttendance = lazyWithRetry(() => import('./teacher/DataTable/pages/attendanceTaker'));
const StaffOperation = lazyWithRetry(() => import('./staff/dataTable/staffDataTable'));
const ClassFeeStructure = lazyWithRetry(() => import('./finance/form/classFeeStructure'));
const Invoices = lazyWithRetry(() => import('./finance/form/invoiceGenerationManagement'));
const InvoiceDetails = lazyWithRetry(() => import('./finance/form/invoiceDetailsPayment'));
const StudentFeeSummary = lazyWithRetry(() => import('./finance/form/studentFeeSummaryDashboard'));
const PaymentHistory = lazyWithRetry(() => import('./finance/form/paymentHistory'));
const FeeTypes = lazyWithRetry(() => import('./finance/form/addFeeType'));
const StudentAttendanceSummary = lazyWithRetry(() => import('./widgets/studentAttendaceSummeryCalender'));
const CreateTimeTable = lazyWithRetry(() => import('./admin/forms/pages/AddTimeTable'));
const ClassTimeTablePage = lazyWithRetry(() => import('./features/ClassTimeTable'));
const AcademicRecordsPage = lazyWithRetry(() => import('./academicRecord/AcademicRecordsPage'));
const ExamDataTable = lazyWithRetry(() => import('./exam/ExamDataTable'));
const Assignment = lazyWithRetry(() => import('./assignment/Assignment'));
const SubmitAssignment = lazyWithRetry(() => import('./assignment/SubmitAssignment'));
const ViewSubjectAssignToTeacher = lazyWithRetry(() => import('./teacher/DataTable/pages/viewSubjectAssignToTeacher'));
const AssignSubjectOnClass = lazyWithRetry(() => import('./admin/forms/pages/AssignSubjectOnClass'));
const CheckExams = lazyWithRetry(() => import('./student/features/CheckExams'));
const StudentFeeDetails = lazyWithRetry(() => import('./student/features/StudentFeeDetails'));
const ClassStudent = lazyWithRetry(() => import('./teacher/features/ClassStudent'));
const NotesManagement = lazyWithRetry(() => import('./notes/NotesManagement'));
const NotesViewer = lazyWithRetry(() => import('./notes/NotesViewer'));
const BulkImport = lazyWithRetry(() => import('./pages/BulkImport'));
const ViewMySubjects = lazyWithRetry(() => import('./student/pages/ViewMySubjects'));
const AcademicYearDataTable = lazyWithRetry(() => import('./admin/datatable/pages/AcademicYearDataTable'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const DynamicAnnouncement = lazyWithRetry(() => import('./components/announcements/DynamicAnnouncement'));
const NotFoundFallback = lazyWithRetry(() => import('./pages/NotFoundFallback'));
const EmployeeAttendanceTaker = lazyWithRetry(() => import('./admin/pages/EmployeeAttendanceTaker'));
const HomeworkPage = lazyWithRetry(() => import('./homework/HomeworkPage'));
const StudentHomeworkPage = lazyWithRetry(() => import('./homework/StudentHomeworkPage'));
const CreateAnouncementDatable = lazyWithRetry(() => import('./components/announcements/CreateAnouncementDatable'));
const RegistrationPage = lazyWithRetry(() => import('./pages/RegistrationPage'));
const RegisteredRequests = lazyWithRetry(() => import('./admin/pages/RegisteredRequests'));
const TemplateUploadPage = lazyWithRetry(() => import('./idcard/pages/TemplateUploadPage'));
const GenerateDocumentsPage = lazyWithRetry(() => import('./idcard/pages/GenerateDocumentsPage'));
const ExportDataPage = lazyWithRetry(() => import('./pages/school/ExportDataPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache queries for 5 minutes
      refetchOnWindowFocus: false, // Prevent re-fetching on tab/window focus
    },
  },
});

const PageLoader = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 bg-background text-foreground animate-fade-in">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-medium text-muted-foreground">Loading module...</span>
  </div>
);

export default function App() {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
            <Toaster position="top-center" richColors closeButton />

            <AnimatePresence mode="wait">
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes location={location}>
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
                  <Route path="students/list" element={<ProtectedRoute blockedRoles={[1, 5]}><StudentsDatable /></ProtectedRoute>} />
                  <Route path="students/add" element={<ProtectedRoute blockedRoles={[1, 5]}><AddStudents /></ProtectedRoute>} />
                  <Route path="students/attendance" element={<ProtectedRoute blockedRoles={[1, 5]}><TakeAttendance /></ProtectedRoute>} />
                  <Route path="student/acadamic" element={<AcademicRecordsPage />} />
                  {/* Teacher Route */}
                  <Route path="teachers/list" element={<ProtectedRoute blockedRoles={[1, 5]}><TeachersOperation /></ProtectedRoute>} />
                  <Route path="teacher/students" element={<ProtectedRoute blockedRoles={[1, 5]}><ClassStudent /></ProtectedRoute>} />
                  {/* Class Route */}
                  <Route path="class/add" element={<ProtectedRoute blockedRoles={[1, 5]}><AddClasses /></ProtectedRoute>} />
                  <Route path="class/attendance" element={<ProtectedRoute blockedRoles={[1, 5]}><StudentAttendanceSummary /></ProtectedRoute>} />
                  <Route path="class/time_table" element={<ProtectedRoute blockedRoles={[1, 5]}><CreateTimeTable /></ProtectedRoute>} />
                  <Route path="class/class_time_table" element={<ProtectedRoute blockedRoles={[1, 5]}><ClassTimeTablePage /></ProtectedRoute>} />
                  <Route path="class/subjects" element={<ProtectedRoute blockedRoles={[1, 5]}><AssignSubjectOnClass /></ProtectedRoute>} />
                  {/* Subject Route */}
                  <Route path="subject/assign" element={<ProtectedRoute blockedRoles={[1, 5]}><TeacherSubjectAssign /></ProtectedRoute>} />
                  <Route path="subject/teacher_subject" element={<ProtectedRoute blockedRoles={[1, 5]}><ViewSubjectAssignToTeacher /></ProtectedRoute>} />
                  <Route path="subject/student_subject" element={<ViewMySubjects />} />
                  <Route path="subject/add" element={<ProtectedRoute blockedRoles={[1, 5]}><AddSubject /></ProtectedRoute>} />
                  {/* Staff Route */}
                  <Route path="staff/add" element={<ProtectedRoute blockedRoles={[1, 5]}><StaffOperation /></ProtectedRoute>} />
                  <Route path="employees/attendance" element={<ProtectedRoute blockedRoles={[1, 5]}><EmployeeAttendanceTaker /></ProtectedRoute>} />

                  {/* Finance Route */}
                  <Route path="finance/fee-structure/list" element={<ProtectedRoute blockedRoles={[1, 5]}><FeeTypes /></ProtectedRoute>} />
                  <Route
                    path="finance/transactions/list"
                    element={<ProtectedRoute blockedRoles={[1, 5]}><PaymentHistory /></ProtectedRoute>}
                  />
                  <Route
                    path="finance/feestructure/add"
                    element={<ProtectedRoute blockedRoles={[1, 5]}><ClassFeeStructure /></ProtectedRoute>}
                  />
                  <Route
                    path="finance/students/fees"
                    element={<ProtectedRoute blockedRoles={[1, 5]}><StudentFeeSummary /></ProtectedRoute>}
                  />
                  <Route path="finance/invoice/manage" element={<ProtectedRoute blockedRoles={[1, 5]}><Invoices /></ProtectedRoute>} />
                  <Route
                    path="finance/invoices/:invoiceId"
                    element={<ProtectedRoute blockedRoles={[1, 5]}><InvoiceDetails /></ProtectedRoute>}
                  />
                  {/* Exam */}
                  <Route path="exam/create_exam" element={<ProtectedRoute blockedRoles={[1, 5]}><ExamDataTable /></ProtectedRoute>} />
                  <Route path="academic-years" element={<ProtectedRoute blockedRoles={[1, 5]}><AcademicYearDataTable /></ProtectedRoute>} />
                  <Route
                    path="exam/exams_student"
                    element={<CheckExams />}
                  />
                  <Route
                    path="students/fees"
                    element={<StudentFeeDetails />}
                  />

                  {/* Announcement Route */}
                  <Route path="announcement/list" element={<DynamicAnnouncement />} />
                  <Route path="announcement/add" element={<ProtectedRoute blockedRoles={[1, 5]} redirectTo="/school/announcement/list"><CreateAnouncementDatable /></ProtectedRoute>} />

                  {/* Assignment Route */}
                  <Route path="assignments/manage" element={<ProtectedRoute blockedRoles={[1, 5]}><Assignment /></ProtectedRoute>} />
                  <Route path="assignments/student" element={<SubmitAssignment />} />
                  {/* Notes Route */}
                  <Route path="notes/manage" element={<ProtectedRoute blockedRoles={[1, 5]}><NotesManagement /></ProtectedRoute>} />
                  <Route path="notes/view" element={<NotesViewer />} />
                  {/* Homework Route */}
                  <Route path="homework/manage" element={<ProtectedRoute blockedRoles={[1, 5]}><HomeworkPage /></ProtectedRoute>} />
                  <Route path="homework/student" element={<StudentHomeworkPage />} />
                  <Route path="bulk-import" element={<ProtectedRoute blockedRoles={[1, 5]}><BulkImport /></ProtectedRoute>} />
                  <Route path="export-data" element={<ProtectedRoute blockedRoles={[1, 5]}><ExportDataPage /></ProtectedRoute>} />
                  {/* Setting Route */}
                  <Route path="setting" element={<ProtectedRoute allowedRoles={[12, 'developer']}><RoleMenuAdmin /></ProtectedRoute>} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="registered" element={<ProtectedRoute blockedRoles={[1, 5]}><RegisteredRequests /></ProtectedRoute>} />
                  {/* ID Card & Certificate Generator Routes */}
                  <Route path="idcard/templates" element={<ProtectedRoute blockedRoles={[1, 5]}><TemplateUploadPage /></ProtectedRoute>} />
                  <Route path="idcard/generate" element={<ProtectedRoute blockedRoles={[1, 5]}><GenerateDocumentsPage /></ProtectedRoute>} />
                </Route>

                {/* fallback */}
                <Route path="*" element={<NotFoundFallback />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AnimatePresence>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
