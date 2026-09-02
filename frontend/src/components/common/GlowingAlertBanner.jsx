import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Calendar, GraduationCap, ChevronLeft, ChevronRight, X, Bell, CreditCard, ArrowRight, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import API from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const safeFormatDate = (dateStr, fmtStr = 'dd MMM yyyy') => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return format(d, fmtStr);
    } catch (e) {
        return '';
    }
};

export default function GlowingAlertBanner({ userRole = 'student' }) {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const saved = sessionStorage.getItem('dismissed_alert_ids');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        fetchAlerts();
    }, [userRole]);

    // Timer & Progress bar control for automatic sliding
    useEffect(() => {
        if (!alerts || alerts.length <= 1) {
            setProgress(100);
            return;
        }

        setProgress(0);
        const startTime = Date.now();
        const DURATION = 6000; // 6 seconds

        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / DURATION) * 100);
            setProgress(pct);

            if (elapsed >= DURATION) {
                setCurrentIndex(prev => (prev + 1) % alerts.length);
            }
        }, 50);

        return () => clearInterval(progressInterval);
    }, [alerts, currentIndex]);

    const fetchAlerts = async () => {
        try {
            const response = await API.get('/announcement/notifications/today');
            const list = response.data?.notifications || [];

            const now = new Date();
            const valid = list.filter(item => {
                if (!item || !item.id) return false;

                // Check local session dismissal
                if (dismissedIds.includes(`${item.type}_${item.id}`)) return false;

                // Check expire_at
                if (item.expire_at) {
                    try {
                        const expireDate = new Date(item.expire_at);
                        if (!isNaN(expireDate.getTime()) && expireDate < now) return false;
                    } catch (e) {}
                }
                return true;
            });

            setAlerts(valid);
        } catch (error) {
            console.error("Error fetching alert notifications:", error);
        }
    };

    const handleDismiss = (item) => {
        if (!item) return;
        const key = `${item.type}_${item.id}`;
        const newDismissed = [...dismissedIds, key];
        setDismissedIds(newDismissed);
        try {
            sessionStorage.setItem('dismissed_alert_ids', JSON.stringify(newDismissed));
        } catch (e) {
            console.error(e);
        }

        const remaining = alerts.filter(a => `${a.type}_${a.id}` !== key);
        setAlerts(remaining);
        if (currentIndex >= remaining.length && remaining.length > 0) {
            setCurrentIndex(0);
        }
    };

    const handleActionClick = (item) => {
        if (!item) return;
        if (item.type === 'fee_due') {
            navigate('/school/students/fees');
        } else if (item.type === 'exam') {
            navigate('/school/exam/exams_student');
        } else {
            const el = document.getElementById('announcements-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            } else {
                navigate('/school/announcement/list');
            }
        }
    };

    if (!alerts || alerts.length === 0) return null;

    const currentAlert = alerts[currentIndex % alerts.length];
    if (!currentAlert) return null;

    const getAlertIcon = (type) => {
        switch (type) {
            case 'notice':
                return <Megaphone className="h-4 sm:h-5 w-4 sm:w-5 text-amber-600 dark:text-amber-400 shrink-0" />;
            case 'event':
                return <Calendar className="h-4 sm:h-5 w-4 sm:w-5 text-purple-600 dark:text-purple-400 shrink-0" />;
            case 'exam':
                return <GraduationCap className="h-4 sm:h-5 w-4 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
            case 'fee_due':
                return <CreditCard className="h-4 sm:h-5 w-4 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0" />;
            default:
                return <Bell className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600 dark:text-blue-400 shrink-0" />;
        }
    };

    const getBadge = (type, item) => {
        if (type === 'fee_due') {
            const isOverdue = item?.fee_status === 'overdue';
            return (
                <Badge className={cn(
                    "text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-2.5 py-0.5 border-none shadow-sm",
                    isOverdue ? "bg-gradient-to-r from-red-600 to-rose-700" : "bg-gradient-to-r from-amber-600 to-rose-600"
                )}>
                    {isOverdue ? "🚨 OVERDUE FEE" : "💳 FEE PENDING"}
                </Badge>
            );
        }
        if (type === 'notice') {
            return (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-2.5 py-0.5 border-none shadow-sm">
                    📢 NOTICE
                </Badge>
            );
        }
        if (type === 'event') {
            return (
                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-2.5 py-0.5 border-none shadow-sm">
                    ⚡ UPCOMING EVENT
                </Badge>
            );
        }
        if (type === 'exam') {
            const isResults = item?.is_results_published;
            return (
                <Badge className={cn(
                    "text-white font-bold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 sm:px-2.5 py-0.5 border-none shadow-sm",
                    isResults ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-blue-500 to-cyan-600"
                )}>
                    {isResults ? "🎓 RESULT PUBLISHED" : "📝 EXAM PUBLISHED"}
                </Badge>
            );
        }
        return <Badge variant="secondary" className="text-[9px] sm:text-[10px]">ALERT</Badge>;
    };

    const getDetailedBody = (item) => {
        if (!item) return "";
        if (item.body && item.body.trim().length > 0) {
            return item.body;
        }
        if (item.type === 'exam') {
            if (item.is_results_published) {
                return "Official exam results & subject marksheets are now available for viewing.";
            }
            if (item.start_date) {
                const sDate = safeFormatDate(item.start_date);
                const eDate = safeFormatDate(item.end_date);
                return `Exam routine and schedule announced from ${sDate}${eDate ? ` to ${eDate}` : ''}.`;
            }
            return "New examination schedule has been published by the administration.";
        }
        if (item.type === 'event' && item.event_date) {
            const evDate = safeFormatDate(item.event_date, 'EEEE, dd MMMM yyyy');
            return `Scheduled for ${evDate}${item.location ? ` at ${item.location}` : ''}.`;
        }
        return "Click to view full details.";
    };

    const getActionButtonLabel = (item) => {
        if (!item) return "View";
        if (item.type === 'fee_due') return "Pay Fee";
        if (item.type === 'exam') return item.is_results_published ? "View Result" : "View Routine";
        if (item.type === 'event') return "View Event";
        return "Read Notice";
    };

    const isFeeDue = currentAlert.type === 'fee_due';
    const formattedEventDate = safeFormatDate(currentAlert.event_date);

    return (
        <div className="relative group w-full mb-4 sm:mb-6">
            {/* Slow Elegant Ambient Glowing Backlight */}
            <div className={cn(
                "absolute -inset-0.5 rounded-xl sm:rounded-2xl blur-lg transition-all duration-1000 animate-[pulse_5s_cubic-bezier(0.4,0,0.6,1)_infinite]",
                isFeeDue 
                    ? "bg-gradient-to-r from-rose-500/40 via-red-500/40 to-amber-500/40 dark:from-rose-600/70 dark:via-red-500/70 dark:to-amber-600/70 shadow-[0_0_20px_rgba(225,29,72,0.2)] dark:shadow-[0_0_25px_rgba(225,29,72,0.4)]" 
                    : "bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-purple-500/40 dark:from-blue-600/70 dark:via-indigo-500/70 dark:to-purple-600/70 shadow-[0_0_20px_rgba(79,70,229,0.2)] dark:shadow-[0_0_25px_rgba(79,70,229,0.4)]"
            )} />

            {/* Glassmorphic Container Card with Mobile Responsive Flex Layout */}
            <div className={cn(
                "relative backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 border shadow-xl dark:shadow-2xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-500",
                isFeeDue 
                    ? "bg-rose-50/95 text-gray-900 border-rose-200 dark:bg-slate-950/95 dark:text-slate-100 dark:border-rose-500/40" 
                    : "bg-white/95 text-gray-900 border-gray-200 dark:bg-slate-900/95 dark:text-slate-100 dark:border-white/20"
            )}>

                {/* Main Content Info */}
                <div key={currentAlert.type + '_' + currentAlert.id} className="flex items-start gap-2.5 sm:gap-3.5 min-w-0 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
                    
                    {/* Live Ping Indicator Dot */}
                    <div className="relative flex h-2.5 sm:h-3 w-2.5 sm:w-3 mt-1 sm:mt-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 sm:h-3 w-2.5 sm:w-3 bg-rose-500" />
                    </div>

                    {/* Icon Box */}
                    <div className="p-1.5 sm:p-2.5 bg-gray-100/80 dark:bg-white/10 rounded-lg sm:rounded-xl border border-gray-200/80 dark:border-white/15 shrink-0 flex items-center justify-center shadow-inner">
                        {getAlertIcon(currentAlert.type)}
                    </div>

                    {/* Text Details */}
                    <div className="min-w-0 space-y-0.5 sm:space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {getBadge(currentAlert.type, currentAlert)}
                            <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white tracking-tight leading-snug">
                                {currentAlert.title}
                            </span>
                            {formattedEventDate && (
                                <span className="text-[9px] sm:text-[10px] font-semibold text-purple-700 dark:text-purple-200 bg-purple-100 dark:bg-purple-950/80 px-1.5 sm:px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-700/60">
                                    🗓️ {formattedEventDate}
                                </span>
                            )}
                        </div>

                        <p className="text-[11px] sm:text-xs text-gray-600 dark:text-slate-300 font-medium leading-relaxed max-w-3xl line-clamp-2">
                            {getDetailedBody(currentAlert)}
                        </p>
                    </div>
                </div>

                {/* Right Section: Action Button & Carousel Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto border-t sm:border-t-0 border-gray-200 dark:border-white/10 pt-2 sm:pt-0 shrink-0">
                    
                    {/* Direct Action Button */}
                    <Button
                        size="sm"
                        onClick={() => handleActionClick(currentAlert)}
                        className={cn(
                            "text-[11px] sm:text-xs font-bold gap-1 shadow-md transition-all duration-300 hover:scale-105 active:scale-95 px-2.5 sm:px-3 h-8 sm:h-9",
                            isFeeDue 
                                ? "bg-rose-600 hover:bg-rose-700 text-white" 
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                        )}
                    >
                        {getActionButtonLabel(currentAlert)}
                        <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>

                    {/* Carousel Navigation Controls */}
                    {alerts.length > 1 && (
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 dark:bg-white/5 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-gray-200 dark:border-white/10">
                            <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 text-gray-700 dark:text-slate-300">
                                {currentIndex + 1}/{alerts.length}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 sm:h-6 w-5 sm:w-6 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/15 rounded-md sm:rounded-lg p-0"
                                onClick={() => setCurrentIndex(prev => (prev - 1 + alerts.length) % alerts.length)}
                            >
                                <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 sm:h-6 w-5 sm:w-6 text-gray-600 hover:text-gray-900 hover:bg-gray-200 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/15 rounded-md sm:rounded-lg p-0"
                                onClick={() => setCurrentIndex(prev => (prev + 1) % alerts.length)}
                            >
                                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                        </div>
                    )}

                    {/* Dismiss Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 sm:h-7 w-6 sm:w-7 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors ml-auto sm:ml-0"
                        onClick={() => handleDismiss(currentAlert)}
                        title="Dismiss notification"
                    >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                </div>

                {/* Progress Bar Indicator for Automatic Slide Timer */}
                {alerts.length > 1 && (
                    <div className="absolute bottom-0 left-0 h-[2.5px] sm:h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
                )}

            </div>
        </div>
    );
}
