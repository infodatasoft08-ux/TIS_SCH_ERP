import React, { useEffect, useMemo, useState } from "react";
import API from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Calendar as CalendarIcon,
  Sparkles,
  TrendingUp,
  Filter,
  User,
  UserCheck,
  Briefcase
} from "lucide-react";

export default function EmployeeAttendanceCalendar() {
  const getCurrentDate = () => new Date().toISOString().split('T')[0];

  const getOneMonthBefore = () => {
    const currentDate = new Date();
    const oneMonthBefore = new Date(currentDate);
    oneMonthBefore.setMonth(currentDate.getMonth() - 1);
    return oneMonthBefore.toISOString().split('T')[0];
  };

  const [events, setEvents] = useState([]);
  const [from, setFrom] = useState(getOneMonthBefore());
  const [to, setTo] = useState(getCurrentDate());
  const [loading, setLoading] = useState(false);
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const { user } = useAuth();

  useEffect(() => {
    loadAttendance();
  }, []);

  async function loadAttendance() {
    setLoading(true);
    try {
      const res = await API.get(
        `/analytics/personal/attendance/history`,
        {
          params: { from, to }
        }
      );

      const records = res.data.records || [];
      setEvents(records);
    } catch (err) {
      console.error("Failed to load employee attendance", err);
    } finally {
      setLoading(false);
    }
  }

  // Create a map of date string YYYY-MM-DD -> record
  const recordsMap = useMemo(() => {
    const map = {};
    if (Array.isArray(events)) {
      events.forEach(record => {
        if (record.attendance_date) {
          const dateKey = record.attendance_date.split('T')[0];
          map[dateKey] = record;
        } else if (record.date) {
          const dateKey = record.date.split('T')[0];
          map[dateKey] = record;
        }
      });
    }
    return map;
  }, [events]);

  // Statistics calculation
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let leave = 0;

    Object.values(recordsMap).forEach(rec => {
      const st = rec.status?.toLowerCase();
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else if (st === 'excused') excused++;
      else if (st === 'leave') leave++;
    });

    const total = present + absent + late + excused + leave;
    const ratio = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    return { present, absent, late, excused, leave, total, ratio };
  }, [recordsMap]);

  // Month Calendar Navigation
  const prevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar Grid Days Calculation
  const calendarGridDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // 0 = Mon, 6 = Sun
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

    const days = [];

    // Trailing days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const dateObj = new Date(year, month - 1, pDay);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({
        dayNumber: pDay,
        dateStr,
        isCurrentMonth: false,
        record: recordsMap[dateStr]
      });
    }

    // Days in current month
    const todayStr = getCurrentDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const yearStr = dateObj.getFullYear();
      const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        record: recordsMap[dateStr]
      });
    }

    // Remaining trailing days for 6-row grid
    const totalSlots = days.length > 35 ? 42 : 35;
    const remainingSlots = totalSlots - days.length;
    for (let n = 1; n <= remainingSlots; n++) {
      const dateObj = new Date(year, month + 1, n);
      const dateStr = dateObj.toISOString().split('T')[0];
      days.push({
        dayNumber: n,
        dateStr,
        isCurrentMonth: false,
        record: recordsMap[dateStr]
      });
    }

    return days;
  }, [viewDate, recordsMap]);

  const monthYearLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const handleCellClick = (dayItem) => {
    if (dayItem.record) {
      setSelectedDayRecord(dayItem.record);
      setIsDialogOpen(true);
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return {
          badgeBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
          border: 'border-emerald-500/30 dark:border-emerald-500/40',
          text: 'text-emerald-700 dark:text-emerald-300',
          dot: 'bg-emerald-500',
          label: 'Present',
          shortLabel: 'P',
          icon: CheckCircle2
        };
      case 'absent':
        return {
          badgeBg: 'bg-rose-500/15 dark:bg-rose-500/25',
          border: 'border-rose-500/30 dark:border-rose-500/40',
          text: 'text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
          label: 'Absent',
          shortLabel: 'A',
          icon: XCircle
        };
      case 'late':
        return {
          badgeBg: 'bg-amber-500/15 dark:bg-amber-500/25',
          border: 'border-amber-500/30 dark:border-amber-500/40',
          text: 'text-amber-700 dark:text-amber-300',
          dot: 'bg-amber-500',
          label: 'Late',
          shortLabel: 'L',
          icon: Clock
        };
      case 'excused':
        return {
          badgeBg: 'bg-sky-500/15 dark:bg-sky-500/25',
          border: 'border-sky-500/30 dark:border-sky-500/40',
          text: 'text-sky-700 dark:text-sky-300',
          dot: 'bg-sky-500',
          label: 'Excused',
          shortLabel: 'E',
          icon: Info
        };
      case 'leave':
        return {
          badgeBg: 'bg-purple-500/15 dark:bg-purple-500/25',
          border: 'border-purple-500/30 dark:border-purple-500/40',
          text: 'text-purple-700 dark:text-purple-300',
          dot: 'bg-purple-500',
          label: 'Leave',
          shortLabel: 'LV',
          icon: Info
        };
      default:
        return null;
    }
  };

  if (loading && events.length === 0) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto p-3 sm:p-6 pb-24">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto p-2 sm:p-6 pb-28 sm:pb-12 animate-in fade-in duration-500 select-none">
      
      {/* Top Header & Staff Attendance Performance Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-indigo-200 mb-2 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Teacher & Staff Portal</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              My Personal Attendance
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-md">
              View your monthly working history, check-in logs, and attendance record.
            </p>
          </div>

          {/* Performance Ratio Gauge */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-200">Attendance Score</div>
              <div className="text-2xl font-black text-white flex items-center gap-1.5">
                {stats.ratio}%
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-emerald-400/40 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-300">
              {stats.present + stats.late}d
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Present */}
        <div className="p-3 sm:p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Present</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">{stats.present} <span className="text-xs font-normal">Days</span></div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Absent */}
        <div className="p-3 sm:p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 dark:border-rose-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400">Absent</div>
            <div className="text-xl sm:text-2xl font-black text-rose-800 dark:text-rose-300 mt-0.5">{stats.absent} <span className="text-xs font-normal">Days</span></div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Late */}
        <div className="p-3 sm:p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">Late</div>
            <div className="text-xl sm:text-2xl font-black text-amber-800 dark:text-amber-300 mt-0.5">{stats.late} <span className="text-xs font-normal">Days</span></div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Excused */}
        <div className="p-3 sm:p-4 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/20 dark:border-sky-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-sky-700 dark:text-sky-400">Excused</div>
            <div className="text-xl sm:text-2xl font-black text-sky-800 dark:text-sky-300 mt-0.5">{stats.excused} <span className="text-xs font-normal">Days</span></div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Info className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        {/* Leave */}
        <div className="p-3 sm:p-4 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 dark:border-purple-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-purple-700 dark:text-purple-400">Leave</div>
            <div className="text-xl sm:text-2xl font-black text-purple-800 dark:text-purple-300 mt-0.5">{stats.leave} <span className="text-xs font-normal">Days</span></div>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-md rounded-2xl sm:rounded-3xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
            <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Select Date Period:</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-xl">
            <div className="flex-1">
              <DatePicker
                value={from}
                onChange={(date) => setFrom(date)}
                placeholder="From Date"
              />
            </div>
            <div className="flex-1">
              <DatePicker
                value={to}
                onChange={(date) => setTo(date)}
                placeholder="To Date"
              />
            </div>
            <Button
              onClick={loadAttendance}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold text-xs rounded-xl px-4 py-2 shadow-md transition-all"
            >
              {loading ? "Loading..." : "Update View"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Calendar Card */}
      <Card className="border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden p-2.5 sm:p-6">
        
        {/* Month Navigation & Horizontal Legend Pills */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-gray-100 dark:border-gray-800">
          
          {/* Month Controller */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </Button>

            <span className="text-sm sm:text-lg font-extrabold text-gray-900 dark:text-white px-1 sm:px-2">
              {monthYearLabel}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>

          {/* Horizontal Legend Pills */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-semibold">
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Excused
            </span>
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" /> Leave
            </span>
          </div>
        </div>

        {/* Days Header Row */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <div key={idx} className="py-1 sm:py-2 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-gray-800/60 rounded-md sm:rounded-xl">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarGridDays.map((dayItem, idx) => {
            const statusConfig = getStatusStyle(dayItem.record?.status);

            return (
              <div
                key={idx}
                onClick={() => handleCellClick(dayItem)}
                className={cn(
                  "min-h-[50px] sm:min-h-[76px] rounded-lg sm:rounded-2xl p-1 sm:p-2 border transition-all flex flex-col justify-between relative overflow-hidden select-none",
                  dayItem.isCurrentMonth
                    ? "bg-gray-50/50 dark:bg-gray-950/40 border-gray-200/70 dark:border-gray-800/80"
                    : "bg-gray-100/30 dark:bg-gray-950/10 border-transparent opacity-40",
                  dayItem.isToday && "ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20",
                  dayItem.record ? "cursor-pointer hover:scale-[1.02] shadow-xs" : "cursor-default"
                )}
              >
                {/* Date Number - High Contrast with Mobile Today Dot */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs sm:text-sm font-extrabold flex items-center justify-center rounded-full transition-all",
                    dayItem.isCurrentMonth
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-400 dark:text-gray-600",
                    dayItem.isToday && "w-5 h-5 sm:w-auto sm:h-auto bg-indigo-600 text-white dark:text-white font-black text-[11px] sm:text-sm sm:bg-transparent sm:text-indigo-600 dark:sm:text-indigo-400"
                  )}>
                    {dayItem.dayNumber}
                  </span>

                  {dayItem.isToday && (
                    <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase tracking-wider">
                      Today
                    </span>
                  )}
                </div>

                {/* Status Indicator Pill */}
                {statusConfig ? (
                  <div className={cn(
                    "mt-1 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all",
                    statusConfig.badgeBg,
                    statusConfig.border,
                    statusConfig.text
                  )}>
                    <statusConfig.icon className="w-3 h-3 shrink-0" />
                    <span className="sm:hidden font-extrabold text-[10px]">{statusConfig.shortLabel}</span>
                    <span className="hidden sm:inline truncate">{statusConfig.label}</span>
                  </div>
                ) : (
                  dayItem.isCurrentMonth && (
                    <div className="text-[9px] text-gray-400 dark:text-gray-600 text-center py-0.5 opacity-0 group-hover:opacity-100">
                      -
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

      </Card>

      {/* Employee Attendance Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Personal Attendance Record</span>
            </DialogTitle>
          </DialogHeader>

          {selectedDayRecord && (() => {
            const statusConfig = getStatusStyle(selectedDayRecord.status);
            return (
              <div className="space-y-4 pt-2">
                
                {/* Status Header Badge */}
                {statusConfig && (
                  <div className={cn(
                    "p-3 rounded-2xl border flex items-center justify-between",
                    statusConfig.badgeBg,
                    statusConfig.border,
                    statusConfig.text
                  )}>
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <statusConfig.icon className="w-5 h-5" />
                      <span>Status: {statusConfig.label}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white/30 dark:bg-black/20">
                      Recorded
                    </span>
                  </div>
                )}

                {/* Details List */}
                <div className="space-y-2.5 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <User className="w-4 h-4 text-indigo-500" /> Staff Member:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedDayRecord.name || user?.name || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <CalendarIcon className="w-4 h-4 text-blue-500" /> Date:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedDayRecord.attendance_date ? new Date(selectedDayRecord.attendance_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                      <UserCheck className="w-4 h-4 text-emerald-500" /> Recorded By:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedDayRecord.recorded_by_name || selectedDayRecord.takenBy || "System"}
                    </span>
                  </div>
                </div>

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

    </div>
  );
}