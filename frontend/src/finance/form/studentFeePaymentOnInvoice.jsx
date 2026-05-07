// src/pages/finance/Invoices.js
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  FileText,
  User,
  Calendar,
  Download,
  CreditCard,
  AlertCircle,
  IndianRupeeIcon,
  ReceiptIndianRupee,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StudentFeePayment() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);


  useEffect(() => {
    loadInvoices();
    loadStudents();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice => {
        const studentName = students.find(s => s.id === invoice.student_id)?.name || "";
        return (
          studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.id.toString().includes(searchQuery) ||
          invoice.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredInvoices(filtered);
    }
  }, [searchQuery, invoices, students]);


  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await API.get(`/fee/list/invoices`, {
        params: { limit: 100, offset: 0 }
      });
      setInvoices(res.data.invoices || []);
      setFilteredInvoices(res.data.invoices || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMakePayment = async (invoiceId) => {
    try {
      const res = await API.post(`/fee/add/invoices/${invoiceId}/pay`);
      toast.success("Payment recorded successfully");
      loadInvoices();
    } catch (err) {
      console.error("Failed to record payment", err);
      toast.error(err.response?.data?.error || "Failed to record payment");
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : `Student ${studentId}`;
  };

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

  const resetForm = () => {
    setFormData({
      class_id: "",
      student_ids: [],
      months_count: "1",
      period_start: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="p-3 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Manage student invoices and payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadInvoices}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Generate New Invoice</DialogTitle>
                <DialogDescription>
                  Create invoice for a student
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="overflow-y-auto h-[calc(60vh)]">
                <form id="student-fee-payment-form" onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Class</label>
                        <Select
                          value={formData.class_id}
                          onValueChange={(value) =>
                            setFormData(prev => ({
                              ...prev,
                              class_id: value,
                              student_ids: [] // reset students when class changes
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map(cls => (
                              <SelectItem key={cls.id} value={cls.id.toString()}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>


                      <div className="space-y-2">
                        <label className="text-sm font-medium">Students *</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="justify-between"
                              disabled={!formData.class_id}
                            >
                              {/* {formData.student_ids.length
                                ? `${formData.student_ids.length} students selected`
                                : "Select Students"} */}

                              {(formData.student_ids?.length ?? 0) > 0
                                ? `${formData.student_ids.length} students selected`
                                : "Select Students"
                              }
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>

                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput className={"focus:outline-none"} placeholder="Search student..." />
                              <CommandList>
                                <CommandEmpty>No student found.</CommandEmpty>

                                <CommandGroup>
                                  {/* ✅ SELECT ALL / UNSELECT ALL */}
                                  {filteredStudents.length > 0 && (
                                    <CommandItem
                                      onSelect={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          student_ids: isAllSelected ? [] : allStudentIds
                                        }));
                                      }}
                                      className="font-medium"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          isAllSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {isAllSelected ? "Unselect All" : "Select All"}
                                    </CommandItem>
                                  )}
                                </CommandGroup>

                                <CommandGroup>
                                  {filteredStudents.map(student => {
                                    const checked = formData.student_ids.includes(student.id);

                                    return (
                                      <CommandItem
                                        key={student.id}
                                        onSelect={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            student_ids: checked
                                              ? prev.student_ids.filter(id => id !== student.id)
                                              : [...prev.student_ids, student.id]
                                          }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            checked ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {student.user_name}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                    </div>
                    {/* <FormItem className="flex flex-col">
                      <FormLabel>Students *</FormLabel>

                      

                      <FormMessage />
                    </FormItem> */}

                    {/* <div className="space-y-2">
                      <label className="text-sm font-medium">Student</label>
                      <Select 
                        value={formData.student_id} 
                        onValueChange={(value) => handleSelectChange("student_id", value)}
                        disabled={loadingStudents}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.user_name} - {student.class_name || `Class ${student.class_id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div> */}
                    <div className="space-y-2">
                      <label htmlFor="period_start" className="text-sm font-medium">Period Start</label>
                      <Input
                        id="period_start"
                        name="period_start"
                        type="date"
                        value={formData.period_start}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="months_count" className="text-sm font-medium">Number of Months</label>
                      <Select
                        value={formData.months_count}
                        onValueChange={(value) => handleSelectChange("months_count", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select months" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                              {month} {month === 1 ? 'month' : 'months'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </form>
              </ScrollArea>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="student-fee-payment-form">
                  Generate Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by student name or class..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <FileText className="h-3 w-3 mr-1" />
                {filteredInvoices.length} Invoices
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <ReceiptIndianRupee className="h-3 w-3 mr-1" />
                {formatCurrency(
                  filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount_due || 0), 0)
                )} Total Due
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Invoices</CardTitle>
          <CardDescription>
            All invoices with payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                {searchQuery ? "Try a different search query" : "Click 'Generate Invoice' to create one"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Invoice ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">
                          INV-{invoice.id.toString().padStart(4, '0')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getStudentName(invoice.student_id)}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {invoice.student_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.class_name || `Class ${invoice.class_id}`}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="font-bold">{formatCurrency(invoice.amount_due)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={invoice.amount_paid > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                            {formatCurrency(invoice.amount_paid)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/school/finance/invoices/${invoice.id}`, '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status !== 'paid' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMakePayment(invoice.id)}
                              >
                                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-sm text-primary">
                          INV-{invoice.id.toString().padStart(4, '0')}
                        </div>
                        <div className="font-medium text-lg mt-1">{getStudentName(invoice.student_id)}</div>
                        <div className="text-sm text-muted-foreground">{invoice.class_name || `Class ${invoice.class_id}`}</div>
                      </div>
                      <div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mt-2 border-t pt-3">
                      <div>
                        <div className="text-muted-foreground">Period</div>
                        <div className="font-medium">{formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Amount Due</div>
                        <div className="font-bold text-base">{formatCurrency(invoice.amount_due)}</div>
                      </div>
                      <div className="col-span-2 flex justify-between items-center mt-1">
                        <div className="text-muted-foreground">Amount Paid</div>
                        <div className={invoice.amount_paid > 0 ? "text-green-600 dark:text-green-400 font-bold text-base" : "text-muted-foreground font-medium"}>
                          {formatCurrency(invoice.amount_paid)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/school/finance/invoices/${invoice.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakePayment(invoice.id)}
                          className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                        >
                          <CreditCard className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="text-red-500 dark:text-red-400 border-red-200 dark:border-red-800"
                      >
                        <AlertCircle className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}