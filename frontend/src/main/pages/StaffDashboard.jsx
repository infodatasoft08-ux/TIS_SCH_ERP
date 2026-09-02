import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Mail,
    Briefcase,
    IdCard,
    GraduationCap,
    Calendar,
    UserCheck,
    CalendarCheck,
    Megaphone,
    RefreshCw,
    Clock,
    AlertCircle,
    FileText,
    HelpCircle,
    CheckCircle,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import AnnouncementDashboard from "@/components/announcements/AnnouncementDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeAttendanceCalendar from "@/widgets/employeeAttendanceCalendar";
import GlowingAlertBanner from "@/components/common/GlowingAlertBanner";

export default function StaffDashboard() {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [staffInfo, setStaffInfo] = useState(null);
    const [personalAttendance, setPersonalAttendance] = useState(null);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        setLoading(true);
        try {
            // Fetch personal attendance
            const attendancePromise = API.get("/analytics/personal/attendance")
                .then(res => res.data)
                .catch(err => {
                    console.error("Failed to load personal attendance analytics", err);
                    return null;
                });

            // Fetch staff details
            const staffPromise = API.get("/staffUser/get/staff_id")
                .then(res => res.data?.staffa || null)
                .catch(err => {
                    console.error("Failed to load staff profile details", err);
                    return null;
                });

            const [attendanceData, staffData] = await Promise.all([
                attendancePromise,
                staffPromise
            ]);

            setPersonalAttendance(attendanceData);
            setStaffInfo(staffData);
        } catch (err) {
            console.error("Failed to load staff dashboard data", err);
            toast.error("Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    }

    // Format hire date nicely
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    // Helper to determine score color
    const getScoreColorClass = (score) => {
        const numScore = parseFloat(score || 0);
        if (numScore >= 90) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
        if (numScore >= 75) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
    };

    // Use staff info or fallback to auth user info
    const displayName = staffInfo?.user_name || authUser?.name || "Staff Member";
    const displayEmail = staffInfo?.user_email || authUser?.email || "N/A";
    const displayRole = staffInfo?.sub_role || authUser?.sub_role || "Staff";
    const displayAvatar = staffInfo?.user_avatar_url || authUser?.avatar_url;

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                {/* Header Loading */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64 rounded-xl" />
                        <Skeleton className="h-4 w-96 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-28 rounded-lg" />
                </div>

                {/* Profile Card Loading */}
                <div className="p-6 rounded-[2rem] border space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-3 w-full md:w-auto flex-1">
                            <Skeleton className="h-6 w-48 rounded" />
                            <Skeleton className="h-4 w-64 rounded" />
                            <Skeleton className="h-4 w-32 rounded" />
                        </div>
                    </div>
                </div>

                {/* Stats Loading */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="p-6 rounded-xl border space-y-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>

                {/* Quick Actions Loading */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6 rounded-xl border space-y-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-36" />
                        </div>
                    ))}
                </div>

                {/* Notices Section Loading */}
                <div className="p-6 rounded-[2rem] border shadow-xl space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>

                {/* Calendar Loading */}
                <div className="p-6 rounded-[2rem] border shadow-xl space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <GlowingAlertBanner userRole="staff" />
            {/* Dashboard Title & Quick Refresh */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        Dashboard
                        <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Welcome back, {displayName}! Manage your duties, track attendance, and view notice boards.
                    </p>
                </div>
                <div>
                    <Button
                        variant="outline"
                        onClick={loadDashboardData}
                        className="rounded-xl border-gray-200 hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Profile Card & Detailed Information */}
            <Card className="rounded-[2rem] border-none shadow-md overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-slate-800/40">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar / Image */}
                        <div className="relative group">
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={displayName}
                                    className="w-28 h-28 rounded-2xl object-cover shadow-md border-4 border-white dark:border-slate-800 group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md border-4 border-white dark:border-slate-800">
                                    {displayName.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 capitalize shadow-sm text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                                Employee
                            </Badge>
                        </div>

                        {/* Profile Grid Info */}
                        <div className="flex-1 space-y-4 text-center md:text-left w-full">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-4 h-4 text-indigo-500" />
                                        {displayEmail}
                                    </span>
                                    {staffInfo?.employee_code && (
                                        <span className="flex items-center gap-1 border-l pl-4 border-gray-300 dark:border-gray-700">
                                            <IdCard className="w-4 h-4 text-indigo-500" />
                                            ID: {staffInfo.employee_code}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Bio description if present */}
                            {staffInfo?.bio && (
                                <p className="text-sm italic text-gray-600 dark:text-gray-300 bg-white/40 dark:bg-slate-900/30 p-3 rounded-xl border border-white/20">
                                    "{staffInfo.bio}"
                                </p>
                            )}

                            {/* Grid with metadata details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-sm">
                                <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/20 p-3 rounded-xl border border-white/20">
                                    <Briefcase className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Department</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{staffInfo?.role_name || staffInfo?.department || "General Staff"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/20 p-3 rounded-xl border border-white/20">
                                    <GraduationCap className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Qualification</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{staffInfo?.qualification || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-900/20 p-3 rounded-xl border border-white/20">
                                    <Calendar className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Joining Date</p>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200">{formatDate(staffInfo?.hire_date)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Attendance Score card */}
                <Card className="rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-500">Attendance Score</p>
                                <p className="text-3xl font-extrabold tracking-tight">
                                    {personalAttendance?.overall?.percentage || 0}%
                                </p>
                                <Badge className={`mt-2 border ${getScoreColorClass(personalAttendance?.overall?.percentage)}`}>
                                    {parseFloat(personalAttendance?.overall?.percentage || 0) >= 75 ? "Excellent Status" : "Requires Attention"}
                                </Badge>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                                <UserCheck className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Days Present Card */}
                <Card className="rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-500">Total Present Days</p>
                                <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
                                    {personalAttendance?.overall?.presentDays || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Days worked overall</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Absents Card */}
                <Card className="rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-500">Monthly Absents</p>
                                <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">
                                    {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'absent')?.count || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Days missed this month</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Monthly Late Card */}
                <Card className="rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-500">Monthly Late Entries</p>
                                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                                    {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'late')?.count || 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Late arrivals this month</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
                                <Clock className="h-6 w-6" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card
                    className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-300 rounded-[1.5rem]"
                    onClick={() => navigate("/school/profile")}
                >
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                                <User className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-100">My Profile Details</p>
                                <p className="text-xs text-gray-500">View & modify profile information</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-300 rounded-[1.5rem]"
                    onClick={() => navigate("/school/announcement/list")}
                >
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                <Megaphone className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-100">Notices Noticeboard</p>
                                <p className="text-xs text-gray-500">View upcoming school news & events</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-300 rounded-[1.5rem]"
                    onClick={() => navigate("/school/support")}
                >
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
                                <HelpCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 dark:text-gray-100">Help & Support</p>
                                <p className="text-xs text-gray-500">Open ticket or contact helpdesk</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notices & Events Noticeboard Panel */}
            <Card className="rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900/50">
                <CardHeader className="border-b border-gray-100 dark:border-slate-800/80 pb-4">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                        <Megaphone className="w-6 h-6 text-indigo-500" />
                        Notices & Events
                    </CardTitle>
                    <CardDescription>
                        Keep track of official school circulars and registered school events.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <AnnouncementDashboard userRole="staff" canManage={false} />
                </CardContent>
            </Card>

            {/* Attendance History Calendar Section */}
            <Card className="rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900/50">
                <CardHeader className="border-b border-gray-100 dark:border-slate-800/80 pb-4">
                    <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900 dark:text-white">
                        <CalendarCheck className="w-6 h-6 text-indigo-500" />
                        My Attendance Calendar
                    </CardTitle>
                    <CardDescription>
                        Review details of your monthly attendance shifts, late arrivals, and absent records.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="overflow-hidden rounded-[2rem] border border-gray-100 dark:border-slate-800 p-2 md:p-6 bg-slate-50/50 dark:bg-slate-950/20">
                        <EmployeeAttendanceCalendar />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
