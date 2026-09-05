import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, GraduationCap, DollarSign, Activity, Calendar as CalendarIcon, TrendingUp, TrendingDown, Zap, Megaphone } from 'lucide-react';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import UpcomingActivities from '@/components/announcements/UpcomingActivities';
import API from '@/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const DARK_GRAY = '#1f2937';
const LIGHT_GRAY = '#9ca3af';

const STATUS_COLORS = {
  present: '#10b981', // Green
  absent: '#ef4444',  // Red
  late: '#f59e0b',    // Amber
  excused: '#3b82f6', // Blue
  leave: '#3b82f6'    // Blue
};

const getStatusColorByName = (name) => {
  if (!name) return '#6b7280';
  const key = String(name).toLowerCase().trim();
  return STATUS_COLORS[key] || '#3b82f6';
};

const CustomTooltip = ({ active, payload, label, title, subtitle }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        {title && <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">{title}</p>}
        {label && <p className="text-sm font-bold text-white mb-2">{label}</p>}
        {subtitle && <p className="text-xs font-semibold text-slate-300 mb-2">{subtitle}</p>}
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color || entry.fill || getStatusColorByName(entry.name) }}
              />
              <p className="text-xs font-medium text-slate-200">
                <span className="capitalize">{entry.name}</span>: <span className="text-white font-bold">{entry.value}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [data, setData] = useState({
    summary: { totalStudents: 0, totalTeachers: 0, feesCollectedYear: 0, boysAdmission: 0, girlsAdmission: 0, trends: {} },
    financeData: [],
    attendanceData: [],
    classData: []
  });
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Filter States
  const [financeFilter, setFinanceFilter] = useState('monthly');
  const [financeMonth, setFinanceMonth] = useState('all');
  const [admissionYear, setAdmissionYear] = useState('');
  const [admissionGradeId, setAdmissionGradeId] = useState('all');
  const [attendanceClassId, setAttendanceClassId] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [gradesRes, classesRes, academicYearsRes] = await Promise.all([
          API.get('/admin/get/grades'),
          API.get('/admin/get/classes'),
          API.get('/admin/get/academic-years')
        ]);
        setGrades(gradesRes.data.grades || []);
        setClasses(classesRes.data.classes || []);
        const years = academicYearsRes.data.academic_years || [];
        setAcademicYears(years);

        // Default to active year if available
        const activeYear = years.find(y => y.status === 'active') || years[0];
        if (activeYear) {
          setAdmissionYear(activeYear.id.toString());
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const params = new URLSearchParams({
          financeFilter,
          financeMonth: financeMonth === "all" ? "" : financeMonth,
          academicYear: admissionYear,
          admissionGradeId: admissionGradeId === "all" ? "" : admissionGradeId,
          attendanceClassId: attendanceClassId === "all" ? "" : attendanceClassId
        });
        const response = await API.get(`/analytics/dashboard?${params.toString()}`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [financeFilter, financeMonth, admissionYear, admissionGradeId, attendanceClassId]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 min-h-screen">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-52 rounded-xl" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-xl border space-y-4">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie Chart */}
          <div className="p-2 rounded-xl border space-y-6">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="flex justify-center">
              <Skeleton className="h-64 w-64 rounded-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-xl" />
              ))}
            </div>
          </div>

          {/* Admission */}
          <div className="p-2 rounded-xl border space-y-6">
            <Skeleton className="h-6 w-40 rounded-lg" />

            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>

            <Skeleton className="h-4 w-32 rounded-lg" />

            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Charts */}
        <div className="space-y-6">
          <div className="p-2 rounded-xl border">
            <Skeleton className="h-6 w-48 mb-6 rounded-lg" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>

          <div className="p-2 rounded-xl border">
            <Skeleton className="h-6 w-48 mb-6 rounded-lg" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>

      </div>
    );
  }

  const stats = [
    { label: 'Total Students', value: data.summary.totalStudents, icon: GraduationCap, color: 'text-blue-400', bg: 'bg-blue-400/10', trend: data.summary.trends?.students || '+0%' },
    { label: 'Total Teachers', value: data.summary.totalTeachers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10', trend: data.summary.trends?.teachers || '+0%' },
    { label: 'Fees Collected', value: `₹${(data.summary.feesCollectedYear || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10', trend: data.summary.trends?.fees || '+0%' },
    { label: 'Today\'s Attendance', value: `${data.attendanceData.find(a => a.name === 'present')?.value || 0}`, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10', trend: data.summary.trends?.attendance || '0%' },
  ];

  const selectedAttendanceClassName = attendanceClassId === 'all'
    ? 'All Classes'
    : classes.find(c => c.id.toString() === attendanceClassId)?.name || 'Class';

  return (
    <div className="p-2 sm:p-4 md:p-6 pb-28 sm:pb-12 space-y-4 sm:space-y-6 min-h-screen animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">System Overview</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
            Live analytics and school management metrics.
          </p>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border dark:border-gray-800 shadow-sm text-xs sm:text-sm self-start sm:self-auto">
          <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => {
          const isNegative = typeof stat.trend === 'string' && stat.trend.startsWith('-');
          const isPositive = typeof stat.trend === 'string' && stat.trend.startsWith('+');
          const TrendIconComponent = isNegative ? TrendingDown : TrendingUp;
          const trendColorClass = isNegative
            ? 'text-rose-500 bg-rose-500/10'
            : isPositive
            ? 'text-emerald-500 bg-emerald-500/10'
            : 'text-gray-400 bg-gray-500/10';

          return (
            <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md relative overflow-hidden group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => stat.label === "Total Students" ? navigate("/school/students/list") : stat.label === "Total Teachers" ? navigate("/school/teachers/list") : stat.label === "Fees Collected" ? navigate("/school/finance/transactions/list") : navigate("/school/class/attendance")}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</span>
                <div className={`p-2 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-2xl sm:text-3xl font-black">{stat.value}</h3>
                {stat.trend && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${trendColorClass}`}>
                    <TrendIconComponent className="w-3 h-3 shrink-0" />
                    <span>{stat.trend}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            {/* Attendance Donut Chart */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Attendance Log</h3>
                <Select
                  value={attendanceClassId}
                  onValueChange={(value) => {
                    setAttendanceClassId(value);
                  }}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 border-none">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="h-60 sm:h-72 w-full flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.attendanceData.length > 0 ? data.attendanceData : [{ name: 'N/A', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.attendanceData.length > 0 ? data.attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getStatusColorByName(entry.name)} />
                      )) : <Cell fill="#374151" />}
                    </Pie>
                    <Tooltip content={<CustomTooltip title="Attendance" subtitle={selectedAttendanceClassName} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl sm:text-3xl font-black">
                    {data.attendanceData.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Logs</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {data.attendanceData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-2.5 py-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getStatusColorByName(entry.name) }}></div>
                    <span className="text-xs font-semibold capitalize text-gray-700 dark:text-gray-300 truncate">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admission Stats / Command Center */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md overflow-hidden relative flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 relative z-10">
                  <h3 className="text-lg font-bold">Admissions</h3>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={admissionYear}
                      onValueChange={(value) => {
                        setAdmissionYear(value);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 border-none">
                        <SelectValue placeholder="Academic Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((year) => (
                          <SelectItem key={year.id} value={year.id.toString()}>
                            {year.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={admissionGradeId}
                      onValueChange={(value) => {
                        setAdmissionGradeId(value);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 border-none">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grades</SelectItem>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id.toString()}>
                            {grade.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Boys</span>
                    <span className="text-2xl sm:text-3xl font-black text-blue-500">{data.summary.boysAdmission}</span>
                  </div>
                  <div className="bg-pink-500/10 border border-pink-500/20 p-3 rounded-2xl flex flex-col items-center">
                    <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Girls</span>
                    <span className="text-2xl sm:text-3xl font-black text-pink-500">{data.summary.girlsAdmission}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold mb-2 relative z-10 text-gray-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-2 relative z-10">
                  <button onClick={() => navigate("/school/students/list")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 group">
                    <Users className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Students</span>
                  </button>
                  <button onClick={() => navigate("/school/teachers/list")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 group">
                    <GraduationCap className="w-4 h-4 text-purple-600 mb-1" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Teachers</span>
                  </button>
                  <button onClick={() => navigate("/school/class/attendance")} className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all border border-gray-200 dark:border-gray-700 group">
                    <Activity className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Attendance</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Finance Area Chart */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold">Financial Growth</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={financeMonth}
                    onChange={(e) => setFinanceMonth(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 text-xs font-semibold border-none rounded-xl px-2.5 py-1 text-gray-800 dark:text-gray-300 outline-none"
                  >
                    <option value="all">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    value={financeFilter}
                    onChange={(e) => setFinanceFilter(e.target.value.toLowerCase())}
                    className="bg-gray-100 dark:bg-gray-800 text-xs font-semibold border-none rounded-xl px-2.5 py-1 text-gray-800 dark:text-gray-300 outline-none"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="h-56 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.financeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorFinance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: LIGHT_GRAY, fontSize: 10 }} dy={5} interval="preserveStartEnd" minTickGap={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: LIGHT_GRAY, fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip title="Finance" />} />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFinance)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Capacity Breakdown Bar Chart */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-6">Capacity Breakdown</h3>
              <div className="w-full overflow-x-auto scrollbar-none pb-1">
                <div className="min-w-[500px] sm:min-w-full h-56 sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.classData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: LIGHT_GRAY, fontSize: 9, fontWeight: 600 }}
                        dy={6}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        tickFormatter={(val) => typeof val === 'string' ? val.replace(/^Class\s+/i, '') : val}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: LIGHT_GRAY, fontSize: 10 }} />
                      <Tooltip cursor={{ fill: '#1f2937', opacity: 0.4 }} content={<CustomTooltip title="Class Capacity" />} />
                      <Bar dataKey="students" fill="#818cf8" radius={[6, 6, 0, 0]} barSize={28}>
                        {data.classData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} opacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Calendar, Notices & Events */}
        <div className="w-full">
          <UpcomingActivities />
        </div>

      </div>
    </div>
  );
}