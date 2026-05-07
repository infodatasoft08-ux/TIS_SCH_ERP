import React, { useState, useEffect, useCallback, useMemo } from 'react';
import API from '@/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon, Megaphone, ChevronRight, Clock, MapPin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import NoticeForm from './NoticeForm';
import EventForm from './EventForm';
import { ScheduleXCalendar } from '@schedule-x/react';
import { createCalendar, createViewDay, createViewList, createViewMonthAgenda, createViewMonthGrid, createViewWeek } from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import { Temporal } from 'temporal-polyfill';

import '@schedule-x/theme-default/dist/time-picker.css'
import '@schedule-x/theme-shadcn/dist/index.css'

export default function UpcomingActivities() {
    const [notices, setNotices] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setCalendarLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const [noticeRes, eventRes] = await Promise.all([
                API.get('/announcement/list/notice?limit=5'),
                API.get(`/announcement/list/event?limit=20&from=${today}`) // Fetch more events for calendar, but filtered from today
            ]);
            setNotices(noticeRes.data.notices || []);
            setEvents(eventRes.data.events || []);
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setLoading(false);
            setCalendarLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // Transform events for ScheduleX calendar
    const calendarEvents = useMemo(() => {
        return events
            .filter(event => event.event_date)
            .map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                location: event.location,
                start: Temporal.PlainDate.from(event.event_date.split('T')[0]),
                end: Temporal.PlainDate.from(event.event_date.split('T')[0]),
            }));
    }, [events]);

    // const eventsService = useMemo(() => createEventsServicePlugin(), []);
    const eventsService = createEventsServicePlugin();

    // Create ScheduleX calendar instance
    const calendar = useMemo(() => {
        return createCalendar({
            views: [createViewMonthAgenda(), createViewMonthGrid(), createViewWeek(), createViewList()],
            events: calendarEvents,
            defaultView: 'month-grid',
            plugins: [eventsService],
            calendars: {
                school: {
                    colorName: 'school',
                    lightColors: {
                        main: '#3b82f6',
                        container: '#dbeafe',
                        onContainer: '#1e40af',
                    },
                    darkColors: {
                        main: '#60a5fa',
                        container: '#1e3a8a',
                        onContainer: '#dbeafe',
                    },
                },
            },
            theme: 'shadcn'
        });
    }, [calendarEvents, eventsService]);

    // Format date for display
    const formatDate = (dateString) => {
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

    // const allActivities = [
    //     ...notices.map(n => ({ ...n, type: 'notice', date: n.publish_at || n.created_at })),
    //     ...events.map(e => ({ ...e, type: 'event', date: e.event_date }))
    // ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // const getDay = (dateStr) => {
    //     const d = new Date(dateStr);
    //     return isNaN(d.getTime()) ? '??' : d.getDate();
    // };

    if (loading) {
        return (
            <Card className="rounded-xl border-none shadow-lg bg-card text-card-foreground">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xl font-bold">Upcoming Activities</CardTitle>
                    <Skeleton className="h-4 w-12" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-12 w-12 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        // <Card className="rounded-[2rem] border dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900/50">
        //     <CardHeader className="flex flex-row items-center justify-between">
        //         <CardTitle className="text-xl font-bold">Upcoming Activities</CardTitle>
        //         <button className="text-sm font-bold text-blue-500 hover:underline">See all</button>
        //     </CardHeader>
        //     <CardContent className="space-y-6">
        //         <div className="space-y-4">
        //             {allActivities.map((activity, idx) => (
        //                 <div key={idx} className="flex items-center justify-between group cursor-pointer">
        //                     <div className="flex items-center gap-4">
        //                         <div className={cn(
        //                             "w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg",
        //                             activity.type === 'event' ? "bg-blue-500" : "bg-pink-500"
        //                         )}>
        //                             {getDay(activity.date)}
        //                         </div>
        //                         <div>
        //                             <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{activity.title}</h4>
        //                             <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
        //                                 {activity.type === 'event' ? (
        //                                     <>
        //                                         <CalendarIcon className="w-3 h-3" />
        //                                         {new Date(activity.date).toLocaleDateString('en-GB')} • {activity.start_time || 'All Day'}
        //                                     </>
        //                                 ) : (
        //                                     <>
        //                                         <Megaphone className="w-3 h-3" />
        //                                         Announcement • {new Date(activity.date).toLocaleDateString('en-GB')}
        //                                     </>
        //                                 )}
        //                             </p>
        //                         </div>
        //                     </div>
        //                     <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
        //                 </div>
        //             ))}

        //             {allActivities.length === 0 && (
        //                 <div className="text-center py-8 text-gray-500">
        //                     <CalendarIcon className="w-12 h-12 mx-auto opacity-20 mb-2" />
        //                     <p className="text-sm">No recent activities</p>
        //                 </div>
        //             )}
        //         </div>

        //         <div className="grid grid-cols-1 gap-3 pt-4 border-t dark:border-gray-800">
        //             <Button
        //                 className="w-full rounded-2xl h-12 font-bold gap-2 text-white bg-indigo-600 hover:bg-indigo-700"
        //                 onClick={() => setIsEventFormOpen(true)}
        //             >
        //                 <Plus className="w-5 h-5" />
        //                 Add Event
        //             </Button>
        //             <Button
        //                 variant="outline"
        //                 className="w-full rounded-2xl h-12 font-bold gap-2 border-2"
        //                 onClick={() => setIsNoticeFormOpen(true)}
        //             >
        //                 <Plus className="w-5 h-5" />
        //                 Add Notice
        //             </Button>
        //         </div>
        //     </CardContent>

        //     <NoticeForm
        //         isOpen={isNoticeFormOpen}
        //         onClose={() => {
        //             setIsNoticeFormOpen(false);
        //             fetchData();
        //         }}
        //     />
        //     <EventForm
        //         isOpen={isEventFormOpen}
        //         onClose={() => {
        //             setIsEventFormOpen(false);
        //             fetchData();
        //         }}
        //     />
        // </Card>

        <div className='xl:w-1/3 space-y-6'>
            {/* Compact ScheduleX Calendar */}
            <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-500" />
                        School Calendar
                    </h3>
                    <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full font-medium">
                        {events.length} events
                    </span>
                </div>
                {calendarLoading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    // <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                    <ScheduleXCalendar
                        calendarApp={calendar}
                        customComponents={{
                            monthGridDay: ({ day }) => {
                                const dayEvents = eventsService.getEventsForDate(day.date);
                                return (
                                    <div className="flex flex-col items-center justify-start h-full w-full p-1 min-h-[45px] hover:bg-gray-100/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer">
                                        <span className={cn(
                                            "text-xs font-bold mb-1",
                                            day.isToday ? 'text-white bg-indigo-600 rounded-full w-6 h-6 flex items-center justify-center shadow-md' : 'text-gray-600 dark:text-gray-400',
                                            day.isOtherMonth && "opacity-25"
                                        )}>
                                            {day.date.split('-')[2]}
                                        </span>
                                        <div className="flex gap-0.5 mt-auto pb-0.5 flex-wrap justify-center w-full px-1">
                                            {dayEvents.slice(0, 3).map((event, idx) => (
                                                <div
                                                    key={event.id || idx}
                                                    className={cn(
                                                        "w-1.5 h-1.5 rounded-full shadow-sm",
                                                        idx === 0 ? "bg-indigo-500" : idx === 1 ? "bg-pink-500" : "bg-amber-500"
                                                    )}
                                                    title={event.title}
                                                />
                                            ))}
                                            {dayEvents.length > 3 && <div className="w-1 h-1 rounded-full bg-gray-400" />}
                                        </div>
                                    </div>
                                );
                            },
                        }}
                    />
                    // </div>
                )}
            </div>

            {/* Upcoming Events */}
            <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-purple-500" />
                    Upcoming Events
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {events.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No upcoming events</p>
                    ) : (
                        events.slice(0, 3).map((event) => (
                            <div key={event.id} className="p-4 rounded-xl bg-muted/50 text-muted-foreground border border-border hover:border-primary/50 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{event.title}</h4>
                                    <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded-full">
                                        {formatDate(event.event_date)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{event.description}</p>
                                <div className="space-y-1 text-sm text-gray-500 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                                    </div>
                                    {event.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3" />
                                            <span>{event.location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {events.length > 3 && (
                        <button className="w-full text-sm text-blue-400 hover:text-blue-300 font-medium py-2 text-center">
                            View All Events ({events.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Recent Notices */}
            <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-lg">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-500" />
                    Recent Notices
                </h3>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {notices.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No notices available</p>
                    ) : (
                        notices.slice(0, 4).map((notice) => (
                            <div key={notice.id} className="p-4 rounded-xl bg-muted/50 text-muted-foreground border border-border hover:border-amber-500/50 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">{notice.title}</h4>
                                    <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full">
                                        {formatDate(notice.publish_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{notice.body}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span className="px-2 py-1 bg-gray-700 rounded capitalize text-gray-300">
                                        {notice.audience}
                                    </span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                        Expires: {formatDate(notice.expire_at)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    {notices.length > 4 && (
                        <button className="w-full text-sm text-amber-400 hover:text-amber-300 font-medium py-2 text-center">
                            View All Notices ({notices.length})
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
