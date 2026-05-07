import React, { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Legend from "@/widgets/Legend";
import { useAuth } from "@/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleXCalendar, useCalendarApp } from "@schedule-x/react";
import { createCalendar, createViewList, createViewMonthAgenda, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { useThemeAnimation } from "@space-man/react-theme-animation";

// Custom Event Modal Component - defined outside to prevent recreation on re-renders
// function AttendanceEventModal({ calendarEvent }) {
//   console.log("AttendanceEventModal called with calendarEvent: ", calendarEvent);

//   // Check if calendarEvent and calendarEvent._customContent exist
//   if (!calendarEvent) {
//     console.error("No calendarEvent provided to AttendanceEventModal");
//     return <div className="p-4 text-red-500">No event data available</div>;
//   }

//   // Access the custom data we stored
//   const eventData = calendarEvent._customContent || calendarEvent;
//   console.log("eventData: ", eventData);

//   // Try to access data from different possible locations
//   const d = eventData.data || {};

//   console.log("Extracted data (d): ", d);

//   return (
//     <div className="space-y-4 p-2 text-sm">
//       <div>
//         <p className="text-muted-foreground">Student Name</p>
//         <p className="font-semibold">{d.studentName || "N/A"}</p>
//       </div>

//       <div>
//         <p className="text-muted-foreground">Class</p>
//         <p className="font-semibold">{d.className || "N/A"}</p>
//       </div>

//       <div>
//         <p className="text-muted-foreground">Status</p>
//         <span
//           className={cn(
//             "inline-block px-2 py-1 rounded text-xs text-white",
//             d.status === "present" && "bg-green-600",
//             d.status === "absent" && "bg-red-600",
//             d.status === "late" && "bg-yellow-500",
//             d.status === "excused" && "bg-blue-600"
//           )}
//         >
//           {d.status ? d.status.toUpperCase() : "N/A"}
//         </span>
//       </div>

//       <div>
//         <p className="text-muted-foreground">Taken By</p>
//         <p className="font-semibold">{d.takenBy || "N/A"}</p>
//       </div>

//       <div>
//         <p className="text-muted-foreground">Date</p>
//         <p className="font-semibold">
//           {d.date ? new Date(d.date).toLocaleDateString() : "N/A"}
//         </p>
//       </div>
//     </div>
//   );
// }

export default function StudentAttendanceCalendar() {

  // Helper function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Helper function to get date one month before current date
  const getOneMonthBefore = () => {
    const currentDate = new Date();
    const oneMonthBefore = new Date(currentDate);
    oneMonthBefore.setMonth(currentDate.getMonth() - 1);
    return oneMonthBefore.toISOString().split('T')[0];
  };

  const [events, setEvents] = useState([]);
  const [from, setFrom] = useState(getOneMonthBefore());
  const [to, setTo] = useState(getCurrentDate());
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadAttendance();
  }, [])


  async function loadAttendance() {
    setLoading(true);
    try {

      const res = await API.get(
        `/attendance/get/attendace/summery/student`,
        {
          params: { class_id: user?.class_id, from, to }
        }
      );

      const records = res.data.records || {};
      setEvents(records);
      console.log("attendance record summary records: ", records);
      console.log("attendance record summary event: ", events);

    } catch (err) {
      console.error("Failed to load attendance", err);
    } finally {
      setLoading(false);
    }
  }


  const calendarEvents = useMemo(() => {
    return events
      .filter(event => event.attendance_date)
      .map(event => ({
        id: event.id,
        title: event.status,
        description: event.student_name,
        location: event.class_name,
        start: Temporal.PlainDate.from(event.attendance_date.split('T')[0]),
        end: Temporal.PlainDate.from(event.attendance_date.split('T')[0]),
        calendarId: event.status?.toLowerCase() || 'school',
        // Store additional data for the modal
        data: {
          studentName: event.student_name,
          className: event.class_name,
          status: event.status,
          takenBy: event.taken_by,
          date: event.attendance_date
        }
      }));
  }, [events]);

  const eventsService = useMemo(() => createEventsServicePlugin(), []);

  const calendar = useMemo(() => {
    return createCalendar({
      views: [createViewMonthAgenda(), createViewMonthGrid(), createViewWeek(), createViewList()],
      events: calendarEvents,
      defaultView: 'month-grid',
      plugins: [eventsService, createEventModalPlugin()],
      customComponents: {
        eventModal: ({ event }) => {
          const d = event.data;

          return (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Student</p>
                <p className="font-semibold">{d.studentName}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Class</p>
                <p className="font-semibold">{d.className}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Status</p>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs text-white",
                    d.status === "present" && "bg-green-600",
                    d.status === "absent" && "bg-red-600",
                    d.status === "late" && "bg-yellow-500",
                    d.status === "excused" && "bg-blue-600"
                  )}
                >
                  {d.status.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-muted-foreground">Taken By</p>
                <p className="font-semibold">{d.takenBy || "N/A"}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {new Date(d.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        }
      },
      calendars: {
        present: {
          colorName: 'present',
          lightColors: {
            main: '#16a34a',
            container: '#dcfce7',
            onContainer: '#15803d',
          },
          darkColors: {
            main: '#22c55e',
            container: '#14532d',
            onContainer: '#dcfce7',
          },
        },
        absent: {
          colorName: 'absent',
          lightColors: {
            main: '#dc2626',
            container: '#fee2e2',
            onContainer: '#b91c1c',
          },
          darkColors: {
            main: '#ef4444',
            container: '#7f1d1d',
            onContainer: '#fee2e2',
          },
        },
        late: {
          colorName: 'late',
          lightColors: {
            main: '#f59e0b',
            container: '#fef3c7',
            onContainer: '#d97706',
          },
          darkColors: {
            main: '#fbbf24',
            container: '#78350f',
            onContainer: '#fef3c7',
          },
        },
        excused: {
          colorName: 'excused',
          lightColors: {
            main: '#2563eb',
            container: '#dbeafe',
            onContainer: '#1e40af',
          },
          darkColors: {
            main: '#3b82f6',
            container: '#1e3a8a',
            onContainer: '#dbeafe',
          },
        },
        school: {
          colorName: 'school',
          lightColors: {
            main: '#6b7280',
            container: '#f3f4f6',
            onContainer: '#4b5563',
          },
          darkColors: {
            main: '#9ca3af',
            container: '#374151',
            onContainer: '#f3f4f6',
          },
        },
      },
      isResponsive: true,
      theme: 'shadcn'
    });
  }, [calendarEvents, eventsService]);
  // const calendar = useCalendarApp({
  //   views: [createViewMonthAgenda(), createViewMonthGrid(), createViewWeek(), createViewList()],
  //   events: calendarEvents,
  //   defaultView: 'month-grid',
  //   plugins: [eventsService, createEventModalPlugin()],
  //   calendars: {
  //     present: {
  //       colorName: 'present',
  //       lightColors: {
  //         main: '#16a34a',
  //         container: '#dcfce7',
  //         onContainer: '#15803d',
  //       },
  //       darkColors: {
  //         main: '#22c55e',
  //         container: '#14532d',
  //         onContainer: '#dcfce7',
  //       },
  //     },
  //     absent: {
  //       colorName: 'absent',
  //       lightColors: {
  //         main: '#dc2626',
  //         container: '#fee2e2',
  //         onContainer: '#b91c1c',
  //       },
  //       darkColors: {
  //         main: '#ef4444',
  //         container: '#7f1d1d',
  //         onContainer: '#fee2e2',
  //       },
  //     },
  //     late: {
  //       colorName: 'late',
  //       lightColors: {
  //         main: '#f59e0b',
  //         container: '#fef3c7',
  //         onContainer: '#d97706',
  //       },
  //       darkColors: {
  //         main: '#fbbf24',
  //         container: '#78350f',
  //         onContainer: '#fef3c7',
  //       },
  //     },
  //     excused: {
  //       colorName: 'excused',
  //       lightColors: {
  //         main: '#2563eb',
  //         container: '#dbeafe',
  //         onContainer: '#1e40af',
  //       },
  //       darkColors: {
  //         main: '#3b82f6',
  //         container: '#1e3a8a',
  //         onContainer: '#dbeafe',
  //       },
  //     },
  //     school: {
  //       colorName: 'school',
  //       lightColors: {
  //         main: '#6b7280',
  //         container: '#f3f4f6',
  //         onContainer: '#4b5563',
  //       },
  //       darkColors: {
  //         main: '#9ca3af',
  //         container: '#374151',
  //         onContainer: '#f3f4f6',
  //       },
  //     },
  //   },
  //   isResponsive: true,
  //   theme: 'shadcn'
  // });

  function getStatusColor(status) {
    switch (status?.toLowerCase()) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "late":
        return "bg-yellow-500";
      case "excused":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  }

  if (loading) {
    return (
      <Card className="rounded-xl border-none shadow-lg bg-card text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">Attendance Record</CardTitle>
          <Skeleton className="h-4 w-12" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Record</h1>
          <p className="text-muted-foreground text-sm">View your monthly attendance performance.</p>
        </div>
      </div>

      {/* FILTER CARD */}
      <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="font-medium dark:text-gray-300 text-muted-foreground uppercase tracking-wider text-xs">Filter Range</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">From Date</label>

            <DatePicker
              value={from}
              // onChange={(e) => setFrom(e.target.value)}
              onChange={(date) => setFrom(date)}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">To Date</label>

            <DatePicker
              value={to}
              // onChange={(e) => setTo(e.target.value)}
              onChange={(date) => setTo(date)}
              placeholder="dd/mm/yyyy"
            />
          </div>
          <Button onClick={loadAttendance} disabled={loading} className="w-full md:w-auto">
            {loading ? "Loading..." : "Update View"}
          </Button>
        </CardContent>
      </Card>

      {/* LEGEND and CALENDAR GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* SIDEBAR / LEGEND */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-0 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-lg text-muted-foreground dark:text-gray-300">Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50">
                <div className="h-4 w-4 rounded-full bg-green-500 shadow-sm ring-2 ring-green-200 dark:ring-green-900"></div>
                <span className="font-medium text-green-700 dark:text-green-300">Present</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                <div className="h-4 w-4 rounded-full bg-red-500 shadow-sm ring-2 ring-red-200 dark:ring-red-900"></div>
                <span className="font-medium text-red-700 dark:text-red-300">Absent</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/50">
                <div className="h-4 w-4 rounded-full bg-yellow-500 shadow-sm ring-2 ring-yellow-200 dark:ring-yellow-900"></div>
                <span className="font-medium text-yellow-700 dark:text-yellow-300">Late</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50">
                <div className="h-4 w-4 rounded-full bg-blue-500 shadow-sm ring-2 ring-blue-200 dark:ring-blue-900"></div>
                <span className="font-medium text-blue-700 dark:text-blue-300">Excused</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN CALENDAR */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 [&_.fc-toolbar-title]:text-xl [&_.fc-toolbar-title]:font-bold [&_.fc-button]:bg-primary [&_.fc-button]:border-0 [&_.fc-daygrid-day-number]:font-medium [&_.fc-col-header-cell]:py-3 [&_.fc-col-header-cell]:bg-muted/30">
                {/* <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={events}
                  height="auto"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  dayMaxEventRows={1}
                /> */}

                <ScheduleXCalendar
                  calendarApp={calendar}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attendance Details</DialogTitle>
            <DialogDescription>
              View detailed information about this attendance record
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Student Name</p>
                  <p className="text-base font-semibold">
                    {selectedEvent._originalData?.studentName || selectedEvent.description || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class</p>
                  <p className="text-base font-semibold">
                    {selectedEvent._originalData?.className || selectedEvent.location || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={cn("w-3 h-3 rounded-full", getStatusColor(selectedEvent._originalData?.status || selectedEvent.title))} />
                    <p className="text-base font-semibold capitalize">
                      {selectedEvent._originalData?.status || selectedEvent.title || 'N/A'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taken By</p>
                  <p className="text-base font-semibold">
                    {selectedEvent._originalData?.takenBy || 'N/A'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-base font-semibold">
                    {selectedEvent._originalData?.date
                      ? new Date(selectedEvent._originalData.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}