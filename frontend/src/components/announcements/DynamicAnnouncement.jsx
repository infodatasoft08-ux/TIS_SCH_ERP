import React from 'react';
import { Megaphone } from 'lucide-react';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { useAuth } from '@/auth/AuthContext';

export default function DynamicAnnouncement() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            {/* Announcements & Events */}
            <div className="p-8 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Megaphone className="w-6 h-6 text-blue-500" />
                    <h3 className="text-2xl font-bold">Announcements & Events</h3>
                </div>
                {user.role_id === 1 ? (
                    <AnnouncementDashboard
                        userRole="student"
                        userId={user?.id}
                        canManage={false}
                    />
                ) : user.role_id === 4 ? (
                    <AnnouncementDashboard
                        userRole="staff"
                        userId={user?.id}
                        canManage={true}
                    />
                ) : user.role_id === 2 ? (
                    <AnnouncementDashboard
                        userRole="teacher"
                        userId={user?.id}
                        canManage={true}
                    />
                ) : (
                    <AnnouncementDashboard
                        userRole="parent"
                        userId={user?.id}
                        canManage={false}
                    />
                )
                }
            </div>
        </div>
    );
}