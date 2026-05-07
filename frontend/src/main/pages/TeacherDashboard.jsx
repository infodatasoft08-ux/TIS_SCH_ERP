import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StudentAttendanceSummeryCalendar from '@/widgets/studentAttendaceSummeryCalender';
import React, { useEffect, useState } from 'react';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { Megaphone, Calendar as CalendarIcon, Users, BookOpen, BarChart3, TrendingUp, UserCheck, PieChart, CalendarCheck } from "lucide-react";
import { TeacherClassAttendanceChart, TeacherClassPerformanceChart } from './components/DashboardCharts';
import TeacherRoutine from '@/teacher/features/TeacherTimeTablePage';
import { Skeleton } from '@/components/ui/skeleton';
import EmployeeAttendanceCalendar from '@/widgets/employeeAttendanceCalendar';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [examTrends, setExamTrends] = useState([]);
  const [personalAttendance, setPersonalAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [teacherRes, classRes, studentRes, subjectsRes, attendTrendsRes, examTrendsRes, personalRes] = await Promise.all([
        API.get("/teachers/get/teacher/me"),
        API.get("/teachers/get/teacher/my/supervised-class"),
        API.get("/teachers/get/teacher/my/supervised-class/students"),
        API.get("/teachers/get/teacher/subjects"),
        API.get("/attendance/supervised-class/trends"),
        API.get("/exam/supervised-class/trends"),
        API.get("/analytics/personal/attendance")
      ]);

      console.log(teacherRes.data.teacher[0]);

      setTeacher(teacherRes.data.teacher[0]);
      setClassInfo(classRes.data.class);
      setStudents(studentRes.data.students);
      setSubjectsCount(subjectsRes.data.subjects?.length || 0);
      setAttendanceTrends(attendTrendsRes.data.trends || []);
      setExamTrends(examTrendsRes.data.trends || []);
      setPersonalAttendance(personalRes.data);
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-2 md:p-4 lg:p-6">

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
        <div className="p-2 rounded-[1rem] border shadow-xl space-y-4">
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
    <div className="p-2 md:p-4 lg:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Teacher Dashboard</h2>
          <p className="text-gray-500">Managing {classInfo?.name || 'Class'}</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Teacher Info */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-blue-50 dark:bg-blue-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Teacher Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{teacher?.user_name || teacher?.name}</p>
            <p className="text-sm text-blue-500/80">{teacher?.user_email || teacher?.email}</p>
          </CardContent>
        </Card>

        {/* Subjects Info */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-emerald-50 dark:bg-emerald-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Assigned Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-300">{subjectsCount}</p>
            <p className="text-sm text-emerald-500/80 mt-1">Total Subjects Assigned</p>
          </CardContent>
        </Card>

        {/* Students Info */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-amber-50 dark:bg-amber-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Supervised Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-extrabold text-amber-700 dark:text-amber-300">{students.length}</p>
              <p className="text-base font-bold text-amber-600/80">Students</p>
            </div>
            <p className="text-sm text-amber-500/80 mt-1">{classInfo?.name || 'No Class Assigned'}</p>
          </CardContent>
        </Card>

        {/* My Attendance Analytics */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/20 md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              My Attendance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.percentage || 0}%</p>
                <p className="text-xs font-semibold text-indigo-600/70 uppercase">Overall Attendance</p>
              </div>
              <div className="space-y-1 border-l pl-6 border-indigo-200/50">
                <p className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.presentDays || 0}</p>
                <p className="text-xs font-semibold text-indigo-600/70 uppercase">Days Present</p>
              </div>
              <div className="space-y-1 border-l pl-6 border-indigo-200/50">
                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                  {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'absent')?.count || 0}
                </p>
                <p className="text-xs font-semibold text-red-500/70 uppercase">Absents (This Month)</p>
              </div>
              <div className="space-y-1 border-l pl-6 border-indigo-200/50">
                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'late')?.count || 0}
                </p>
                <p className="text-xs font-semibold text-amber-500/70 uppercase">Lates (This Month)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Routine Section */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            Teacher Routine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherRoutine />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Attendance Trend Chart */}
        <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Class Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherClassAttendanceChart data={attendanceTrends} />
          </CardContent>
        </Card>

        {/* Class Performance Trend Chart */}
        <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              Class Exam Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TeacherClassPerformanceChart trends={examTrends} />
          </CardContent>
        </Card>
      </div>

      {/* Announcements Section */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="w-6 h-6 text-blue-500" />
            Notices & Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementDashboard userRole="teacher" canManage={false} />
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        <StudentAttendanceSummeryCalendar />
      </div>

      {/* Personal Attendance History */}
      <div className="p-2 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm overflow-hidden">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-indigo-500" />
          My Attendance History
        </h3>
        <EmployeeAttendanceCalendar />
      </div>
    </div>
  );
}
