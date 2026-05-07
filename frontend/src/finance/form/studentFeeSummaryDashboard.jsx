// src/pages/finance/StudentFeeSummary.js
import React, { useState, useEffect } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  RefreshCw,
  DollarSign,
  User,
  School,
  FileText,
  TrendingUp,
  TrendingDown,
  IndianRupeeIcon
} from "lucide-react";
import { toast } from "sonner";

export default function StudentFeeSummary() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSummaries, setStudentSummaries] = useState({});

  const [academicYears, setAcademicYears] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filterAcademicYear, setFilterAcademicYear] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadStudents();
    loadAllGradesAndClasses();
    loadAcademicYears();
  }, []);

  async function loadAcademicYears() {
    try {
      const res = await API.get("/admin/get/academic-years?limit=100");
      setAcademicYears(res.data.academic_years || []);
    } catch (err) {
      console.error("Failed to load academic years", err);
    }
  }

  async function loadAllGradesAndClasses() {
    try {
      const [gradesRes, classesRes] = await Promise.all([
        API.get("/admin/get/grades"),
        API.get("/admin/get/classes")
      ]);
      setAllGrades(gradesRes.data.grades || []);
      setAllClasses(classesRes.data.classes || []);
    } catch (err) {
      console.error("Failed to load grades/classes", err);
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.class_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function loadStudents() {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (filterGrade !== "all") params.grade_id = filterGrade;
      if (filterClass !== "all") params.class_id = filterClass;

      const res = await API.get("/students/get/student", { params });
      const studentsList = res.data.students || res.data || [];
      setStudents(studentsList);
      setFilteredStudents(studentsList);
    } catch (err) {
      console.error("Failed to load students", err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentSummary(studentId) {
    setLoadingSummaries(prev => ({ ...prev, [studentId]: true }));

    try {
      const params = {};
      if (filterAcademicYear !== "all") params.academic_year_id = filterAcademicYear;

      const res = await API.get(`/fee/list/payaments/student-summary/${studentId}`, { params });
      setStudentSummaries(prev => ({
        ...prev,
        [studentId]: res.data
      }));
    } catch (err) {
      console.error(`Failed to load summary for student ${studentId}`, err);
      toast.error(`Failed to load fee summary`);
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [studentId]: false }));
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40">Partially Paid</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const calculateTotalOutstanding = () => {
    return Object.values(studentSummaries).reduce((total, summary) => {
      return total + (summary.outstanding || 0);
    }, 0);
  };

  const calculateTotalInvoices = () => {
    return Object.values(studentSummaries).reduce((total, summary) => {
      return total + (summary.invoices?.length || 0);
    }, 0);
  };

  return (
    <div className="p-3 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Fee Summary</h1>
          <p className="text-muted-foreground mt-1">
            Overview of student fee payments and outstanding balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadStudents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Invoices</p>
                <p className="text-2xl font-bold">{calculateTotalInvoices()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(calculateTotalOutstanding())}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">
                  {[...new Set(students.map(s => s.class_id))].length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <School className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Academic Year (for summary)</label>
              <Select value={filterAcademicYear} onValueChange={(val) => { setFilterAcademicYear(val); setStudentSummaries({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Current Year</SelectItem>
                  {academicYears.map(ay => (
                    <SelectItem key={ay.id} value={ay.id.toString()}>{ay.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <Select value={filterGrade} onValueChange={(val) => { setFilterGrade(val); setFilterClass("all"); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {allGrades.map(g => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={filterClass} onValueChange={(val) => { setFilterClass(val); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {allClasses
                    .filter(c => filterGrade === "all" || c.grade_id.toString() === filterGrade)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setFilterAcademicYear("all");
                setFilterGrade("all");
                setFilterClass("all");
                setSearchQuery("");
                loadStudents();
              }}>
                Reset Filters
              </Button>
              <Button onClick={loadStudents}>
                Apply Student Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List with Fee Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Students Fee Status</CardTitle>
          <CardDescription>
            Click on a student to view their detailed fee summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No students found</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                {searchQuery ? "Try a different search query" : "No students available"}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((student) => (
                <Card key={student.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">{student.user_name}</h3>
                                <Badge variant="outline" className="text-xs">
                                  #{student.roll_no || student.id}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {student.class_name || `Class ${student.class_id}`}
                                {student.email && ` • ${student.user_email}`}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => loadStudentSummary(student.id)}
                            disabled={loadingSummaries[student.id]}
                          >
                            {loadingSummaries[student.id] ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <IndianRupeeIcon className="h-4 w-4 mr-2" />
                            )}
                            View Fee Summary
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => window.open(`/school/finance/invoices?student_id=${student.id}`, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            View Invoices
                          </Button>
                        </div>
                      </div>
                    </div>

                    {studentSummaries[student.id] && (
                      <div className="p-6 bg-muted/50">
                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Fee Summary</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-background border rounded">
                              <div className="text-sm text-muted-foreground">Outstanding Balance</div>
                              <div className={`text-xl font-bold ${studentSummaries[student.id].outstanding > 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-green-600 dark:text-green-400'
                                }`}>
                                {formatCurrency(studentSummaries[student.id].outstanding)}
                              </div>
                            </div>
                            <div className="p-3 bg-background border rounded">
                              <div className="text-sm text-muted-foreground">Total Invoices</div>
                              <div className="text-xl font-bold">
                                {studentSummaries[student.id].invoices?.length || 0}
                              </div>
                            </div>
                          </div>
                        </div>

                        {studentSummaries[student.id].invoices &&
                          studentSummaries[student.id].invoices.length > 0 && (
                            <>
                              <div className="hidden xl:block rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Invoice ID</TableHead>
                                      <TableHead>Period</TableHead>
                                      <TableHead>Amount Due</TableHead>
                                      <TableHead>Amount Paid</TableHead>
                                      <TableHead>Status</TableHead>
                                      <TableHead>Created</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {studentSummaries[student.id].invoices.map((invoice) => (
                                      <TableRow key={invoice.id}>
                                        <TableCell className="font-mono">
                                          INV-{invoice.id.toString().padStart(4, '0')}
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm">
                                            {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                          {formatCurrency(invoice.amount_due)}
                                        </TableCell>
                                        <TableCell className="font-mono text-green-600 dark:text-green-400">
                                          {formatCurrency(invoice.amount_paid)}
                                        </TableCell>
                                        <TableCell>
                                          {getStatusBadge(invoice.status)}
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm text-muted-foreground">
                                            {formatDate(invoice.created_at)}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                              <div className="grid grid-cols-1 gap-4 md:hidden">
                                {studentSummaries[student.id].invoices.map((invoice) => (
                                  <Card key={invoice.id} className="p-4 flex flex-col gap-3 border-l-4 border-l-primary shadow-sm bg-background">
                                    <div className="flex justify-between items-start">
                                      <div className="font-mono font-semibold text-primary">
                                        INV-{invoice.id.toString().padStart(4, '0')}
                                      </div>
                                      <div>
                                        {getStatusBadge(invoice.status)}
                                      </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                                      <div>
                                        <div className="text-xs text-muted-foreground">Amount Due</div>
                                        <div className="font-semibold">{formatCurrency(invoice.amount_due)}</div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs text-muted-foreground">Amount Paid</div>
                                        <div className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(invoice.amount_paid)}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right mt-1">
                                      Created: {formatDate(invoice.created_at)}
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadStudents}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(filteredStudents.length / pageSize) || 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredStudents.length / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(filteredStudents.length / pageSize) || filteredStudents.length === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}