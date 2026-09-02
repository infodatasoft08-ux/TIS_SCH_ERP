import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '@/api';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { Megaphone, GraduationCap, CalendarCheck, CalendarIcon, ArrowRight, Award, CheckCircle2 } from "lucide-react";
import StudentAttendanceCalendar from '@/student/datatable/pages/studentAttendenceDataTable';
import { StudentAttendanceChart, StudentExamChart } from './components/DashboardCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StudentRoutine from '@/student/features/StudentTimeTable';
import { Skeleton } from '@/components/ui/skeleton';

import GlowingAlertBanner from '@/components/common/GlowingAlertBanner';

export default function StudentDashboard() {
  const navigate = useNavigate();
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

  const getExamSummary = (exam) => {
    const subjects = exam.subjects || [];
    let obtained = 0;
    let max = 0;
    let count = 0;

    subjects.forEach(sub => {
      if (sub.marks_obtained !== null && sub.marks_obtained !== undefined) {
        const obt = Number(sub.marks_obtained);
        if (!isNaN(obt)) {
          let maxm = (Number(sub.theory_max_marks) || 0) +
            (Number(sub.lab_max_marks) || 0) +
            (Number(sub.oral_max_marks) || 0) +
            (Number(sub.written_max_marks) || 0) +
            (Number(sub.reading_max_marks) || 0) +
            (Number(sub.writing_comp_max_marks) || 0) +
            (Number(sub.dictation_max_marks) || 0) +
            (Number(sub.recitation_max_marks) || 0) +
            (Number(sub.ia_pr_max_marks) || 0);

          if (maxm <= 0) maxm = 100;
          obtained += obt;
          max += maxm;
          count++;
        }
      }
    });

    const pct = max > 0 ? Number(((obtained / max) * 100).toFixed(1)) : null;
    return {
      obtained,
      max,
      pct,
      count,
      isPublished: Boolean(exam.is_results_published)
    };
  };

  if (loading) {
    return (
      <div className="space-y-6 p-2 sm:p-4 md:p-6 lg:p-8">

        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-2xl border space-y-3">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 p-2 sm:p-4 md:p-6 lg:p-8">
      <GlowingAlertBanner userRole="student" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          {/* <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">Dashboard</h2> */}
          <p className="text-xs sm:text-sm text-gray-500">Welcome back, {student?.user_name || 'Student'}</p>
        </div>
      </div>

      {/* 3-Column Top Metrics Row for Mobile & Desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-6">
        <div className="p-2.5 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm transition-all hover:shadow-md text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">My Class</div>
          <div className="text-sm sm:text-2xl font-black text-blue-600 truncate">{student?.class_name || '--'}</div>
        </div>
        <div className="p-2.5 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm transition-all hover:shadow-md text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Roll No</div>
          <div className="text-sm sm:text-2xl font-black text-emerald-600 truncate">{student?.roll_no || '--'}</div>
        </div>
        <div className="p-2.5 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm transition-all hover:shadow-md text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Academic Year</div>
          <div className="text-xs sm:text-2xl font-black text-amber-600 truncate">{student?.academic_year_name || student?.academic_year || '--'}</div>
        </div>
      </div>

      {/* Student Routine Section */}
      <Card className="rounded-2xl border-none shadow-xl bg-gray-50 dark:bg-gray-900/50 p-1 sm:p-2">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-2">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-2xl font-bold">
            <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
            Student Routine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
          <StudentRoutine />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Attendance Performance Chart */}
        <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
          <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Attendance Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <StudentAttendanceChart records={attendanceRecords} />
          </CardContent>
        </Card>

        {/* Exam Performance Chart & Breakdown (Mobile Hardened) */}
        <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden flex flex-col justify-between">
          <div>
            <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2 flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-xl font-bold">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />
                <span>Exam Performance</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] sm:text-xs text-emerald-600 hover:text-emerald-700 font-bold gap-1 p-0 h-auto shrink-0"
                onClick={() => navigate('/school/exam/exams_student')}
              >
                All Routines & Marks <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
              <StudentExamChart exams={exams} />

              {/* Exam Breakdown List */}
              {exams && exams.length > 0 && (
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <div className="text-[11px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Recent Exam Results Overview
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {exams.map((ex) => {
                      const summary = getExamSummary(ex);
                      return (
                        <div
                          key={ex.id}
                          className="flex items-center justify-between p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl hover:bg-gray-100/80 transition-colors gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="p-1 sm:p-1.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg shrink-0">
                              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                {ex.custom_exam_name || ex.name}
                              </div>
                              <div className="text-[9px] sm:text-[10px] text-gray-400 truncate">
                                {ex.academic_year_name || 'Academic Session'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {summary.isPublished && summary.pct !== null ? (
                              <div className="text-right">
                                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                  {summary.pct}%
                                </div>
                                <div className="text-[9px] sm:text-[10px] text-gray-400">
                                  {summary.obtained}/{summary.max}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[9px] sm:text-[10px] text-amber-600 border-amber-300 px-1.5 py-0.5">
                                {ex.status || 'Published'}
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 sm:h-7 text-[10px] sm:text-[11px] px-2 rounded-lg border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 shrink-0"
                              onClick={() => navigate('/school/exam/exams_student')}
                            >
                              Check
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Announcements & Events */}
      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          <h3 className="text-xl sm:text-2xl font-bold">Announcements & Events</h3>
        </div>
        <AnnouncementDashboard
          userRole="student"
          userId={student?.user_id}
          canManage={false}
        />
      </div>

      <div className="p-3 sm:p-4 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm overflow-hidden">
        <h3 className="font-bold text-lg sm:text-xl px-2 py-1 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          Attendance Calendar
        </h3>
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-300">
          <StudentAttendanceCalendar />
        </div>
      </div>
    </div>
  );
}
