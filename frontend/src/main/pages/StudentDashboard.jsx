import React, { useEffect, useState } from 'react';
import API from '@/api';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { Megaphone, GraduationCap, CalendarCheck, CalendarIcon } from "lucide-react";
import StudentAttendanceCalendar from '@/student/datatable/pages/studentAttendenceDataTable';
import { StudentAttendanceChart, StudentExamChart } from './components/DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentRoutine from '@/student/features/StudentTimeTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [exams, setExams] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const studentRes = await API.get('/students/get/student_id');
        const studentData = studentRes.data.student;
        setStudent(studentData);

        // Fetch complementary data
        if (studentData) {
          const endDate = new Date().toISOString().split('T')[0];
          const startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
          const startDateStr = startDate.toISOString().split('T')[0];

          const [attendanceRes, examsRes] = await Promise.all([
            API.get('/attendance/get/attendace/summery/student', {
              params: { class_id: studentData.class_id, from: startDateStr, to: endDate }
            }),
            API.get('/exam/student/exams')
          ]);

          setAttendanceRecords(attendanceRes.data.records || []);
          setExams(examsRes.data.exams || []);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-6 rounded-[2rem] border space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>

        {/* Routine Section */}
        <div className="p-4 rounded-[1rem] border shadow-xl space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Attendance Chart */}
          <div className="p-6 rounded-[2rem] border space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>

          {/* Exam Chart */}
          <div className="p-6 rounded-[2rem] border space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>

        {/* Announcements */}
        <div className="p-8 rounded-[2rem] border space-y-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* Attendance Calendar */}
        <div className="p-4 rounded-[2rem] border space-y-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Dashboard</h2>
          <p className="text-gray-500">Welcome back, {student?.user_name || 'Student'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm transition-all hover:shadow-md">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">My Class</div>
          <div className="text-2xl font-bold text-blue-600">{student?.class_name || '--'}</div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm transition-all hover:shadow-md">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Roll Number</div>
          <div className="text-2xl font-bold text-emerald-600">{student?.roll_no || '--'}</div>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm transition-all hover:shadow-md">
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Academic Year</div>
          <div className="text-2xl font-bold text-amber-600">{student?.academic_year_name || student?.academic_year || '--'}</div>
        </div>
      </div>

      {/* Student Routine Section */}
      <Card className="rounded-[1rem] border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Student Routine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-0">
          <StudentRoutine />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Performance Chart */}
        <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <CalendarCheck className="w-5 h-5 text-blue-500" />
              Attendance Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudentAttendanceChart records={attendanceRecords} />
          </CardContent>
        </Card>

        {/* Exam Performance Chart */}
        <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
              Exam Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudentExamChart exams={exams} />
          </CardContent>
        </Card>
      </div>

      {/* Announcements & Events */}
      <div className="p-8 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="w-6 h-6 text-blue-500" />
          <h3 className="text-2xl font-bold">Announcements & Events</h3>
        </div>
        <AnnouncementDashboard
          userRole="student"
          userId={student?.user_id}
          canManage={false}
        />
      </div>

      <div className="p-4 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm overflow-hidden">
        <h3 className="font-bold text-xl px-4 py-2 flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-blue-500" />
          Attendance Calendar
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-300">
          <StudentAttendanceCalendar />
        </div>
      </div>
    </div>
  );
}
