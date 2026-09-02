import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Save,
  RefreshCw,
  CheckSquare,
  Eye,
  Edit,
  MoreVertical,
  UserCheck,
  Search,
  Filter,
  CalendarX
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmployeeAttendanceTaker() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAttendanceTaken, setIsAttendanceTaken] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedEmployeeForUpdate, setSelectedEmployeeForUpdate] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize attendance status for each employee
  const [attendanceStatus, setAttendanceStatus] = useState({});

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    checkAttendance();
  }, [date]);

  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, roleFilter]);

  async function loadEmployees() {
    setLoading(true);
    try {
      const res = await API.get("/employee-attendance/employees");
      const list = res.data.employees || [];
      setEmployees(list);

      // Initialize default status to present
      const initialStatus = {};
      list.forEach((emp) => {
        initialStatus[emp.id] = "present";
      });
      setAttendanceStatus(initialStatus);
    } catch (err) {
      console.error("Failed to load employees", err);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }

  async function checkAttendance() {
    setLoading(true);
    try {
      const res = await API.get("/employee-attendance/summery", {
        params: { from: date, to: date }
      });

      if (res.data.records && res.data.records.length > 0) {
        setIsAttendanceTaken(true);
        setAttendanceData(res.data.records);
      } else {
        setIsAttendanceTaken(false);
        setAttendanceData([]);
      }
    } catch (err) {
      console.error("Failed to check attendance", err);
      setIsAttendanceTaken(false);
    } finally {
      setLoading(false);
    }
  }

  const filterEmployees = () => {
    let filtered = employees;
    if (searchTerm) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employee_code && emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter(emp => emp.type.toLowerCase() === roleFilter.toLowerCase());
    }
    setFilteredEmployees(filtered);
  };

  const handleStatusChange = (userId, status) => {
    setAttendanceStatus((prev) => ({
      ...prev,
      [userId]: status
    }));
  };

  const markAll = (status) => {
    const newStatus = { ...attendanceStatus };
    filteredEmployees.forEach((emp) => {
      newStatus[emp.id] = status;
    });
    setAttendanceStatus(newStatus);
    toast.info(`Marked ${filteredEmployees.length} filtered employees as ${status}`);
  };

  const handleSubmitAttendance = async () => {
    if (employees.length === 0) {
      toast.error("No employees to mark attendance");
      return;
    }

    setSubmitting(true);
    try {
      const records = employees.map((emp) => ({
        user_id: emp.id,
        attendance_date: date,
        status: attendanceStatus[emp.id] || "present",
        recorded_by: user.id
      }));

      await API.post("/employee-attendance/take", { records });
      toast.success(`Attendance recorded for ${employees.length} employees`);
      await checkAttendance();
    } catch (err) {
      console.error("Failed to submit attendance", err);
      toast.error("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateDialog = (record) => {
    setSelectedEmployeeForUpdate(record);
    setUpdateStatus(record.status);
    setUpdateDialogOpen(true);
  };

  const handleUpdateAttendance = async () => {
    if (!selectedEmployeeForUpdate || !updateStatus) return;

    setUpdating(true);
    try {
      await API.put("/employee-attendance/update-single", {
        attendance_id: selectedEmployeeForUpdate.id,
        status: updateStatus,
        recorded_by: user.id
      });

      toast.success(`Attendance updated for ${selectedEmployeeForUpdate.employee_name}`);
      await checkAttendance();
      setUpdateDialogOpen(false);
    } catch (err) {
      console.error("Failed to update attendance", err);
      toast.error("Failed to update attendance");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800 border-green-200";
      case "absent": return "bg-red-100 text-red-800 border-red-200";
      case "late": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "excused": return "bg-blue-100 text-blue-800 border-blue-200";
      case "leave": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present": return <CheckCircle className="h-4 w-4" />;
      case "absent": return <XCircle className="h-4 w-4" />;
      case "late": return <Clock className="h-4 w-4" />;
      case "leave": return <CalendarX className="h-4 w-4" />;
      default: return null;
    }
  };

  // Calculate live summary counts
  const attendanceCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;
    filteredEmployees.forEach(emp => {
      const st = attendanceStatus[emp.id] || 'present';
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'late') late++;
      else leave++;
    });
    return { present, absent, late, leave };
  }, [filteredEmployees, attendanceStatus]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-28 sm:pb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full mx-auto p-2 sm:p-4 md:p-6">

      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-4 sm:p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 sm:gap-3">
              <UserCheck className="h-6 w-6 sm:h-8 sm:w-8" />
              Employee Attendance
            </h1>
            <p className="mt-1 text-blue-100/90 text-xs sm:text-base">
              Manage daily attendance for teachers and staff members.
            </p>
          </div>
          <div className="w-full md:w-auto bg-white/20 backdrop-blur-md rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-white/10 flex items-center justify-between sm:justify-start gap-3">
            <span className="font-semibold text-blue-50 uppercase tracking-wider text-[10px] sm:text-xs">Date</span>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="text-sm sm:text-lg font-bold">{date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Filters and Search (Mobile 2-Column Grid Hardened) */}
        <Card className="border shadow-sm rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800">
          <CardContent className="p-3 sm:p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Search Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or code..."
                  className="pl-9 h-9 text-xs sm:text-sm font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="teacher">Teachers Only</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Attendance Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setDate(new Date().toISOString().split("T")[0]);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Areas */}
        <Tabs defaultValue={isAttendanceTaken ? "view" : "take"} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 rounded-xl p-1 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="take" className="flex items-center gap-1.5 text-xs sm:text-sm rounded-lg font-bold">
              <Edit className="h-3.5 w-3.5" />
              Take Attendance
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-1.5 text-xs sm:text-sm rounded-lg font-bold">
              <Eye className="h-3.5 w-3.5" />
              View History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="take" className="space-y-4">
            {isAttendanceTaken && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-3 sm:p-4 rounded-2xl flex items-center gap-3">
                <Clock className="h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold text-xs sm:text-sm">Attendance already recorded for this date.</p>
                  <p className="text-[11px] sm:text-xs opacity-90">Switch to "View History" to see or update records.</p>
                </div>
              </div>
            )}

            <Card className="rounded-2xl border shadow-sm">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-6 pb-2 sm:pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <CardTitle className="text-base sm:text-xl font-extrabold">Employee List</CardTitle>
                  <CardDescription className="text-xs">Mark attendance for {filteredEmployees.length} employees</CardDescription>
                </div>
                {!isAttendanceTaken && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs font-bold h-8 rounded-xl text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" onClick={() => markAll("present")}>
                      All Present
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-xs font-bold h-8 rounded-xl text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100" onClick={() => markAll("absent")}>
                      All Absent
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-3 sm:p-6">
                {/* Desktop view */}
                <div className="hidden lg:block rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Employee</TableHead>
                        <TableHead className="font-bold">Role</TableHead>
                        <TableHead className="font-bold">Code</TableHead>
                        <TableHead className="w-[420px] font-bold text-center">Status Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10">No employees found</TableCell></TableRow>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-bold text-gray-900 dark:text-white">{emp.name}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-xs">{emp.type}</Badge></TableCell>
                            <TableCell className="font-semibold text-xs text-gray-600 dark:text-gray-400">{emp.employee_code || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex justify-center gap-1.5">
                                {[
                                  { key: 'present', label: 'Present', color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
                                  { key: 'absent', label: 'Absent', color: 'bg-rose-600 text-white hover:bg-rose-700' },
                                  { key: 'late', label: 'Late', color: 'bg-amber-600 text-white hover:bg-amber-700' },
                                  { key: 'leave', label: 'Leave', color: 'bg-blue-600 text-white hover:bg-blue-700' },
                                ].map(({ key, label, color }) => (
                                  <Button
                                    key={key}
                                    size="sm"
                                    variant={attendanceStatus[emp.id] === key ? "default" : "outline"}
                                    onClick={() => handleStatusChange(emp.id, key)}
                                    disabled={isAttendanceTaken}
                                    className={`capitalize h-8 px-3 text-xs font-bold rounded-lg transition-transform active:scale-95 ${attendanceStatus[emp.id] === key ? color : 'text-gray-700 dark:text-gray-300'}`}
                                  >
                                    {label}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Touch View */}
                <div className="lg:hidden space-y-3">
                  {loading ? (
                    <p className="text-center py-10 text-xs text-muted-foreground">Loading employees...</p>
                  ) : filteredEmployees.length === 0 ? (
                    <p className="text-center py-10 text-xs text-muted-foreground border-2 border-dashed rounded-xl">No employees found matching filter</p>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const currentSt = attendanceStatus[emp.id] || "present";
                      return (
                        <Card key={emp.id} className="p-3.5 border shadow-sm rounded-2xl bg-gray-50/80 dark:bg-gray-900/60">
                          <div className="flex items-center justify-between mb-2.5">
                            <div>
                              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{emp.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize font-bold">{emp.type}</Badge>
                                <span className="text-[11px] text-gray-500 font-semibold">{emp.employee_code || "N/A"}</span>
                              </div>
                            </div>
                            <Badge className={`text-[10px] font-extrabold px-2 py-0.5 uppercase ${currentSt === 'present' ? 'bg-emerald-100 text-emerald-800' :
                                currentSt === 'absent' ? 'bg-rose-100 text-rose-800' :
                                  currentSt === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                              {currentSt}
                            </Badge>
                          </div>

                          {/* 4 Large Touch Buttons */}
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {[
                              { key: 'present', label: '🟢 Present', activeClass: 'bg-emerald-600 text-white ring-2 ring-emerald-500 shadow-md scale-[1.02]' },
                              { key: 'absent', label: '🔴 Absent', activeClass: 'bg-rose-600 text-white ring-2 ring-rose-500 shadow-md scale-[1.02]' },
                              { key: 'late', label: '🟡 Late', activeClass: 'bg-amber-600 text-white ring-2 ring-amber-500 shadow-md scale-[1.02]' },
                              { key: 'leave', label: '🔵 Leave', activeClass: 'bg-blue-600 text-white ring-2 ring-blue-500 shadow-md scale-[1.02]' },
                            ].map(({ key, label, activeClass }) => (
                              <Button
                                key={key}
                                size="sm"
                                variant={currentSt === key ? "default" : "outline"}
                                onClick={() => handleStatusChange(emp.id, key)}
                                disabled={isAttendanceTaken}
                                className={`h-9 px-1 text-[11px] font-extrabold rounded-xl transition-all duration-150 active:scale-95 ${currentSt === key ? activeClass : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                                  }`}
                              >
                                {label.split(" ")[1]}
                              </Button>
                            ))}
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Unified Sticky Bottom Submit Bar (Adaptive Desktop & Mobile) */}
                {!isAttendanceTaken && filteredEmployees.length > 0 && (
                  <div className="fixed bottom-0 left-0 right-0 p-3 pb-6 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-2xl z-50 lg:sticky lg:bottom-6 lg:z-40 lg:my-6 lg:p-4 lg:bg-white/90 dark:lg:bg-gray-900/90 lg:backdrop-blur-xl lg:border lg:border-gray-200/80 dark:lg:border-gray-800 lg:rounded-2xl lg:shadow-xl transition-all duration-300">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
                      <div className="hidden lg:flex items-center gap-3 text-sm">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-sm border border-emerald-200/60 dark:border-emerald-800/60">
                          <Save className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">Ready to Save Employee Attendance</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{attendanceCounts.present} Present</span>
                            {attendanceCounts.absent > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold ml-2">• {attendanceCounts.absent} Absent</span>}
                            {attendanceCounts.late > 0 && <span className="text-amber-600 dark:text-amber-400 font-bold ml-2">• {attendanceCounts.late} Late</span>}
                            {attendanceCounts.excused > 0 && <span className="text-blue-600 dark:text-blue-400 font-bold ml-2">• {attendanceCounts.excused} Leave</span>}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        className="w-full lg:w-auto text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-emerald-600/20 px-8 h-11 sm:h-12 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        onClick={handleSubmitAttendance}
                        disabled={submitting}
                      >
                        {submitting ? <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
                        <span>{submitting ? "Saving Attendance..." : `Submit Attendance (${attendanceCounts.present} Present, ${attendanceCounts.absent} Absent)`}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="view" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>Viewing records for {date}</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceData.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No records found</h3>
                    <p className="text-gray-500">Select another date or take attendance.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop View */}
                    <div className="hidden md:block rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Recorded At</TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceData.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">{record.employee_name}</TableCell>
                              <TableCell className="font-mono text-xs">{record.employee_code}</TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                  {getStatusIcon(record.status)}
                                  <span className="capitalize">{record.status}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500">
                                {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUpdateDialog(record)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                      {attendanceData.map((record) => (
                        <Card key={record.id} className="p-4 border shadow-none bg-gray-50/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold">{record.employee_name}</h4>
                              <p className="text-xs text-gray-500 font-mono mt-0.5">{record.employee_code}</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openUpdateDialog(record)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                              {getStatusIcon(record.status)}
                              <span className="capitalize">{record.status}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              <Clock className="h-3 w-3" />
                              {new Date(record.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Update Dialog - Responsive width */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
            <DialogDescription>
              Editing {selectedEmployeeForUpdate?.employee_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {["present", "absent", "late", "excused", "leave"].map((status) => (
              <Button
                key={status}
                variant={updateStatus === status ? "default" : "outline"}
                onClick={() => setUpdateStatus(status)}
                className={`capitalize h-12 ${updateStatus === status ?
                  (status === "present" ? "bg-green-600 hover:bg-green-700" : status === "absent" ? "bg-red-600 hover:bg-red-700" : "")
                  : ""}`}
              >
                {status}
              </Button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2">
            <Button variant="outline" className="order-2 sm:order-1" onClick={() => setUpdateDialogOpen(false)}>Cancel</Button>
            <Button className="order-1 sm:order-2" onClick={handleUpdateAttendance} disabled={updating}>
              {updating ? "Saving..." : "Update Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
