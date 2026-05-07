import React, { useEffect, useMemo, useState } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleXCalendar } from "@schedule-x/react";
import { createCalendar, createViewList, createViewMonthAgenda, createViewMonthGrid, createViewWeek } from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import "@schedule-x/theme-default/dist/index.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeeAttendanceCalendar() {
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
  }, []);

  async function loadAttendance() {
    setLoading(true);
    try {
      const res = await API.get(
        `/analytics/personal/attendance/history`,
        {
          params: { from, to }
        }
      );

      const records = res.data.records || [];
      setEvents(records);
    } catch (err) {
      console.error("Failed to load employee attendance", err);
    } finally {
      setLoading(false);
    }
  }

  const eventsService = useMemo(() => createEventsServicePlugin(), []);

  const calendarEvents = useMemo(() => {
    return events
      .filter(event => event.attendance_date)
      .map(event => ({
        id: event.id,
        title: event.status.toUpperCase(),
        start: Temporal.PlainDate.from(event.attendance_date.split('T')[0]),
        end: Temporal.PlainDate.from(event.attendance_date.split('T')[0]),
        calendarId: event.status?.toLowerCase() || 'school',
        data: {
          status: event.status,
          recordedBy: event.recorded_by_name,
          date: event.attendance_date
        }
      }));
  }, [events]);

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
            <div className="space-y-3 text-sm p-2">
              <div>
                <p className="text-muted-foreground font-semibold uppercase text-[10px]">Status</p>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded text-xs text-white mt-1",
                    d.status === "present" && "bg-green-600",
                    d.status === "absent" && "bg-red-600",
                    d.status === "late" && "bg-yellow-500",
                    d.status === "excused" && "bg-blue-600",
                    d.status === "leave" && "bg-purple-600"
                  )}
                >
                  {d.status.toUpperCase()}
                </span>
              </div>

              <div>
                <p className="text-muted-foreground font-semibold uppercase text-[10px]">Recorded By</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200">{d.recordedBy || "System"}</p>
              </div>

              <div>
                <p className="text-muted-foreground font-semibold uppercase text-[10px]">Date</p>
                <p className="font-semibold text-gray-700 dark:text-gray-200">
                  {new Date(d.date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                </p>
              </div>
            </div>
          );
        }
      },
      calendars: {
        present: {
          colorName: 'present',
          lightColors: { main: '#16a34a', container: '#dcfce7', onContainer: '#15803d' },
          darkColors: { main: '#22c55e', container: '#14532d', onContainer: '#dcfce7' },
        },
        absent: {
          colorName: 'absent',
          lightColors: { main: '#dc2626', container: '#fee2e2', onContainer: '#b91c1c' },
          darkColors: { main: '#ef4444', container: '#7f1d1d', onContainer: '#fee2e2' },
        },
        late: {
          colorName: 'late',
          lightColors: { main: '#f59e0b', container: '#fef3c7', onContainer: '#d97706' },
          darkColors: { main: '#fbbf24', container: '#78350f', onContainer: '#fef3c7' },
        },
        excused: {
          colorName: 'excused',
          lightColors: { main: '#2563eb', container: '#dbeafe', onContainer: '#1e40af' },
          darkColors: { main: '#3b82f6', container: '#1e3a8a', onContainer: '#dbeafe' },
        },
        leave: {
          colorName: 'leave',
          lightColors: { main: '#9333ea', container: '#ede9fe', onContainer: '#7c2d12' },
          darkColors: { main: '#a855f7', container: '#581c87', onContainer: '#ede9fe' },
        }
      },
      isResponsive: true,
      theme: 'shadcn'
    });
  }, [calendarEvents]);

  if (loading && events.length === 0) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-900/40 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance History Calendar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">From</label>
            <DatePicker value={from} onChange={setFrom} placeholder="Start Date" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[150px]">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">To</label>
            <DatePicker value={to} onChange={setTo} placeholder="End Date" />
          </div>
          <Button onClick={loadAttendance} disabled={loading} size="sm" className="rounded-xl px-6">
            {loading ? "Loading..." : "Update View"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <Card className="border-0 shadow-sm h-full rounded-2xl bg-white dark:bg-gray-900/50 p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest pl-2">Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30">
                <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm"></div>
                <span className="text-xs font-bold text-green-700 dark:text-green-300">Present</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm"></div>
                <span className="text-xs font-bold text-red-700 dark:text-red-300">Absent</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30">
                <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm"></div>
                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">Late</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
                <div className="h-3 w-3 rounded-full bg-blue-500 shadow-sm"></div>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Excused</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30">
                <div className="h-3 w-3 rounded-full bg-purple-500 shadow-sm"></div>
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Leave</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900/50">
            <CardContent className="p-4 sm:p-6">
              <div className="p-4 [&_.fc-toolbar-title]:text-xl [&_.fc-toolbar-title]:font-bold [&_.fc-button]:bg-primary [&_.fc-button]:border-0 [&_.fc-daygrid-day-number]:font-medium [&_.fc-col-header-cell]:py-3 [&_.fc-col-header-cell]:bg-muted/30">
                <ScheduleXCalendar calendarApp={calendar} />
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
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-base font-semibold">
                    {selectedEvent._originalData?.name || selectedEvent.description || 'N/A'}
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
