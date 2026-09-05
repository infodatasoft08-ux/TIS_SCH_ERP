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
  MoreVertical,
  Search,
  Check,
  UserCheck
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
  const [selectedStudentForUpdate, setSelectedStudentForUpdate] = useState(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
      setStatusFilter("all");
      loadClassStudents();
      checkTodayAttendance();
    }
  }, [selectedClassId, date]);

  const isSelectedDateToday = () => {
    const today = new Date().toISOString().split("T")[0];
    return date === today;
  };

  async function loadSupervisedClasses() {
    try {
      if (user.role_id === 2 && user.supervised_classes) {
        setClasses(user.supervised_classes);
        if (user.supervised_classes.length > 0) {
          setSelectedClassId(user.supervised_classes[0].id.toString());
        }
      } else if (user.role_id === 3) {
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

      // Initialize attendance status for all students to present by default
      const initialStatus = {};
      studentsList.forEach((student) => {
        initialStatus[student.student_id] = "present";
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

  async function checkTodayAttendance() {
    if (!selectedClassId) return;

    try {
      const res = await API.get(`/attendance/get/attend/summery`, {
        params: {
          class_id: selectedClassId,
          from: date,
          to: date
        }
      });

      if (res.data.records && res.data.records.length > 0) {
        setIsTodayAttendanceTaken(true);
        setTodayAttendanceData(res.data.records);
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
    toast.info(`Marked all students as ${status.toUpperCase()}`);
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

      await API.post(`/attendance/add/attendance`, {
        records: attendanceRecords
      });

      toast.success(`Attendance recorded for ${students.length} students`);
      await checkTodayAttendance();
    } catch (err) {
      console.error("Failed to submit attendance", err);
      toast.error("Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdateDialog = (studentRecord) => {
    setSelectedStudentForUpdate(studentRecord);
    setUpdateStatus(studentRecord.status);
    setUpdateDialogOpen(true);
  };

  const handleUpdateAttendance = async () => {
    if (!selectedStudentForUpdate || !updateStatus) return;

    setUpdating(true);
    try {
      await API.put(`/attendance/update/attend/update-single`, {
        attendance_id: selectedStudentForUpdate.id,
        status: updateStatus,
        recorded_by: user.id
      });

      toast.success(`Attendance updated for ${selectedStudentForUpdate.student_name}`);
      await checkTodayAttendance();

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

  // Live attendance counter calculation (works for both marking phase & submitted phase)
  const attendanceCounts = useMemo(() => {
    let present = 0, absent = 0, late = 0, excused = 0, total = 0;
    if (isTodayAttendanceTaken && todayAttendanceData.length > 0) {
      total = todayAttendanceData.length;
      todayAttendanceData.forEach((rec) => {
        const st = (rec.status || "").toLowerCase();
        if (st === "present") present++;
        else if (st === "absent") absent++;
        else if (st === "late") late++;
        else if (st === "excused") excused++;
      });
    } else {
      total = students.length;
      students.forEach((s) => {
        const st = (attendanceStatus[s.student_id] || "present").toLowerCase();
        if (st === "present") present++;
        else if (st === "absent") absent++;
        else if (st === "late") late++;
        else if (st === "excused") excused++;
      });
    }
    return { present, absent, late, excused, total };
  }, [isTodayAttendanceTaken, todayAttendanceData, students, attendanceStatus]);

  // Filtered Students list (for marking mode) by search query & status filter
  const filteredStudents = useMemo(() => {
    let list = students;
    if (statusFilter !== "all") {
      list = list.filter(
        (s) => (attendanceStatus[s.student_id] || "present").toLowerCase() === statusFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          (s.student_name && s.student_name.toLowerCase().includes(q)) ||
          (s.roll_no && String(s.roll_no).toLowerCase().includes(q)) ||
          (s.student_email && s.student_email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [students, attendanceStatus, statusFilter, searchQuery]);

  // Filtered Submitted Attendance Records (for update mode) by search query & status filter
  const filteredTodayAttendanceRecords = useMemo(() => {
    let list = todayAttendanceData;
    if (statusFilter !== "all") {
      list = list.filter(
        (r) => (r.status || "").toLowerCase() === statusFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.student_name && r.student_name.toLowerCase().includes(q)) ||
          (r.roll_no && String(r.roll_no).toLowerCase().includes(q)) ||
          (r.student_email && r.student_email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [todayAttendanceData, statusFilter, searchQuery]);

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "absent":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300";
      case "late":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300";
      case "excused":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
      case "absent":
        return <XCircle className="h-3.5 w-3.5 text-rose-600" />;
      case "late":
        return <Clock className="h-3.5 w-3.5 text-amber-600" />;
      default:
        return null;
    }
  };

  const DesktopTableView = () => (
    <div className="rounded-xl border shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
          <TableRow>
            <TableHead className="w-20">Roll No</TableHead>
            <TableHead>Student Name</TableHead>
            <TableHead className="w-32">Class</TableHead>
            <TableHead className="w-64">Attendance Mark</TableHead>
            <TableHead className="w-40">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-bold text-gray-800 dark:text-gray-200">
                {student.roll_no || "N/A"}
              </TableCell>
              <TableCell>
                <div className="font-semibold text-gray-900 dark:text-white">{student.student_name}</div>
                {student.student_email && (
                  <div className="text-xs text-gray-400">{student.student_email}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {student.class_name || classes.find((c) => c.id === parseInt(selectedClassId))?.name || "N/A"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={attendanceStatus[student.student_id] === "present" ? "default" : "outline"}
                    className={attendanceStatus[student.student_id] === "present" ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold" : "text-emerald-700 hover:bg-emerald-50"}
                    onClick={() => handleStatusChange(student.student_id, "present")}
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={attendanceStatus[student.student_id] === "absent" ? "default" : "outline"}
                    className={attendanceStatus[student.student_id] === "absent" ? "bg-rose-600 hover:bg-rose-700 text-white font-bold" : "text-rose-700 hover:bg-rose-50"}
                    onClick={() => handleStatusChange(student.student_id, "absent")}
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Absent
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={attendanceStatus[student.student_id] === "late" ? "default" : "outline"}
                    className={attendanceStatus[student.student_id] === "late" ? "bg-amber-500 hover:bg-amber-600 text-white font-bold" : "text-amber-700 hover:bg-amber-50"}
                    onClick={() => handleStatusChange(student.student_id, "late")}
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Late
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={attendanceStatus[student.student_id] === "excused" ? "default" : "outline"}
                    className={attendanceStatus[student.student_id] === "excused" ? "bg-blue-600 hover:bg-blue-700 text-white font-bold" : "text-blue-700 hover:bg-blue-50"}
                    onClick={() => handleStatusChange(student.student_id, "excused")}
                    disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  >
                    Excused
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(attendanceStatus[student.student_id])}`}>
                  {getStatusIcon(attendanceStatus[student.student_id])}
                  <span>{attendanceStatus[student.student_id]}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const TodayAttendanceTableView = () => (
    <div className="rounded-xl border shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-emerald-800 dark:text-emerald-300">
            Submitted Attendance ({todayAttendanceData.length} Students)
          </span>
        </div>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Attendance for today ({date}) has already been recorded. Click the edit icon to update status.
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
          {filteredTodayAttendanceRecords.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500 font-medium">
                No attendance records matching status or search criteria.
              </TableCell>
            </TableRow>
          ) : (
            filteredTodayAttendanceRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-bold">{record.roll_no || "N/A"}</TableCell>
                <TableCell className="font-semibold">{record.student_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{record.class_name}</Badge></TableCell>
                <TableCell>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span>{record.status}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {new Date(record.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openUpdateDialog(record)}>
                    <Edit className="h-4 w-4 text-gray-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Fast Touch-Optimized Mobile View
  const MobileCardView = () => (
    <div className="space-y-3 pb-24">
      {filteredStudents.map((student) => {
        const currentStatus = attendanceStatus[student.student_id] || "present";
        return (
          <Card 
            key={student.student_id} 
            className="rounded-2xl border shadow-sm transition-all overflow-hidden bg-white dark:bg-gray-900"
          >
            <CardContent className="p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-gray-900 dark:text-white truncate">
                      {student.student_name}
                    </span>
                    {student.roll_no && (
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-[10px] font-bold px-1.5 py-0.5 border-none shrink-0">
                        Roll #{student.roll_no}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${getStatusColor(currentStatus)}`}>
                  {getStatusIcon(currentStatus)}
                  <span>{currentStatus}</span>
                </div>
              </div>

              {/* 4 Touch-Optimized Large Tap Buttons */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {/* Present Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.student_id, "present")}
                  disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border active:scale-95 ${
                    currentStatus === "present"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50"
                      : "bg-emerald-50/50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300"
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>PRESENT</span>
                </button>

                {/* Absent Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.student_id, "absent")}
                  disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border active:scale-95 ${
                    currentStatus === "absent"
                      ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/50"
                      : "bg-rose-50/50 text-rose-700 border-rose-200/80 hover:bg-rose-100 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-300"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>ABSENT</span>
                </button>

                {/* Late Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.student_id, "late")}
                  disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border active:scale-95 ${
                    currentStatus === "late"
                      ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/50"
                      : "bg-amber-50/50 text-amber-700 border-amber-200/80 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>LATE</span>
                </button>

                {/* Excused Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange(student.student_id, "excused")}
                  disabled={isTodayAttendanceTaken && isSelectedDateToday()}
                  className={`py-2 px-1 rounded-xl text-xs font-extrabold transition-all duration-200 flex flex-col items-center justify-center gap-0.5 border active:scale-95 ${
                    currentStatus === "excused"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50"
                      : "bg-blue-50/50 text-blue-700 border-blue-200/80 hover:bg-blue-100 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-300"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>LEAVE</span>
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const TodayAttendanceCardView = () => (
    <div className="space-y-3 pb-6">
      {filteredTodayAttendanceRecords.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500 font-medium border-2 border-dashed rounded-2xl bg-white dark:bg-gray-900">
          No attendance records matching status or search criteria.
        </div>
      ) : (
        filteredTodayAttendanceRecords.map((record) => (
          <Card key={record.id} className="rounded-2xl border shadow-sm p-3.5 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{record.student_name}</span>
                  {record.roll_no && <Badge variant="outline" className="text-[10px]">#{record.roll_no}</Badge>}
                </div>
                <p className="text-xs text-gray-400">{record.class_name}</p>
              </div>
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(record.status)}`}>
                {getStatusIcon(record.status)}
                <span>{record.status}</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t flex items-center justify-between text-xs">
              <span className="text-gray-400">
                Recorded: {new Date(record.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => openUpdateDialog(record)}>
                <Edit className="h-3 w-3 mr-1" /> Update
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );

  const selectedClassName = classes.find((c) => c.id === parseInt(selectedClassId))?.name || "Class";

  const TodayAttendanceTakenMessage = () => (
    <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl shadow-sm">
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shrink-0">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-200">
              Attendance Records Found
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Attendance for {date === new Date().toISOString().split("T")[0] ? "today" : date} submitted for {selectedClassName}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const canSubmitAttendance = !isTodayAttendanceTaken;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 w-full mx-auto p-2 sm:p-4 md:p-6 pb-16 sm:pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-4 sm:p-6 shadow-lg text-white">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Mark Attendance</h1>
            <p className="mt-0.5 text-emerald-100 text-xs sm:text-sm font-medium">
              Daily touch attendance for supervised classes.
            </p>
          </div>
          {selectedClassId && (
            <div className="bg-white/20 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/20 self-start sm:self-auto">
              <span className="font-bold text-emerald-50 uppercase tracking-wider text-[10px] block">Current Class</span>
              <span className="text-base sm:text-lg font-extrabold">{selectedClassName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Class Selection & Refresh (Adaptive Light/Dark Theme Grid) */}
        <Card className="rounded-2xl border shadow-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <CardContent className="p-0 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 items-end">
              <div className="space-y-1">
                <Label htmlFor="class-select" className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Select Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={loading}
                >
                  <SelectTrigger id="class-select" className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem
                        key={classItem.id}
                        value={classItem.id.toString()}
                        className="text-xs font-medium"
                      >
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="date-select" className="text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Attendance Date</Label>
                <Input
                  id="date-select"
                  type="date"
                  value={date}
                  max={new Date().toISOString().split("T")[0]}
                  disabled={true}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="col-span-2 md:col-span-1">
                <Button
                  variant="outline"
                  className={`w-full h-9 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 ${loading ? 'opacity-50' : ''}`}
                  onClick={() => {
                    if (selectedClassId) {
                      loadClassStudents();
                      checkTodayAttendance();
                    }
                  }}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh List
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar & Interactive Status Filter Counter Bar */}
        {(students.length > 0 || todayAttendanceData.length > 0) && (
          <div className="space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search student by name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs font-medium rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
              />
            </div>

            {/* Interactive Status Filter Pills & Quick Mark All */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-1.5 text-xs font-bold flex-wrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border ${
                    statusFilter === "all"
                      ? "bg-gray-900 text-white border-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-sm"
                      : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                  }`}
                >
                  All ({attendanceCounts.total})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "present" ? "all" : "present")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                    statusFilter === "present"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50"
                      : "bg-emerald-100/80 text-emerald-800 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  <span>🟢</span>
                  <span>{attendanceCounts.present} Present</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === "absent" ? "all" : "absent")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                    statusFilter === "absent"
                      ? "bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-400/50"
                      : "bg-rose-100/80 text-rose-800 border-rose-200 hover:bg-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                  }`}
                >
                  <span>🔴</span>
                  <span>{attendanceCounts.absent} Absent</span>
                </button>
                {attendanceCounts.late > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === "late" ? "all" : "late")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                      statusFilter === "late"
                        ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-400/50"
                        : "bg-amber-100/80 text-amber-800 border-amber-200 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                    }`}
                  >
                    <span>🟡</span>
                    <span>{attendanceCounts.late} Late</span>
                  </button>
                )}
                {attendanceCounts.excused > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === "excused" ? "all" : "excused")}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold transition-all cursor-pointer border flex items-center gap-1 ${
                      statusFilter === "excused"
                        ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50"
                        : "bg-blue-100/80 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                    }`}
                  >
                    <span>🔵</span>
                    <span>{attendanceCounts.excused} Leave</span>
                  </button>
                )}
              </div>

              {canSubmitAttendance && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAll("present")}
                    className="h-7 text-[10px] font-bold px-2 rounded-lg text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                  >
                    All Present
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAll("absent")}
                    className="h-7 text-[10px] font-bold px-2 rounded-lg text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                  >
                    All Absent
                  </Button>
                </div>
              )}
            </div>
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
              <div className="space-y-4">
                <TodayAttendanceTakenMessage />
                <div className="hidden lg:block">
                  <TodayAttendanceTableView />
                </div>
                <div className="lg:hidden">
                  <TodayAttendanceCardView />
                </div>
              </div>
            ) : (
              <>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    No students matching search criteria.
                  </div>
                ) : (
                  <div>
                    {/* Desktop View */}
                    <div className="hidden md:block">
                      <DesktopTableView />
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden">
                      <MobileCardView />
                    </div>

                    {/* Clean Mobile & Desktop Bottom Submit Bar (Adaptive Light & Dark Theme) */}
                    <div className="fixed bottom-0 left-0 right-0 p-3 pb-6 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-2xl z-50 md:sticky md:bottom-6 md:z-40 md:my-6 md:p-4 md:bg-white/90 dark:md:bg-gray-900/90 md:backdrop-blur-xl md:border md:border-gray-200/80 dark:md:border-gray-800 md:rounded-2xl md:shadow-xl transition-all duration-300">
                      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="hidden md:flex items-center gap-3 text-sm">
                          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-sm border border-emerald-200/60 dark:border-emerald-800/60">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">Ready to Submit Attendance</p>
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
                          onClick={handleSubmitAttendance}
                          disabled={submitting}
                          className="w-full md:w-auto text-xs sm:text-sm font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xl hover:shadow-emerald-600/20 px-8 h-11 sm:h-12 rounded-xl flex items-center justify-center gap-2.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          {submitting ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
                          <span>{submitting ? "Submitting Attendance..." : `Submit Attendance (${attendanceCounts.present} Present, ${attendanceCounts.absent} Absent)`}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Single Student Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Update Attendance</DialogTitle>
            <DialogDescription>
              Update status for {selectedStudentForUpdate?.student_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {["present", "absent", "late", "excused"].map((st) => (
                <Button
                  key={st}
                  type="button"
                  variant={updateStatus === st ? "default" : "outline"}
                  className={`capitalize font-bold text-xs ${updateStatus === st ? getStatusColor(st) : ""}`}
                  onClick={() => setUpdateStatus(st)}
                >
                  {st}
                </Button>
              ))}
            </div>
            <Button
              className="w-full font-bold bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpdateAttendance}
              disabled={updating}
            >
              {updating ? "Saving..." : "Save Updated Status"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}