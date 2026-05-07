import { Megaphone } from 'lucide-react';
import React from 'react';
import AnnouncementDashboard from './AnnouncementDashboard';

export default function CreateAnouncementDatable() {
  return (
    <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-900/50 p-8 rounded-[2rem] border dark:border-gray-800 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-500" />
          Announcements & Events
        </h3>
      </div>
      <AnnouncementDashboard userRole="admin" canManage={true} />
    </div>
  );
}