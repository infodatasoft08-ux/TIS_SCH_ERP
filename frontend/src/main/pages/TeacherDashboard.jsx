import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StudentAttendanceSummeryCalendar from '@/widgets/studentAttendaceSummeryCalender';
import React, { useEffect, useState } from 'react';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { Megaphone, Calendar as CalendarIcon, Users, BookOpen, BarChart3, TrendingUp, UserCheck, CalendarCheck, ShieldCheck } from "lucide-react";
import { TeacherClassAttendanceChart, TeacherClassPerformanceChart } from './components/DashboardCharts';
import TeacherRoutine from '@/teacher/features/TeacherTimeTablePage';
import { Skeleton } from '@/components/ui/skeleton';
import EmployeeAttendanceCalendar from '@/widgets/employeeAttendanceCalendar';
import GlowingAlertBanner from '@/components/common/GlowingAlertBanner';
import ClassTopRankersCard from '@/teacher/components/ClassTopRankersCard';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
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
        API.get("/teachers/get/teacher/me").catch(e => ({ data: {} })),
        API.get("/teachers/get/teacher/my/supervised-class").catch(e => ({ data: {} })),
        API.get("/teachers/get/teacher/my/supervised-class/students").catch(e => ({ data: {} })),
        API.get("/teachers/get/teacher/subjects").catch(e => ({ data: {} })),
        API.get("/attendance/supervised-class/trends").catch(e => ({ data: {} })),
        API.get("/exam/supervised-class/trends").catch(e => ({ data: {} })),
        API.get("/analytics/personal/attendance").catch(e => ({ data: {} }))
      ]);

      const teacherObj = (teacherRes.data?.teacher && teacherRes.data.teacher[0]) || teacherRes.data?.teacher || null;
      setTeacher(teacherObj);

      // Parse supervised class carefully from classRes or studentRes fallback
      const supClass = classRes.data?.class ||
        (classRes.data?.classes && classRes.data.classes[0]) ||
        studentRes.data?.class ||
        (examTrendsRes.data?.class_name ? { name: examTrendsRes.data.class_name } : null);

      setClassInfo(supClass);
      setStudents(studentRes.data?.students || []);

      const subList = subjectsRes.data?.subjects || [];
      setAssignedSubjects(subList);
      setSubjectsCount(subList.length);

      setAttendanceTrends(attendTrendsRes.data?.trends || []);
      setExamTrends(examTrendsRes.data?.trends || []);
      setPersonalAttendance(personalRes.data || null);
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 sm:p-6 rounded-2xl border space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          ))}
        </div>

        {/* Routine Section */}
        <div className="p-4 rounded-2xl border shadow-xl space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-4 sm:p-6 rounded-2xl border space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-48 sm:h-56 w-full rounded-xl" />
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-48 sm:h-56 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <GlowingAlertBanner userRole="teacher" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Teacher Dashboard</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Supervised Class: </span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{classInfo?.name ? classInfo.name : 'No Class Assigned'}</span>
          </p>
        </div>
      </div>

      {/* Top 3 Profile & Assignment Cards */}
      <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        {/* Teacher Info */}
        <Card className="rounded-2xl border-none shadow-sm bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Teacher Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-xl sm:text-2xl font-bold truncate">{teacher?.user_name || teacher?.name || 'Teacher'}</p>
            <p className="text-xs text-blue-500/80 truncate">{teacher?.user_email || teacher?.email || 'N/A'}</p>
            {teacher?.qualification && (
              <Badge variant="outline" className="text-[10px] bg-blue-100/50 border-blue-200 text-blue-700 mt-1">
                {teacher.qualification}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Subjects Info */}
        <Card className="rounded-2xl border-none shadow-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 sm:p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Assigned Subjects ({subjectsCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {assignedSubjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {assignedSubjects.map((sub) => (
                  <Badge key={sub.id} className="text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm px-2 py-0.5">
                    {sub.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{subjectsCount}</p>
                <p className="text-xs text-emerald-500/80 mt-1">No subjects assigned yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supervised Class Info */}
        <Card className="rounded-2xl border-none shadow-sm bg-amber-50 dark:bg-amber-900/20 p-3 sm:p-4 flex flex-col justify-between">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Supervised Class
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-xl sm:text-2xl font-extrabold text-amber-800 dark:text-amber-200 truncate">
              {classInfo?.name ? classInfo.name : 'No Supervised Class'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-amber-700 dark:text-amber-300">{students.length}</span>
              <span className="text-xs font-semibold text-amber-600/80">Enrolled Students</span>
            </div>
          </CardContent>
        </Card>

        {/* My Attendance Analytics */}
        {/* <Card className="rounded-2xl border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/20 sm:col-span-3 p-3 sm:p-4">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              My Attendance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
              <div className="space-y-0.5">
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.percentage || 0}%</p>
                <p className="text-[10px] sm:text-xs font-semibold text-indigo-600/70 uppercase">Overall</p>
              </div>
              <div className="space-y-0.5 border-l border-indigo-200/60 pl-3 sm:pl-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.presentDays || 0}</p>
                <p className="text-[10px] sm:text-xs font-semibold text-indigo-600/70 uppercase">Days Present</p>
              </div>
              <div className="space-y-0.5 border-l border-indigo-200/60 pl-3 sm:pl-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400">
                  {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'absent')?.count || 0}
                </p>
                <p className="text-[10px] sm:text-xs font-semibold text-red-500/70 uppercase">Absents (Month)</p>
              </div>
              <div className="space-y-0.5 border-l border-indigo-200/60 pl-3 sm:pl-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                  {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'late')?.count || 0}
                </p>
                <p className="text-[10px] sm:text-xs font-semibold text-amber-500/70 uppercase">Lates (Month)</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Teacher Routine Section */}
      <Card className="rounded-2xl border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-2 sm:p-3">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl font-bold">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            Teacher Routine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <TeacherRoutine />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Class Attendance Trend Chart */}
        <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="p-3 sm:p-6 pb-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Class Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <TeacherClassAttendanceChart data={attendanceTrends} />
          </CardContent>
        </Card>

        {/* Class Performance Trend Chart */}
        <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="p-3 sm:p-6 pb-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              Class Exam Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <TeacherClassPerformanceChart trends={examTrends} />
          </CardContent>
        </Card>
      </div>

      {/* Supervised Class Top Rankers & Exam Performance Card */}
      <ClassTopRankersCard examTrends={examTrends} className={classInfo?.name} />

      {/* Announcements Section */}
      <Card className="rounded-2xl border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-2 sm:p-3">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl font-bold">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            Notices & Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <AnnouncementDashboard userRole="teacher" canManage={false} />
        </CardContent>
      </Card>

      <div className="text-xs sm:text-sm text-gray-500">
        <StudentAttendanceSummeryCalendar />
      </div>

      {/* Personal Attendance History */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm overflow-hidden">
        <h3 className="font-bold text-lg sm:text-xl mb-4 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
          My Attendance History
        </h3>
        <EmployeeAttendanceCalendar />
      </div>
    </div>
  );
}
