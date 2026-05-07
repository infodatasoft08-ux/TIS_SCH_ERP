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
  Smartphone,
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
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function TakeAttendance() {
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isTodayAttendanceTaken, setIsTodayAttendanceTaken] = useState(false);
  const [todayAttendanceData, setTodayAttendanceData] = useState([]);
  const [selectedStudentForUpdate, setSelectedStudentForUpdate] =
    useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Initialize attendance status for each student
  const [attendanceStatus, setAttendanceStatus] = useState({});

  useEffect(() => {
    if (user) {
      loadSupervisedClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassStudents();
      checkTodayAttendance();
    }
  }, [selectedClassId, date]);

  // Check if today's date is selected
  const isSelectedDateToday = () => {
    const today = new Date().toISOString().split("T")[0];
    return date === today;
  };

  async function loadSupervisedClasses() {
    try {
      if (user.role_id === 2 && user.supervised_classes) {
        // Teacher logic: Load their supervised classes from session data
        setClasses(user.supervised_classes);
        if (user.supervised_classes.length > 0) {
          setSelectedClassId(user.supervised_classes[0].id.toString());
        }
      } else if (user.role_id === 3) {
        // Admin logic: Fetch all classes from the database
        const res = await API.get("/admin/get/classes");
        const allClasses = res.data.classes || res.data || [];
        setClasses(allClasses);
        if (allClasses.length > 0) {
          setSelectedClassId(allClasses[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to load classes", err);
      toast.error("Failed to load classes");
    }
  }

  async function loadClassStudents() {
    setLoading(true);
    try {
      const res = await API.get(
        `/teachers/get/teacher/my/supervised-class/students`,
        { params: { class_id: selectedClassId } }
      );

      const studentsList = res.data.students || res.data || [];
      setStudents(studentsList);

      // Initialize attendance status for all students
      const initialStatus = {};
      studentsList.forEach((student) => {
        initialStatus[student.student_id] = "present"; // Default to present
      });
      setAttendanceStatus(initialStatus);

      toast.success(`Loaded ${studentsList.length} students`);
    } catch (err) {
      console.error("Failed to load students", err);
      toast.error("Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  // Check if attendance is already taken for the selected date
  async function checkTodayAttendance() {
    if (!selectedClassId) return;

    try {
      // const today = new Date().toISOString().split("T")[0];
      const res = await API.get(`/attendance/get/attend/summery`, {
        params: {
          class_id: selectedClassId,
          from: date,
          to: date
        }
      });

      // Check if there are attendance records for this date
      if (res.data.records && res.data.records.length > 0) {
        setIsTodayAttendanceTaken(true);
        setTodayAttendanceData(res.data.records);
        console.log(res.data.records);
      } else {
        setIsTodayAttendanceTaken(false);
        setTodayAttendanceData([]);
      }
    } catch (err) {
      console.error("Failed to check today's attendance", err);
      setIsTodayAttendanceTaken(false);
    }
  }

  const handleStatusChange = (studentId, status) => {
    setAttendanceStatus((prev) => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status) => {
    const newStatus = {};
    students.forEach((student) => {
      newStatus[student.student_id] = status;
    });
    setAttendanceStatus(newStatus);
    toast.info(`Marked all students as ${status}`);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    if (students.length === 0) {
      toast.error("No students to mark attendance");
      return;
    }

    setSubmitting(true);
    try {
      const attendanceRecords = students.map((student) => ({
        student_id: student.student_id,
        student_academic_id: student.student_academic_id,
        class_id: parseInt(selectedClassId),
        attendance_date: date,
        status: attendanceStatus[student.student_id] || "present",
        recorded_by: user.id
      }));

      const res = await API.post(`/attendance/add/attendance`, {
        records: attendanceRecords
      });

      toast.success(`Attendance recorded for ${students.length} students`);

      // After successful submission, reload attendance data
      await checkTodayAttendance();
    } catch (err) {
      console.error("Failed to submit attendance", err);
      toast.error("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // Open update dialog for a specific student
  const openUpdateDialog = (studentRecord) => {
    setSelectedStudentForUpdate(studentRecord);
    setUpdateStatus(studentRecord.status);
    setUpdateDialogOpen(true);
  };

  // Handle update attendance for a single student
  const handleUpdateAttendance = async () => {
    if (!selectedStudentForUpdate || !updateStatus) return;

    setUpdating(true);
    try {
      const res = await API.put(`/attendance/update/attend/update-single`, {
        // student_id: selectedStudentForUpdate.student_id,
        attendance_id: selectedStudentForUpdate.id,
        // class_id: parseInt(selectedClassId),
        status: updateStatus,
        recorded_by: user.id
      });

      toast.success(
        `Attendance updated for ${selectedStudentForUpdate.student_name}`
      );

      // Refresh today's attendance data
      await checkTodayAttendance();

      // Close dialog
      setUpdateDialogOpen(false);
      setSelectedStudentForUpdate(null);
      setUpdateStatus("");
    } catch (err) {
      console.error("Failed to update attendance", err);
      toast.error(err.response?.data?.error || "Failed to update attendance");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800 border-green-200";
      case "absent":
        return "bg-red-100 text-red-800 border-red-200";
      case "late":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4" />;
      case "absent":
        return <XCircle className="h-4 w-4" />;
      case "late":
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Desktop Table View for taking attendance
  const DesktopTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Roll No</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-32">Class</TableHead>
            <TableHead className="w-64">Attendance Status</TableHead>
            <TableHead className="w-48">Current Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-medium">
                <div className="font-bold">{student.roll_no || "N/A"}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{student.student_name}</div>
                {student.email && (
                  <div className="text-xs text-gray-500">
                    {student.student_email}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {student.class_name ||
                    classes.find((c) => c.id === parseInt(selectedClassId))
                      ?.name ||
                    "N/A"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      attendanceStatus[student.student_id] === "present"
                        ? "default"
                        : "outline"
                    }
                    className={`${attendanceStatus[student.student_id] === "present"
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                      }`}
                    onClick={() =>
                      handleStatusChange(student.student_id, "present")
                    }
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      attendanceStatus[student.student_id] === "absent"
                        ? "default"
                        : "outline"
                    }
                    className={`${attendanceStatus[student.student_id] === "absent"
                      ? "bg-red-600 hover:bg-red-700"
                      : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                      }`}
                    onClick={() =>
                      handleStatusChange(student.student_id, "absent")
                    }
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Absent
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      attendanceStatus[student.student_id] === "late"
                        ? "default"
                        : "outline"
                    }
                    className={`${attendanceStatus[student.student_id] === "late"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "border-yellow-200 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                      }`}
                    onClick={() =>
                      handleStatusChange(student.student_id, "late")
                    }
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Late
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      attendanceStatus[student.student_id] === "excused"
                        ? "default"
                        : "outline"
                    }
                    className={`${attendanceStatus[student.student_id] === "excused"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                      }`}
                    onClick={() =>
                      handleStatusChange(student.student_id, "excused")
                    }
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Excused
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${getStatusColor(
                    attendanceStatus[student.student_id]
                  )}`}
                >
                  {getStatusIcon(attendanceStatus[student.student_id])}
                  <span className="font-medium capitalize">
                    {attendanceStatus[student.student_id]}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Desktop Table View for viewing/updating today's attendance
  const TodayAttendanceTableView = () => (
    <div className="rounded-md border">
      <div className="p-4 bg-green-50 border-b">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-700">
            Today's Attendance ({todayAttendanceData.length} records)
          </span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Attendance for today ({date}) has already been submitted. Click the
          edit icon to update individual student status.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Roll No</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-32">Class</TableHead>
            <TableHead className="w-32">Status</TableHead>
            <TableHead className="w-48">Recorded At</TableHead>
            <TableHead className="w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {todayAttendanceData.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">
                <div className="font-bold">{record.roll_no || "N/A"}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{record.student_name}</div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{record.class_name}</Badge>
              </TableCell>
              <TableCell>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${getStatusColor(
                    record.status
                  )}`}
                >
                  {getStatusIcon(record.status)}
                  <span className="font-medium capitalize">
                    {record.status}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {new Date(record.recorded_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </TableCell>
              <TableCell>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-3">
                    <div className="space-y-2">
                      <div className="font-medium text-sm">
                        Update Attendance
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant={
                            record.status === "present" ? "default" : "outline"
                          }
                          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                          onClick={() => openUpdateDialog(record)}
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            record.status === "absent" ? "default" : "outline"
                          }
                          className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                          onClick={() => openUpdateDialog(record)}
                        >
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            record.status === "late" ? "default" : "outline"
                          }
                          className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                          onClick={() => openUpdateDialog(record)}
                        >
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            record.status === "excused" ? "default" : "outline"
                          }
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                          onClick={() => openUpdateDialog(record)}
                        >
                          Excused
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openUpdateDialog(record)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Update Status
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Mobile Card View for taking attendance
  const MobileCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <Card key={student.student_id} className="relative">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">
                    {student.student_name}
                  </div>
                  {student.roll_no && (
                    <Badge variant="outline" className="text-xs">
                      #{student.roll_no}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {student.class_name ||
                    classes.find((c) => c.id === parseInt(selectedClassId))
                      ?.name ||
                    "N/A"}
                </div>
                {student.email && (
                  <div className="text-xs text-gray-400 mt-1">
                    {student.student_email}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Attendance</Label>
              <div className="grid grid-cols-2 gap-2">
                {["present", "absent", "late", "excused"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      handleStatusChange(student.student_id, status)
                    }
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                    className={`
                      p-2 text-sm font-medium rounded-md border cursor-pointer transition-all
                      ${isTodayAttendanceTaken && isSelectedDateToday()
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                      }
                      ${attendanceStatus[student.student_id] === status
                        ? getStatusColor(status) +
                        " ring-2 ring-offset-2 ring-opacity-50"
                        : "border-gray-200 hover:bg-gray-50"
                      }
                      ${status === "present"
                        ? "ring-green-300"
                        : status === "absent"
                          ? "ring-red-300"
                          : status === "late"
                            ? "ring-yellow-300"
                            : "ring-blue-300"
                      }
                    `}
                  >
                    <span className="capitalize">{status}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${getStatusColor(
                  attendanceStatus[student.student_id] || "present"
                )}`}
              >
                {getStatusIcon(
                  attendanceStatus[student.student_id] || "present"
                )}
                <span className="capitalize font-medium">
                  {attendanceStatus[student.student_id] || "present"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Mobile Card View for viewing/updating today's attendance
  const TodayAttendanceCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {todayAttendanceData.map((record) => (
        <Card key={record.id} className="relative">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">
                    {record.student_name}
                  </div>
                  {record.roll_no && (
                    <Badge variant="outline" className="text-xs">
                      #{record.roll_no}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">{record.class_name}</div>
              </div>
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => openUpdateDialog(record)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button> */}
            </div>

            <div className="mb-4">
              <div
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(
                  record.status
                )}`}
              >
                {getStatusIcon(record.status)}
                <span className="font-medium capitalize">{record.status}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Recorded:{" "}
              {new Date(record.recorded_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>

            <div className="mt-4 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => openUpdateDialog(record)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const selectedClassName =
    classes.find((c) => c.id === parseInt(selectedClassId))?.name || "Class";

  const TodayAttendanceTakenMessage = () => (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 p-2 rounded-full">
            <CheckSquare className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              Attendance Records Found
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Attendance for {date === new Date().toISOString().split("T")[0] ? "today" : date} has been submitted for {selectedClassName}.
              You can update individual status below.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="hidden sm:flex border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <Eye className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const canSubmitAttendance = !isTodayAttendanceTaken;
  // const canSubmitAttendance = !(isTodayAttendanceTaken && isSelectedDateToday());

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full mx-auto p-4 md:p-6">

      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Mark Attendance</h1>
            <p className="mt-2 text-emerald-100/90 text-lg">
              Take or update daily attendance for your supervised classes.
            </p>
          </div>
          {selectedClassId && (
            <div className="bg-white/20 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10">
              <span className="font-medium text-emerald-50 block uppercase tracking-wider text-xs">Current Class</span>
              <span className="text-xl font-bold">{selectedClassName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Class Selection & Date */}
        <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="class-select">Select Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={loading}
                >
                  <SelectTrigger id="class-select">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem
                        key={classItem.id}
                        value={classItem.id.toString()}
                      >
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selector */}
              <div className="flex-1 space-y-2">
                <Label htmlFor="date-select">Attendance Date</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Input
                    id="date-select"
                    type="date"
                    value={date}
                    max={new Date().toISOString().split("T")[0]}
                    disabled={true}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* <div className="flex-1 space-y-2 min-w-[200px]">
                <Label>Attendance Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div> */}

              <Button
                variant="outline"
                className={`w-full md:w-auto ${loading ? 'opacity-50' : ''}`}
                onClick={() => {
                  if (selectedClassId) {
                    loadClassStudents();
                    checkTodayAttendance();
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh List
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Global Actions (Mark All) - Only show if not already submitted */}
        {canSubmitAttendance && students.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center md:justify-end items-center bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-xl border border-dashed">
            <span className="text-sm font-medium text-muted-foreground mr-2">Quick Mark All:</span>
            <Button size="sm" variant="outline" onClick={() => markAll("present")} className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 mr-1" /> Present
            </Button>
            <Button size="sm" variant="outline" onClick={() => markAll("absent")} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 mr-1" /> Absent
            </Button>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
            Loading students...
          </div>
        ) : (
          <>
            {isTodayAttendanceTaken ? (
              <div className="space-y-6">
                <TodayAttendanceTakenMessage />

                {/* Show different views based on screen size */}
                <div className="hidden lg:block overflow-x-auto">
                  <TodayAttendanceTableView />
                </div>
                <div className="lg:hidden">
                  <TodayAttendanceCardView />
                </div>
              </div>
            ) : (
              <>
                {students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    No students found for this class.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <DesktopTableView />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                      <MobileCardView />
                    </div>

                    {/* Submit Button */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t z-50 md:relative md:bg-transparent md:border-0 md:p-0">
                      <div className="max-w-7xl mx-auto flex justify-end">
                        <Button
                          size="lg"
                          onClick={handleSubmitAttendance}
                          disabled={submitting}
                          className="w-full md:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
                        >
                          {submitting ? (
                            "Submitting..."
                          ) : (
                            <>
                              <Save className="h-5 w-5 mr-2" />
                              Submit Attendance ({students.length})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Spacer for fixed bottom button on mobile */}
                    <div className="h-20 md:hidden"></div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {/* Update Attendance Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
            <DialogDescription>
              Update attendance status for{" "}
              {selectedStudentForUpdate?.student_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="font-medium">Current Status:</div>
              <div
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getStatusColor(
                  selectedStudentForUpdate?.status
                )}`}
              >
                {getStatusIcon(selectedStudentForUpdate?.status)}
                <span className="font-medium capitalize">
                  {selectedStudentForUpdate?.status}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Select New Status:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={updateStatus === "present" ? "default" : "outline"}
                  className={
                    updateStatus === "present"
                      ? "bg-green-600 hover:bg-green-700"
                      : "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/30"
                  }
                  onClick={() => setUpdateStatus("present")}
                >
                  Present
                </Button>
                <Button
                  variant={updateStatus === "absent" ? "default" : "outline"}
                  className={
                    updateStatus === "absent"
                      ? "bg-red-600 hover:bg-red-700"
                      : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
                  }
                  onClick={() => setUpdateStatus("absent")}
                >
                  Absent
                </Button>
                <Button
                  variant={updateStatus === "late" ? "default" : "outline"}
                  className={
                    updateStatus === "late"
                      ? "bg-yellow-600 hover:bg-yellow-700"
                      : "border-yellow-200 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                  }
                  onClick={() => setUpdateStatus("late")}
                >
                  Late
                </Button>
                <Button
                  variant={updateStatus === "excused" ? "default" : "outline"}
                  className={
                    updateStatus === "excused"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  }
                  onClick={() => setUpdateStatus("excused")}
                >
                  Excused
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAttendance}
              disabled={
                updating ||
                !updateStatus ||
                updateStatus === selectedStudentForUpdate?.status
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Attendance
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}