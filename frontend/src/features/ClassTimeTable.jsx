import { useAuth } from "@/auth/AuthContext";
import StudentTimeTablePage from "@/student/features/StudentTimeTable";
import TeacherTimeTablePage from "@/teacher/features/TeacherTimeTablePage";
import AdminClassTimeTable from "@/admin/features/AdminClassTimeTable";
import React from "react";

export default function ClassTimeTablePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-muted-foreground text-center py-4">
          Loading...
        </div>
      </div>
    );
  }

  // Role IDs: 1: Student, 2: Teacher, 3: Admin, 4: Accountant, 5: Parent
  return (
    <div className="p-0 space-y-4">
      {user.role_id === 2 ? (
        // <TeacherTimeTablePage />
        <StudentTimeTablePage />
      ) : user.role_id === 1 ? (
        <StudentTimeTablePage />
      ) : user.role_id === 3 ? (
        <AdminClassTimeTable />
      ) : user.role_id === 6 ? (
        <AdminClassTimeTable />
      ) : (
        <div className="p-8 text-center bg-card rounded-2xl border border-dashed text-muted-foreground">
          Timetable view is not currently available for your role.
        </div>
      )}
    </div>
  );
}