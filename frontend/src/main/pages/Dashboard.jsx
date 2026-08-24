import { useAuth } from "@/auth/AuthContext";
import AdminDashboard from "./AdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import { Library } from "lucide-react";
import FinanceDashboard from "./financeDashboard";
import StaffDashboard from "./StaffDashboard";

const ROLES = {
  ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
  PARENT: 5,
  SUPERADMIN: 6,
  RECEPTION: 8,
  COORDINATOR: 7,
  DISCIPLINE_INCHARGE: 11,
  CARE_TAKER: 10,
  COMPUTER_OPERATOR: 9,
  DEVELOPER: 12,
  STAFF: "staff"
};

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="p-6 text-red-600">Unauthorized</div>;
  }

  const activeRole = user.sub_role === "staff" ? "staff" : user.role_id;

  switch (activeRole) {
    case ROLES.ADMIN:
      return <AdminDashboard />;

    case ROLES.COORDINATOR:
      return <AdminDashboard />;

    case ROLES.TEACHER:
      return <TeacherDashboard />;

    case ROLES.STUDENT:
      return <StudentDashboard />;

    case ROLES.PARENT:
      return <StudentDashboard />;

    case ROLES.RECEPTION:
      return <FinanceDashboard />;

    case ROLES.SUPERADMIN:
    case ROLES.DEVELOPER:
      return <AdminDashboard />;

    case ROLES.DISCIPLINE_INCHARGE:
      return <StaffDashboard />;

    case ROLES.CARE_TAKER:
      return <StaffDashboard />;

    case ROLES.COMPUTER_OPERATOR:
      return <StaffDashboard />;

    default:
      return (
        <div className="p-2 text-red-600">
          Role not supported
        </div>
      );
  }
}