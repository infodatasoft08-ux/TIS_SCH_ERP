// src/pages/finance/PaymentHistory.js
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
  Filter,
  Download,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filterAcademicYear, setFilterAcademicYear] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);
  const [totalPaymentsAmount, setTotalPaymentsAmount] = useState(0);
  const [uniqueStudentsCount, setUniqueStudentsCount] = useState(0);

  useEffect(() => {
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
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterMethod, filterMonth, dateRange, filterAcademicYear, filterGrade, filterClass]);

  useEffect(() => {
    loadPayments();
  }, [currentPage, pageSize, debouncedSearchQuery, filterStatus, filterMethod, filterMonth, dateRange, filterAcademicYear, filterGrade, filterClass]);

  async function loadPayments() {
    setLoading(true);
    try {
      const params = { limit: pageSize, offset: (currentPage - 1) * pageSize, start_date: dateRange.start, end_date: dateRange.end, payment_method: filterMethod };
      if (filterAcademicYear !== "all") params.academic_year_id = filterAcademicYear;
      if (filterGrade !== "all") params.grade_id = filterGrade;
      if (filterClass !== "all") params.class_id = filterClass;
      if (filterMonth !== "all") params.month = filterMonth;
      if (debouncedSearchQuery) params.search = debouncedSearchQuery;

      const res = await API.get(`/fee/list/payments`, { params });
      setPayments(res.data.payments || []);
      setTotalPaymentsCount(res.data.total || 0);
      setTotalPaymentsAmount(res.data.totalAmount || 0);
      setUniqueStudentsCount(res.data.uniqueStudents || 0);
    } catch (err) {
      console.error("Failed to load payments", err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportCSV = async () => {
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        payment_method: filterMethod,
        search: debouncedSearchQuery
      };
      if (filterAcademicYear !== "all") params.academic_year_id = filterAcademicYear;
      if (filterGrade !== "all") params.grade_id = filterGrade;
      if (filterClass !== "all") params.class_id = filterClass;
      if (filterMonth !== "all") params.month = filterMonth;

      const res = await API.get(`/fee/export/payments`, {
        params,
        responseType: "blob",
      });

      const fileName = `payment_history_${new Date().toISOString().split('T')[0]}.csv`;
      const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          // Extract the raw base64 string from data URL
          const base64 = reader.result.split(',')[1];
          sendToMobile(base64, fileName, 'text/csv');
          toast.success("CSV exported successfully");
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        toast.success("CSV exported successfully");
      }
    } catch (err) {
      console.error("Failed to export CSV", err);
      toast.error("No payment records found for the selected criteria");
    }
  };

  const getMethodBadge = (method) => {
    if (!method) return null;
    
    if (method.includes(',')) {
      return (
        <div className="flex flex-col gap-1 items-start">
          {method.split(',').map((m, i) => (
             <Badge key={i} variant="outline" className="whitespace-nowrap bg-muted/50">
               {m.trim()}
             </Badge>
          ))}
        </div>
      );
    }

    const mLower = method.toLowerCase();
    if (mLower.includes('cash'))
      return <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40">{method}</Badge>;
    if (mLower.includes('bank_transfer') || mLower.includes('transfer'))
      return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">{method}</Badge>;
    if (mLower.includes('cheque'))
      return <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40">{method}</Badge>;
    if (mLower.includes('card'))
      return <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40">{method}</Badge>;
    if (mLower.includes('online') || mLower.includes('upi'))
      return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">{method}</Badge>;
    
    return <Badge variant="outline" className="capitalize">{method}</Badge>;
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



  return (
    <div className="p-2 sm:p-4 md:p-6 pb-28 sm:pb-12 space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Payment History</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            View all payment transactions recorded in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPayments}
            disabled={loading}
            className="flex-1 sm:flex-none h-9 text-xs font-bold rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none h-9 text-xs font-bold rounded-xl"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards (Premium Aligned KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-5 bg-white dark:bg-gray-900 hover:shadow-md transition-all">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Payments</span>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{totalPaymentsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-5 bg-white dark:bg-gray-900 hover:shadow-md transition-all">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</span>
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/50 text-blue-600 dark:text-blue-400">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 truncate">{formatCurrency(totalPaymentsAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-5 bg-white dark:bg-gray-900 hover:shadow-md transition-all">
          <CardContent className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unique Students</span>
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 text-purple-600 dark:text-purple-400">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{uniqueStudentsCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters (Mobile 2-Column Grid Hardened & Aligned) */}
      <Card className="rounded-2xl border shadow-sm bg-white dark:bg-gray-900">
        <CardContent className="p-3 sm:p-6 space-y-3">
          {/* Row 1: Academic Year & Grade */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</label>
              <Select value={filterAcademicYear} onValueChange={(val) => { setFilterAcademicYear(val); loadPayments(); }}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(ay => (
                    <SelectItem key={ay.id} value={ay.id.toString()}>{ay.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade / Level</label>
              <Select value={filterGrade} onValueChange={(val) => { setFilterGrade(val); setFilterClass("all"); loadPayments(); }}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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

            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Class / Section</label>
              <Select value={filterClass} onValueChange={(val) => { setFilterClass(val); loadPayments(); }}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
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

            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</label>
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Search & Month */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by student or reference..."
                  className="pl-9 h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: From / To Dates */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Date</label>
              <DatePicker
                value={dateRange.start}
                onChange={(date) => setDateRange({ ...dateRange, start: date })}
                placeholder="dd/mm/yyyy"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">To Date</label>
              <DatePicker
                value={dateRange.end}
                onChange={(date) => setDateRange({ ...dateRange, end: date })}
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 self-start sm:self-auto">
              Showing {payments.length} of {totalPaymentsCount} payments
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="default"
                size="sm"
                className="flex-1 sm:flex-none h-9 text-xs font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  loadPayments();
                }}
              >
                Apply Filters
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 sm:flex-none h-9 text-xs font-bold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setFilterMethod("all");
                  setFilterMonth("all");
                  setFilterAcademicYear("all");
                  setFilterGrade("all");
                  setFilterClass("all");
                  setDateRange({ start: "", end: "" });
                  loadPayments();
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            Complete history of all payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No payments found</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                {searchQuery || filterMethod !== "all" || dateRange.start || dateRange.end
                  ? "Try adjusting your filters"
                  : "No payment records available"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">{formatDate(payment.payment_date)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {payment.student_name || `Student ${payment.student_name}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {payment.student_id}
                            <div className="text-xs text-muted-foreground">{payment.academic_year_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">
                            INV-{payment.invoice_id.toString().padStart(4, '0')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getMethodBadge(payment.payment_method)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {formatCurrency(payment.paid_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">User #{payment.processed_by}</div>
                        </TableCell>
                      </TableRow>
                    ))}

                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {payments.map((payment) => (
                  <Card key={payment.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">
                          {payment.student_name || `Student ${payment.student_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          ID: {payment.student_id} • User #{payment.processed_by}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">
                          {formatCurrency(payment.paid_amount)}
                        </div>
                        <div className="mt-1">
                          {getMethodBadge(payment.payment_method)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-1 border-t pt-3">
                      <div>
                        <div className="text-muted-foreground">Date</div>
                        <div className="font-medium">{formatDate(payment.payment_date)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Invoice & Ref</div>
                        <div className="font-mono font-medium">
                          INV-{payment.invoice_id.toString().padStart(4, '0')}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground break-all">
                          {payment.reference || "-"}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* {filteredPayments.length > 0 && (
                  <Card className="p-4 bg-muted/30 border-primary/20 flex justify-between items-center">
                    <span className="font-bold">Total Payments:</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(calculateTotalPayments())}
                    </span>
                  </Card>
                )} */}
              </div>

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
                    onClick={loadPayments}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(totalPaymentsCount / pageSize) || 1}
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalPaymentsCount / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(totalPaymentsCount / pageSize) || totalPaymentsCount === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}