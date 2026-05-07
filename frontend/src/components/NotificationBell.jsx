import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import API from '@/api';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/auth/AuthContext';

export default function NotificationBell() {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await API.get('/announcement/notifications/today');
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = (notif) => {
        if (notif.type === 'notice') {
            navigate('/school/announcement/list');
        } else {
            navigate('/school/announcement/list');
        }
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {notifications.length > 0 && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white dark:border-slate-900"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <h3 className="font-semibold text-sm">{t('today_notifications')}</h3>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {notifications.length} New
                    </Badge>
                </div>
                <ScrollArea className="h-[300px]">
                    {loading && (
                        <div className="p-4 text-center text-sm text-muted-foreground italic">
                            Loading...
                        </div>
                    )}
                    {!loading && notifications.length === 0 ? (
                        <div className="p-10 text-center flex flex-col items-center gap-2">
                            <Bell className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No notices for today</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <div
                                    key={`${notif.type}-${notif.id}`}
                                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors space-y-1"
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm font-medium line-clamp-2">{notif.title}</p>
                                        <Badge
                                            variant={notif.type === 'notice' ? 'default' : 'secondary'}
                                            className="text-[9px] uppercase tracking-wider h-4 px-1"
                                        >
                                            {notif.type}
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground capitalize">
                                        Just now • {notif.type === 'notice' ? 'Announcement' : 'Event'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-primary"
                        onClick={() => user.role_id === 3 || user.role_id === 2 || user.role_id === 4 ? navigate('/school/announcement/list') : navigate('/school/announcement/add')}
                    >
                        View All Announcements
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
