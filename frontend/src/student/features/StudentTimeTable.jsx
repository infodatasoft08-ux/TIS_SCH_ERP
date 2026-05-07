import API from "@/api";
import { useAuth } from "@/auth/AuthContext";
import WeeklyTimetable from "@/widgets/WeeklyTimetable";
import React from "react";

export default function StudentTimeTablePage() {
  const [routines, setRoutines] = React.useState([]);
  const { user } = useAuth();

  React.useEffect(() => {
    API.get(`/classroutine/get/classes/${user.class_id}/routines`).then((res) =>
      setRoutines(res.data.routines || [])
    );
  }, [user.id]);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 max-w-7xl mx-auto p-1 sm:p-3 md:p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-6 md:p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Class Timetable</h1>
          <p className="mt-2 text-white/90 text-sm md:text-lg">
            View your weekly class schedule and timings.
          </p>
        </div>
      </div>

      {/* <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4"> */}
      <WeeklyTimetable routines={routines} />
      {/* </div> */}
    </div>
  );
}