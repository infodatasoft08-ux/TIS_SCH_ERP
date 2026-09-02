import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon, Megaphone, ChevronRight, ChevronLeft, Clock, MapPin, Bell, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UpcomingActivities() {
    const [notices, setNotices] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [noticeRes, eventRes] = await Promise.all([
                API.get('/announcement/list/notice?limit=5'),
                API.get(`/announcement/list/event?limit=20&from=${today}`)
            ]);
            setNotices(noticeRes.data.notices || []);
            setEvents(eventRes.data.events || []);
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format time for display
    const formatTime = (timeString) => {
        if (!timeString) return "All Day";
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    };

    // Calendar Calculations
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const startingDay = (firstDayIndex + 6) % 7; // Monday start
    const prevMonthDays = new Date(year, month, 0).getDate();

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // Map events by date (YYYY-MM-DD)
    const eventsByDate = useMemo(() => {
        const map = {};
        events.forEach(event => {
            if (event.event_date) {
                const d = event.event_date.split('T')[0];
                if (!map[d]) map[d] = [];
                map[d].push(event);
            }
        });
        return map;
    }, [events]);

    // Generate grid cells
    const calendarDays = useMemo(() => {
        const days = [];

        // Trailing days from previous month
        for (let i = startingDay - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthDays - i);
            days.push({
                dayNum: prevMonthDays - i,
                isCurrentMonth: false,
                dateStr: d.toISOString().split('T')[0]
            });
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const yyyy = year;
            const mm = String(month + 1).padStart(2, '0');
            const dd = String(i).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            days.push({
                dayNum: i,
                isCurrentMonth: true,
                dateStr
            });
        }

        // Leading days for next month
        const totalNeeded = days.length > 35 ? 42 : 35;
        const fillCount = totalNeeded - days.length;
        for (let i = 1; i <= fillCount; i++) {
            const d = new Date(year, month + 1, i);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(i).padStart(2, '0');
            days.push({
                dayNum: i,
                isCurrentMonth: false,
                dateStr: `${yyyy}-${mm}-${dd}`
            });
        }

        return days;
    }, [year, month, startingDay, daysInMonth, prevMonthDays]);

    // Filtered events based on selected date
    const displayedEvents = useMemo(() => {
        if (!selectedDate) return events;
        return events.filter(e => e.event_date && e.event_date.split('T')[0] === selectedDate);
    }, [events, selectedDate]);

    if (loading) {
        return (
            <Card className="rounded-2xl border border-border shadow-lg bg-card text-card-foreground p-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-0">
                    <CardTitle className="text-xl font-bold">Upcoming Activities</CardTitle>
                    <Skeleton className="h-4 w-12" />
                </CardHeader>
                <CardContent className="space-y-4 p-0 mt-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-xl" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Compact Dashboard Calendar */}
            <div className="bg-card text-card-foreground p-4 sm:p-5 rounded-2xl border border-border shadow-md transition-all">
                {/* Calendar Header */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shrink-0">
                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold leading-tight truncate">School Calendar</h3>
                            <p className="text-xs text-muted-foreground font-semibold">{monthName}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none text-[11px] font-bold px-2 py-0.5 hidden sm:inline-flex">
                            {events.length} {events.length === 1 ? 'event' : 'events'}
                        </Badge>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
                            title="Previous Month"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => setCurrentMonth(new Date())}
                            title="Current Month"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                            title="Next Month"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Day Headers (Mon - Sun) */}
                <div className="grid grid-cols-7 text-center gap-1 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                        <div key={idx} className="text-[11px] font-bold text-gray-400 dark:text-gray-500 py-1">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                    {calendarDays.map((day, idx) => {
                        const isToday = day.dateStr === todayStr;
                        const isSelected = day.dateStr === selectedDate;
                        const dayEvents = eventsByDate[day.dateStr] || [];

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    if (day.isCurrentMonth) {
                                        setSelectedDate(selectedDate === day.dateStr ? null : day.dateStr);
                                    }
                                }}
                                disabled={!day.isCurrentMonth}
                                className={cn(
                                    "h-9 w-full flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all relative",
                                    !day.isCurrentMonth && "text-gray-300 dark:text-gray-700 opacity-30 cursor-default",
                                    day.isCurrentMonth && !isToday && !isSelected && "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer",
                                    isToday && !isSelected && "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20 cursor-pointer",
                                    isSelected && "ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-extrabold cursor-pointer"
                                )}
                            >
                                <span>{day.dayNum}</span>
                                {dayEvents.length > 0 && (
                                    <div className="flex gap-0.5 mt-0.5 justify-center">
                                        {dayEvents.slice(0, 3).map((ev, eIdx) => (
                                            <span
                                                key={ev.id || eIdx}
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isToday ? "bg-white" : eIdx === 0 ? "bg-indigo-500" : eIdx === 1 ? "bg-pink-500" : "bg-amber-500"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-card text-card-foreground p-4 sm:p-5 rounded-2xl border border-border shadow-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-purple-500" />
                        Upcoming Events
                    </h3>
                    {selectedDate && (
                        <button
                            type="button"
                            onClick={() => setSelectedDate(null)}
                            className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                            <span>Clear Filter</span>
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {selectedDate && (
                    <div className="mb-3 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-xl text-xs text-purple-700 dark:text-purple-300 font-bold flex items-center justify-between">
                        <span>Showing events for {formatDate(selectedDate)}</span>
                        <Badge className="bg-purple-600 text-white text-[10px]">{displayedEvents.length}</Badge>
                    </div>
                )}

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {displayedEvents.length === 0 ? (
                        <p className="text-muted-foreground text-xs text-center py-6">
                            {selectedDate ? "No events scheduled for this date" : "No upcoming events"}
                        </p>
                    ) : (
                        displayedEvents.slice(0, 4).map((event) => (
                            <div key={event.id} className="p-3.5 rounded-xl bg-muted/40 text-muted-foreground border border-border hover:border-purple-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{event.title}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full shrink-0">
                                        {formatDate(event.event_date)}
                                    </span>
                                </div>
                                {event.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-2.5 line-clamp-2">{event.description}</p>
                                )}
                                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                                        <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Recent Notices */}
            <div className="bg-card text-card-foreground p-4 sm:p-5 rounded-2xl border border-border shadow-md">
                <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Recent Notices
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {notices.length === 0 ? (
                        <p className="text-muted-foreground text-xs text-center py-6">No notices available</p>
                    ) : (
                        notices.slice(0, 4).map((notice) => (
                            <div key={notice.id} className="p-3.5 rounded-xl bg-muted/40 text-muted-foreground border border-border hover:border-amber-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{notice.title}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full shrink-0">
                                        {formatDate(notice.publish_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{notice.body}</p>
                                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-800 rounded font-semibold capitalize text-gray-700 dark:text-gray-300">
                                        {notice.audience}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        Expires: {formatDate(notice.expire_at)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
