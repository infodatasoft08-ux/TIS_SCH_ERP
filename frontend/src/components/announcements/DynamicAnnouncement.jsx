import React from 'react';
import { Megaphone } from 'lucide-react';
import AnnouncementDashboard from '@/components/announcements/AnnouncementDashboard';
import { useAuth } from '@/auth/AuthContext';

export default function DynamicAnnouncement() {
    const { user } = useAuth();

    return (
        <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-6">
            {/* Announcements & Events */}
            <div className="p-3 sm:p-6 bg-white dark:bg-gray-900/50 rounded-2xl border shadow-sm">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                    <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                    <h3 className="text-xl sm:text-2xl font-bold">Announcements & Events</h3>
                </div>
                {user.role_id === 1 ? (
                    <AnnouncementDashboard
                        userRole="student"
                        userId={user?.id}
                        canManage={false}
                    />
                ) : user.sub_role === 'staff' ? (
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