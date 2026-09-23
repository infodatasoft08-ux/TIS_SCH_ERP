import { Megaphone } from 'lucide-react';
import React from 'react';
import { Navigate } from 'react-router-dom';
import AnnouncementDashboard from './AnnouncementDashboard';
import { useAuth } from '@/auth/AuthContext';

export default function CreateAnouncementDatable() {
  const { user } = useAuth();

  // If student (1) or parent (5), redirect to announcement list
  if (user && (Number(user.role_id) === 1 || Number(user.role_id) === 5)) {
    return <Navigate to="/school/announcement/list" replace />;
  }

  const roleId = Number(user?.role_id);
  const userRole = roleId === 2 ? 'teacher' : (user?.sub_role === 'staff' ? 'staff' : 'admin');

  return (
    <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900/50 p-2 md:p-4 lg:p-6 rounded-[2rem] border dark:border-gray-800 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-500" />
          Announcements & Events
        </h3>
      </div>
      <AnnouncementDashboard userRole={userRole} userId={user?.id} canManage={true} />
    </div>
  );
}