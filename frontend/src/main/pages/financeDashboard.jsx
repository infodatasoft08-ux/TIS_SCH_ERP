// src/pages/finance/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  School,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  AlertTriangle,
  Megaphone,
  UserCheck,
  CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import AnnouncementDashboard from "@/components/announcements/AnnouncementDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import EmployeeAttendanceCalendar from "@/widgets/employeeAttendanceCalendar";

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    totalCollected: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    activeStudents: 0,
    recentPayments: []
  });
  const [personalAttendance, setPersonalAttendance] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Load recent payments
      const paymentsRes = await API.get(`/fee/list/payments`, {
        params: { limit: 100, offset: 0 }
      });

      // Load invoices summary
      const invoicesRes = await API.get(`/fee/list/invoices`, {
        params: { limit: 100, offset: 0 }
      });

      // Load students
      const studentsRes = await API.get("/students/get/student");

      const payments = paymentsRes.data.payments || [];
      const invoices = invoicesRes.data.invoices || [];
      const students = studentsRes.data.students || studentsRes.data || [];

      // Calculate totals
      const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
      const totalOutstanding = invoices.reduce((sum, inv) =>
        sum + (parseFloat(inv.amount_due || 0) - parseFloat(inv.amount_paid || 0)), 0
      );

      const pendingInvoices = invoices.filter(inv => inv.status !== 'paid').length;
      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;

      const personalRes = await API.get("/analytics/personal/attendance");

      setStats({
        totalOutstanding,
        totalCollected,
        pendingInvoices,
        paidInvoices,
        activeStudents: students.length,
        recentPayments: payments
      });
      setPersonalAttendance(personalRes.data);

    } catch (err) {
      console.error("Failed to load dashboard data", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

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

  if (loading) {
    return (
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-44 rounded-lg" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-xl border space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 rounded-xl border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Announcements */}
        <div className="p-6 rounded-[2rem] border shadow-xl space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* Recent Payments + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Payments */}
          <div className="lg:col-span-2 p-6 rounded-xl border space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>

            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="p-6 rounded-xl border space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>

            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>

            <div className="pt-6 border-t">
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Overview of financial operations and key metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate("/school/finance/invoice/manage")}>
            <FileText className="h-4 w-4 mr-2" />
            Manage Invoices
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalOutstanding)}</p>
                <div className="flex items-center text-xs text-red-600 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Requires attention
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</p>
                <div className="flex items-center text-xs text-green-600 mt-1">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  This month
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Invoices</p>
                <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
                <div className="flex items-center text-xs text-yellow-600 mt-1">
                  <FileText className="h-3 w-3 mr-1" />
                  Needs processing
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Students</p>
                <p className="text-2xl font-bold">{stats.activeStudents}</p>
                <div className="flex items-center text-xs text-blue-600 mt-1">
                  <Users className="h-3 w-3 mr-1" />
                  Enrolled
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Attendance Section */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-indigo-50 dark:bg-indigo-900/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            My Attendance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.percentage || 0}%</p>
              <p className="text-[10px] font-semibold text-indigo-600/70 uppercase tracking-tight">Attendance Score</p>
            </div>
            <div className="space-y-1 border-l pl-6 border-indigo-200/50">
              <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{personalAttendance?.overall?.presentDays || 0}</p>
              <p className="text-[10px] font-semibold text-indigo-600/70 uppercase tracking-tight">Total Present</p>
            </div>
            <div className="space-y-1 border-l pl-6 border-indigo-200/50">
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'absent')?.count || 0}
              </p>
              <p className="text-[10px] font-semibold text-red-500/70 uppercase tracking-tight">Absents (Month)</p>
            </div>
            <div className="space-y-1 border-l pl-6 border-indigo-200/50">
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {personalAttendance?.monthly?.breakdown?.find(b => b.status === 'late')?.count || 0}
              </p>
              <p className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-tight">Late Entries (Month)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-gray-400 transition-colors" onClick={() => navigate("/school/finance/invoice/manage")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Manage Invoices</p>
                <p className="text-sm text-gray-500">Create and view invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-gray-400 transition-colors" onClick={() => navigate("/school/finance/fee-structure/list")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Fee Types</p>
                <p className="text-sm text-gray-500">Manage fee categories</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-gray-400 transition-colors" onClick={() => navigate("/school/finance/feestructure/add")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <School className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Class Fees</p>
                <p className="text-sm text-gray-500">Set class fee structures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-gray-400 transition-colors" onClick={() => navigate("/school/finance/transactions/list")}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Payment History</p>
                <p className="text-sm text-gray-500">View all transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements Section */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-gray-50 dark:bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="w-6 h-6 text-blue-500" />
            Notices & Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnnouncementDashboard userRole="accountant" canManage={false} />
        </CardContent>
      </Card>

      {/* Recent Payments & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>
              Latest payment transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {payment.student_name || `Student ${payment.student_id}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          INV-{payment.invoice_id?.toString().padStart(4, '0')} • {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(payment.paid_amount)}</p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {payment.payment_method}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No recent payments</p>
                <p className="text-sm text-gray-400 mt-1">Payments will appear here</p>
              </div>
            )}

            {/* Pagination Controls */}
            {stats.recentPayments.length > 0 && (
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
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(stats.recentPayments.length / pageSize) || 1}
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(stats.recentPayments.length / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(stats.recentPayments.length / pageSize) || stats.recentPayments.length === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span>Paid Invoices</span>
                </div>
                <span className="font-bold">{stats.paidInvoices}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <span>Partially Paid</span>
                </div>
                <span className="font-bold">{stats.pendingInvoices}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <span>Pending</span>
                </div>
                <span className="font-bold">{stats.pendingInvoices}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <span>Overdue</span>
                </div>
                <span className="font-bold">0</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => navigate("/school/finance/students/fees")}
              >
                <Users className="h-4 w-4 mr-2" />
                View Student Fee Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Attendance History */}
      <div className="p-8 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm overflow-hidden">
        <h3 className="font-bold text-2xl mb-8 flex items-center gap-3">
          <CalendarCheck className="w-8 h-8 text-indigo-500" />
          My Attendance History
        </h3>
        <EmployeeAttendanceCalendar />
      </div>
    </div>
  );
}