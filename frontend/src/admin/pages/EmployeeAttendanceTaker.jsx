import React, { useEffect, useState } from "react";
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full mx-auto p-4 md:p-6">

      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 md:p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <UserCheck className="h-6 w-6 md:h-8 md:w-8" />
              Employee Attendance
            </h1>
            <p className="mt-2 text-blue-100/90 text-sm md:text-lg">
              Manage daily attendance for teachers and staff members.
            </p>
          </div>
          <div className="w-full md:w-auto bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10">
            <span className="font-medium text-blue-50 block uppercase tracking-wider text-xs whitespace-nowrap">Current Date</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-lg md:text-xl font-bold">{date}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Filters and Search */}
        <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Search Employee</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Name or Code..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="teacher">Teachers Only</SelectItem>
                    <SelectItem value="staff">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attendance Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setDate(new Date().toISOString().split("T")[0]);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Areas */}
        <Tabs defaultValue={isAttendanceTaken ? "view" : "take"} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="take" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Take Attendance
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="take" className="space-y-4">
            {isAttendanceTaken && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5" />
                <div>
                  <p className="font-semibold">Attendance already recorded for this date.</p>
                  <p className="text-sm">Switch to "View History" to see or update records.</p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
                <div>
                  <CardTitle>Employee List</CardTitle>
                  <CardDescription>Mark attendance for {filteredEmployees.length} employees</CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => markAll("present")} disabled={isAttendanceTaken}>
                    All Present
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50" onClick={() => markAll("absent")} disabled={isAttendanceTaken}>
                    All Absent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Desktop view */}
                <div className="hidden lg:block rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="w-[400px]">Status</TableHead>
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
                            <TableCell className="font-medium">{emp.name}</TableCell>
                            <TableCell><Badge variant="outline">{emp.type}</Badge></TableCell>
                            <TableCell>{emp.employee_code || "N/A"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {["present", "absent", "late", "excused", "leave"].map((status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={attendanceStatus[emp.id] === status ? "default" : "outline"}
                                    onClick={() => handleStatusChange(emp.id, status)}
                                    disabled={isAttendanceTaken}
                                    className={`capitalize h-8 px-2 text-xs lg:text-sm lg:px-3 ${attendanceStatus[emp.id] === status ?
                                      (status === "present" ? "bg-green-600 hover:bg-green-700" : status === "absent" ? "bg-red-600 hover:bg-red-700" : "")
                                      : ""}`}
                                  >
                                    {status}
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

                {/* Mobile view */}
                <div className="lg:hidden space-y-4">
                  {loading ? (
                    <p className="text-center py-10">Loading...</p>
                  ) : filteredEmployees.length === 0 ? (
                    <p className="text-center py-10">No employees found</p>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <Card key={emp.id} className="p-4 border shadow-none bg-gray-50/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold">{emp.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{emp.type}</Badge>
                              <span className="text-xs text-gray-500 font-mono">{emp.employee_code || "N/A"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {["present", "absent", "late", "excused", "leave"].map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={attendanceStatus[emp.id] === status ? "default" : "outline"}
                              onClick={() => handleStatusChange(emp.id, status)}
                              disabled={isAttendanceTaken}
                              className={`capitalize h-9 text-xs ${attendanceStatus[emp.id] === status ?
                                (status === "present" ? "bg-green-600 hover:bg-green-700" : status === "absent" ? "bg-red-600 hover:bg-red-700" : "")
                                : ""}`}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    ))
                  )}
                </div>

                {!isAttendanceTaken && filteredEmployees.length > 0 && (
                  <div className="mt-6 flex justify-end">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 px-10"
                      onClick={handleSubmitAttendance}
                      disabled={submitting}
                    >
                      {submitting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Attendance
                    </Button>
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
