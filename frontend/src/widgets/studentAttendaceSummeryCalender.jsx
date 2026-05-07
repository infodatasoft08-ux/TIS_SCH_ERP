import React, { useEffect, useState } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import DataTable from "./DataTable";
import { DatePicker } from "@/components/ui/date-picker";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentAttendanceSummary() {

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

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classes, setClasses] = useState([]);
  // const [from, setFrom] = useState("2025-11-01");
  // const [to, setTo] = useState("2025-11-30");
  const [from, setFrom] = useState(getOneMonthBefore());
  const [to, setTo] = useState(getCurrentDate());
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({});
  const { user } = useAuth();

  const setMonthRange = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setFrom(startOfMonth.toISOString().split('T')[0]);
    setTo(endOfMonth.toISOString().split('T')[0]);
  };

  const handlePrevMonth = () => {
    const currentFrom = new Date(from);
    const prevMonth = new Date(currentFrom.getFullYear(), currentFrom.getMonth() - 1, 1);
    setMonthRange(prevMonth);
  };

  const handleNextMonth = () => {
    const currentFrom = new Date(from);
    const nextMonth = new Date(currentFrom.getFullYear(), currentFrom.getMonth() + 1, 1);
    setMonthRange(nextMonth);
  };

  const handleQuickRange = (value) => {
    const today = new Date();
    if (value === "this_month") {
      setMonthRange(today);
    } else if (value === "last_month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      setMonthRange(lastMonth);
    } else if (value === "last_3_months") {
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setFrom(threeMonthsAgo.toISOString().split('T')[0]);
      setTo(today.toISOString().split('T')[0]);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentAttendance();
    }
  }, [selectedClassId, from, to]);

  useEffect(() => {
    // Filter records based on search query
    if (searchQuery.trim() === "") {
      setFilteredRecords(attendanceRecords);
    } else {
      const filtered = attendanceRecords.filter(record =>
        record.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecords(filtered);
    }
  }, [searchQuery, attendanceRecords]);

  async function loadClasses() {
    if (!user) return;

    setLoadingClasses(true);
    try {
      if (user.role_id === 2 && user.supervised_classes) {
        // Teacher: Use supervised classes from login response
        setClasses(user.supervised_classes);
        if (user.supervised_classes.length > 0) {
          setSelectedClassId(user.supervised_classes[0].id.toString());
        }
      } else if (user.role_id === 3) {
        // Admin: Fetch all classes from API
        const res = await API.get("/admin/get/classes");
        setClasses(res.data.classes || res.data || []);
        if (res.data.classes?.length > 0) {
          setSelectedClassId(res.data.classes[0].id.toString());
        }
      } else if (user.role_id === 1) {
        // Student: Use their class_id
        if (user.class_id) {
          const res = await API.get("/admin/get/classes");
          const allClasses = res.data.classes || res.data || [];
          const studentClass = allClasses.find(c => c.id === user.class_id);
          if (studentClass) {
            setClasses([studentClass]);
            setSelectedClassId(studentClass.id.toString());
          }
        }
      }
    } catch (err) {
      console.error("Failed to load classes", err);
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadStudentAttendance() {
    if (!selectedClassId) return;

    setLoading(true);
    try {
      const res = await API.get(
        `/attendance/get/attend/summery`,
        {
          params: {
            class_id: selectedClassId,
            from,
            to
          }
        }
      );

      const records = res.data.records || [];
      setAttendanceRecords(records);
      setFilteredRecords(records);
      setStats(res.data.stats || {});

    } catch (err) {
      console.error("Failed to load attendance", err);
      setAttendanceRecords([]);
      setFilteredRecords([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Late</Badge>;
      case "excused":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Excused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const exportToCSV = () => {
    const csvData = filteredRecords.map(record => ({
      Date: formatDate(record.date),
      "Student Name": record.student_name,
      Class: record.class_name,
      Status: record.status.toUpperCase(),
      "Recorded At": formatDate(record.recorded_at) + " " + formatTime(record.recorded_at),
      "Recorded By": record.recorded_by
    }));

    const headers = ["Date", "Student Name", "Class", "Status", "Taken By", "Recorded At"];
    const csv = [
      headers.join(","),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${from}-to-${to}.csv`;
    a.click();
  };


  const attendanceColumns = React.useMemo(() =>
    [
      {
        accessorKey: "attendance_date",
        header: "Date",
        cell: ({ row }) => {
          const dateValue = row.getValue("attendance_date");
          return <div>{formatDate(dateValue)}</div>;
        }
      },
      {
        accessorKey: "student_name",
        header: "Student Name",
        cell: ({ row }) => {
          const studentName = row.getValue("student_name");
          const studentId = row.original.student_id;
          return (
            <div>
              <div className="font-medium">{studentName}</div>
              <div className="text-xs text-gray-500">ID: {studentId}</div>
            </div>
          );
        }
      },
      {
        accessorKey: "class_name",
        header: "Class",
        cell: ({ row }) => <div>{row.getValue("class_name")}</div>
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status");
          return getStatusBadge(status);
        }
      },
      // {
      //     accessorKey: "lesson_name",
      //     header: "Lesson",
      //     cell: ({ row }) => (
      //         <div>{row.getValue("lesson_name") || <span className="text-gray-400">-</span>}</div>
      //     )
      // },
      {
        accessorKey: "Taken_By",
        header: "Taken By",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.getValue("Taken_By")}</div>
            {/* <div className="text-xs text-gray-500">ID: {row.original.recorded_by}</div> */}
          </div>
        )
      },
      {
        accessorKey: "recorded_at",
        header: "Recorded At",
        cell: ({ row }) => {
          const recordedAt = row.getValue("recorded_at");
          return (
            <div>
              <div>{formatDate(recordedAt)}</div>
              <div className="text-xs text-gray-500">{formatTime(recordedAt)}</div>
            </div>
          );
        }
      }
    ], []
  );

  return (
    <div className="p-2 space-y-6">
      {/* FILTER CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Class Selector */}
            <div className="pt-2">
              {(user?.role_id === 3 || user?.role_id === 2) && (
                <ComboboxFormField
                  field={{
                    value: selectedClassId,
                    onChange: setSelectedClassId
                  }}
                  label="Class"
                  items={classes}
                  valueKey="id"
                  labelKey="name"
                  searchKey="name"
                  disabled={loadingClasses}
                  placeholder={
                    loadingClasses
                      ? "Loading classes..."
                      : classes.length === 0
                        ? "No classes available"
                        : "Select a class"
                  }
                  searchPlaceholder="Search class..."
                  emptyMessage="No class found."
                />
              )}
            </div>


            {/* Date Filters */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              {/* <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              /> */}
              <DatePicker
                value={from}
                // onChange={(e) => setFrom(e.target.value)}
                onChange={(date) => setFrom(date)}
                placeholder="dd/mm/yyyy"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <div className="flex gap-1">
                <DatePicker
                  value={to}
                  onChange={(date) => setTo(date)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
            </div>

            {/* Navigation & Quick Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Navigation</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={handlePrevMonth} title="Previous Month">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select onValueChange={handleQuickRange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Quick Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleNextMonth} title="Next Month">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Statistics Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Summary</label>
              <div className="p-3 border rounded">
                {stats.total_records ? (
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-green-600 font-medium">
                        Present:
                      </span>
                      <span className="font-medium">
                        {stats.present_count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600 font-medium">Absent:</span>
                      <span className="font-medium">
                        {stats.absent_count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-600 font-medium">Late:</span>
                      <span className="font-medium">
                        {stats.late_count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600 font-medium">
                        Excused:
                      </span>
                      <span className="font-medium">
                        {stats.excused_count || 0}
                      </span>
                    </div>
                    <div className="pt-1 border-t mt-1 flex justify-between">
                      <span className="font-medium">Total Records:</span>
                      <span className="font-bold">{stats.total_records}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center">
                    No data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {stats.class_name && (
                <span>
                  Class: <span className="font-medium">{stats.class_name}</span>{" "}
                  •{" "}
                </span>
              )}
              {stats.total_students && (
                <span>
                  Students:{" "}
                  <span className="font-medium">{stats.total_students}</span>
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={filteredRecords.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                onClick={loadStudentAttendance}
                disabled={loading || !selectedClassId}
              >
                {loading ? "Loading..." : "Apply Filter"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEARCH AND TABLE CARD */}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <DataTable
            data={filteredRecords}
            columns={attendanceColumns}
            title="Attendance Records"
            description={`Attendance for ${stats.class_name || "selected class"} from ${from} to ${to}`}
            isLoading={loading}
            enableSearch={true}
            searchPlaceholder="Search attendance records..."
            enableColumnVisibility={true}
            enablePagination={true}
            pageSize={10}
            onSearchChange={setSearchQuery}
            searchValue={searchQuery}
            emptyMessage="No attendance records found for the selected criteria."
            onRefresh={loadStudentAttendance}
          />
        </CardContent>
      </Card>
    </div>
  );
}