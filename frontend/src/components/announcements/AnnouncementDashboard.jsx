import React, { useState, useEffect, useCallback } from 'react';
import API from '@/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Megaphone, Calendar as CalendarIcon, RefreshCcw, Search, Loader2 } from "lucide-react";
import NoticeCard from './NoticeCard';
import EventCard from './EventCard';
import NoticeForm from './NoticeForm';
import EventForm from './EventForm';
import ViewRegisterEvents from './ViewRegisterEvents';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Badge } from '../ui/badge';
import { useAuth } from '@/auth/AuthContext';
import { useInView } from 'react-intersection-observer';

export default function AnnouncementDashboard({ userRole, userId, canManage = false }) {
    const [notices, setNotices] = useState([]);
    const [events, setEvents] = useState([]);
    const [userRegistrations, setUserRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [countRegistrations, setCountRegistrations] = useState(0);
    const [activeTab, setActiveTab] = useState("notices");

    // Pagination states
    const [limit] = useState(10);
    const [noticeOffset, setNoticeOffset] = useState(0);
    const [eventOffset, setEventOffset] = useState(0);
    const [noticeHasMore, setNoticeHasMore] = useState(true);
    const [eventHasMore, setEventHasMore] = useState(true);
    const [isFetchingNoticeMore, setIsFetchingNoticeMore] = useState(false);
    const [isFetchingEventMore, setIsFetchingEventMore] = useState(false);

    const { ref: noticeRef, inView: noticeInView } = useInView({ threshold: 0, rootMargin: '100px' });
    const { ref: eventRef, inView: eventInView } = useInView({ threshold: 0, rootMargin: '100px' });

    // Modal states
    const [noticeModalOpen, setNoticeModalOpen] = useState(false);
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [viewRegistrationsOpen, setViewRegistrationsOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingItem, setEditingItem] = useState(null);

    const { user } = useAuth();

    // Search/Filters
    const [search, setSearch] = useState("");

    const fetchNotices = useCallback(async (reset = false) => {
        setIsFetchingNoticeMore(true);
        if (reset) {
            setNoticeOffset(0);
            setNoticeHasMore(true);
        }
        try {
            const currentOffset = reset ? 0 : noticeOffset;
            const response = await API.get('/announcement/list/notice', { params: { limit, offset: currentOffset } });
            const fetched = response.data.notices || [];

            if (reset) setNotices(fetched);
            else setNotices(prev => [...prev, ...fetched]);

            if (fetched.length < limit) setNoticeHasMore(false);
            if (!reset) setNoticeOffset(prev => prev + limit);
            else if (fetched.length === limit) setNoticeOffset(limit);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingNoticeMore(false);
        }
    }, [limit, noticeOffset]);

    const fetchEventsAndRegs = useCallback(async (reset = false) => {
        setIsFetchingEventMore(true);
        if (reset) {
            setEventOffset(0);
            setEventHasMore(true);
        }
        try {
            const today = new Date().toISOString().split('T')[0];
            const currentOffset = reset ? 0 : eventOffset;

            const eventParams = { limit, offset: currentOffset };
            if (!canManage) {
                eventParams.from = today;
            }

            const promises = [
                API.get('/announcement/list/event', { params: eventParams })
            ];

            if (user?.id && reset) {
                promises.push(API.get('/announcement/list/my/registrations'));
            }

            const results = await Promise.all(promises);
            const eventsRes = results[0];
            const fetched = eventsRes.data.events || [];

            if (reset) setEvents(fetched);
            else setEvents(prev => [...prev, ...fetched]);

            if (fetched.length < limit) setEventHasMore(false);
            if (!reset) setEventOffset(prev => prev + limit);
            else if (fetched.length === limit) setEventOffset(limit);

            if (reset && results[1]) {
                const regs = results[1].data.registrations || [];
                setUserRegistrations(regs);
                setCountRegistrations(regs.length);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingEventMore(false);
        }
    }, [limit, eventOffset, canManage, user?.id]);

    const fetchData = useCallback(async (reset = true) => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchNotices(reset),
                fetchEventsAndRegs(reset)
            ]);
        } catch (error) {
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [fetchNotices, fetchEventsAndRegs]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (noticeInView && noticeHasMore && !isFetchingNoticeMore && !isRefreshing) {
            fetchNotices();
        }
    }, [noticeInView, noticeHasMore, isFetchingNoticeMore, isRefreshing, fetchNotices]);

    useEffect(() => {
        if (eventInView && eventHasMore && !isFetchingEventMore && !isRefreshing) {
            fetchEventsAndRegs();
        }
    }, [eventInView, eventHasMore, isFetchingEventMore, isRefreshing, fetchEventsAndRegs]);


    const handleRegister = async (eventId) => {
        if (!user.id) {
            toast.error("User not found. Please log in again.");
            return;
        }

        try {
            await API.post(`/announcement/add/events/${eventId}/register`, { user_id: user.id });
            toast.success("Successfully registered for the event!");
            fetchData(); // Refresh to update count and status
        } catch (error) {
            console.error("Registration error:", error);
            toast.error(error.response?.data?.error || "Registration failed");
        }
    };

    const handleEditNotice = (notice) => {
        setEditingItem(notice);
        setNoticeModalOpen(true);
    };

    const handleEditEvent = (event) => {
        setEditingItem(event);
        setEventModalOpen(true);
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            return;
        }
        try {
            await API.delete(`/announcement/delete/event/${eventId}`);
            toast.success("Event deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Delete event error:", error);
            toast.error("Failed to delete event");
        }
    };

    const handleDeleteNotice = async (noticeId) => {
        if (!window.confirm("Are you sure you want to delete this notice? This action cannot be undone.")) {
            return;
        }
        try {
            await API.delete(`/announcement/delete/notice/${noticeId}`);
            toast.success("Notice deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Delete notice error:", error);
            toast.error("Failed to delete notice");
        }
    };

    const handleViewRegistrations = (eventId) => {
        setSelectedEventId(eventId);
        setViewRegistrationsOpen(true);
    };

    const filteredNotices = notices.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.body?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.description?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Search announcements..."
                        className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchData(true)}
                        className={isRefreshing ? "animate-spin" : ""}
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </Button>

                    {canManage && (
                        <div className="flex items-center gap-2">
                            <Button onClick={() => { setEditingItem(null); setNoticeModalOpen(true); }} className="gap-2">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Notice</span>
                                <Megaphone className="w-4 h-4 sm:hidden" />
                            </Button>
                            <Button onClick={() => { setEditingItem(null); setEventModalOpen(true); }} variant="secondary" className="gap-2">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Event</span>
                                <CalendarIcon className="w-4 h-4 sm:hidden" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-gray-100 dark:bg-gray-800/50 p-1 mb-6">
                    <TabsTrigger value="notices" className="gap-2">
                        <Megaphone className="w-4 h-4" />
                        Notices
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{filteredNotices.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="events" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Events
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">{filteredEvents.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="notices">
                    {filteredNotices.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredNotices.map((notice, index) => {
                                    const isLast = index === filteredNotices.length - 1;
                                    return (
                                        <div key={notice.id} ref={isLast ? noticeRef : null}>
                                            <NoticeCard
                                                notice={notice}
                                                onEdit={canManage ? () => handleEditNotice(notice) : null}
                                                onDelete={canManage ? () => handleDeleteNotice(notice.id) : null}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {isFetchingNoticeMore && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No notices found</h3>
                            <p className="text-gray-500">Important updates will appear here.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="events">
                    {filteredEvents.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map((event, index) => {
                                    const isLast = index === filteredEvents.length - 1;
                                    return (
                                        <div key={event.id} ref={isLast ? eventRef : null}>
                                            <EventCard
                                                event={event}
                                                onRegister={userRole === 'student' || userRole === 'teacher' || userRole === 'staff' ? handleRegister : null}
                                                countRegistrations={countRegistrations}
                                                userRegistration={userRegistrations.find(r => r.event_id === event.id)}
                                                onEdit={canManage ? () => handleEditEvent(event) : null}
                                                onViewRegistrations={canManage ? () => handleViewRegistrations(event.id) : null}
                                                onDelete={canManage ? () => handleDeleteEvent(event.id) : null}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            {isFetchingEventMore && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/20 rounded-[2rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No upcoming events</h3>
                            <p className="text-gray-500">Stay tuned for upcoming school activities.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Forms */}
            <NoticeForm
                open={noticeModalOpen}
                onOpenChange={setNoticeModalOpen}
                onSuccess={fetchData}
                notice={editingItem}
            />
            <EventForm
                open={eventModalOpen}
                onOpenChange={setEventModalOpen}
                onSuccess={fetchData}
                event={editingItem}
            />

            {/* View Registrations */}
            <ViewRegisterEvents
                open={viewRegistrationsOpen}
                onOpenChange={setViewRegistrationsOpen}
                eventId={selectedEventId}
            />
        </div>
    );
}
