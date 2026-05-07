import { useAuth } from "@/auth/AuthContext";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import { Library } from "lucide-react";
import FinanceDashboard from "./financeDashboard";

const ROLES = {
  ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
  PARENT: 5,
  ACCOUNTANT: 4,
  SUPERADMIN: 6,
};

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="p-6 text-red-600">Unauthorized</div>;
  }

  switch (user.role_id) {
    case ROLES.ADMIN:
      return <AdminDashboard />;

    case ROLES.TEACHER:
      return <TeacherDashboard />;

    case ROLES.STUDENT:
      return <StudentDashboard />;

    case ROLES.PARENT:
      return <StudentDashboard />;

    case ROLES.ACCOUNTANT:
      return <FinanceDashboard />;

    case ROLES.SUPERADMIN:
      return <AdminDashboard />;

    default:
      return (
        <div className="p-6 text-red-600">
          Role not supported
        </div>
      );
  }
}