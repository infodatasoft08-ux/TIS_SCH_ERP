// src/pages/finance/Invoices.js
import React, { useState, useEffect } from "react";
import API from "@/api";
import { useNavigate } from "react-router-dom";
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
  Check,
  History
} from "lucide-react";
import { toast } from "sonner";
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Printer } from "lucide-react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fineDialogOpen, setFineDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  // Fine form state
  const [fineType, setFineType] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [fineDescription, setFineDescription] = useState("");
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [prevDuesDialogOpen, setPrevDuesDialogOpen] = useState(false);
  const [prevMonth, setPrevMonth] = useState("");
  const [prevPaymentDues, setPrevPaymentDues] = useState("");
  const [prevFineDues, setPrevFineDues] = useState("");
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paid_amount: "",
    payment_method: "cash",
    reference: "",
    discount_amount: "",
    discount_reason: ""
  });
  const [availableFeeTypes, setAvailableFeeTypes] = useState([]);
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(false);
  const [printingId, setPrintingId] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(false);


  // Form state
  const [formData, setFormData] = useState({
    grade_id: "",
    student_ids: [],
    fee_type_ids: [],
    months_count: "1",
    period_start: new Date().toISOString().split('T')[0],
    is_auto_generate: false
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkPrinting, setBulkPrinting] = useState(false);

  // Filter states
  const [academicYears, setAcademicYears] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [filterAcademicYear, setFilterAcademicYear] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterClass, setFilterClass] = useState("all");

  useEffect(() => {
    loadInvoices();
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
      setClasses(gradesRes.data.grades || []); // For the generation form
    } catch (err) {
      console.error("Failed to load grades/classes", err);
    }
  }

  useEffect(() => {
    if (!fineDialogOpen) {
      setFineType("");
      setFineAmount("");
      setFineDescription("");
      if (!discountDialogOpen) setSelectedInvoice(null);
    }
  }, [fineDialogOpen]);

  useEffect(() => {
    if (!discountDialogOpen) {
      setDiscountAmount("");
      setDiscountReason("");
      if (!fineDialogOpen && !prevDuesDialogOpen) setSelectedInvoice(null);
    }
  }, [discountDialogOpen]);

  useEffect(() => {
    if (!prevDuesDialogOpen) {
      setPrevMonth("");
      setPrevPaymentDues("");
      setPrevFineDues("");
      if (!discountDialogOpen && !fineDialogOpen) setSelectedInvoice(null);
    }
  }, [prevDuesDialogOpen]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice => {
        const studentName = invoice.user_name || "";
        return (
          studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.id.toString().includes(searchQuery) ||
          invoice.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredInvoices(filtered);
    }
  }, [searchQuery, invoices, students]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);


  // Removed loadGrades from here as it's handled by loadAllGradesAndClasses

  useEffect(() => {
    if (formData.grade_id) {
      loadGradeFeeStructure(formData.grade_id);
    } else {
      setAvailableFeeTypes([]);
    }
  }, [formData.grade_id]);

  async function loadGradeFeeStructure(gradeId) {
    setLoadingFeeTypes(true);
    try {
      const res = await API.get(`/fee/list/class-structure`, {
        params: { grade_id: gradeId }
      });
      const fees = res.data.fee_structure || [];
      setAvailableFeeTypes(fees);
      // Select all by default
      setFormData(prev => ({
        ...prev,
        fee_type_ids: fees.map(f => f.fee_type_id)
      }));
    } catch (err) {
      console.error("Failed to load grade fee structure", err);
      toast.error("Failed to load fee types for selected grade");
    } finally {
      setLoadingFeeTypes(false);
    }
  }

  const filteredStudents = formData.grade_id
    ? students.filter((s) => String(s.grade_id) == String(formData.grade_id))
    : [];


  const allStudentIds = filteredStudents.map(s => s.id);

  const isAllSelected =
    allStudentIds.length > 0 &&
    allStudentIds.every(id => formData.student_ids.includes(id));

  async function loadInvoices() {
    setLoading(true);
    try {
      const params = { limit: 200, offset: 0 };
      if (filterAcademicYear !== "all") params.academic_year_id = filterAcademicYear;
      if (filterGrade !== "all") params.grade_id = filterGrade;
      if (filterClass !== "all") params.class_id = filterClass;

      const res = await API.get(`/fee/list/invoices`, { params });
      setInvoices(res.data.invoices || []);
      setFilteredInvoices(res.data.invoices || []);
    } catch (err) {
      console.error("Failed to load invoices", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const res = await API.get("/students/get/student");
      setStudents(res.data.students || res.data || []);
    } catch (err) {
      console.error("Failed to load students", err);
      toast.error("Failed to load students");
    } finally {
      setLoadingStudents(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.grade_id) {
      toast.error("Please select a class");
      setIsSubmitting(false);
      return;
    }

    if (formData.student_ids.length === 0) {
      toast.error("Please select at least one student");
      setIsSubmitting(false); ``
      return;
    }

    console.log("count of student selcted: ", formData.student_ids.length)

    try {
      const res = await API.post(`/fee/add/generate-invoice`, {
        class_id: parseInt(formData.grade_id), // Backend uses class_id parameter for grade_id/class_id context
        student_ids: formData.student_ids,
        fee_type_ids: formData.fee_type_ids,
        months_count: parseInt(formData.months_count),
        period_start: formData.period_start,
        is_auto_generate: formData.is_auto_generate
      });
      toast.success("Invoice generated successfully");
      setDialogOpen(false);
      resetForm();
      loadInvoices();
    } catch (err) {
      console.error("Failed to generate invoice", err);
      setIsSubmitting(false);
      toast.error(err.response?.data?.error || "Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      return;
    }

    try {
      await API.delete(`/fee/delete/invoices/${invoiceId}`);
      toast.success("Invoice deleted successfully");
      loadInvoices();
    } catch (err) {
      console.error("Failed to delete invoice", err);
      toast.error(err.response?.data?.error || "Failed to delete invoice");
    }
  };

  const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

  const handlePrintDemand = async (invoiceId) => {
    setPrintingId(invoiceId);
    try {
      const res = await API.get(`/fee/get/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      // const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      // const printWindow = window.open(url, "_blank");
      // if (printWindow) {
      //   printWindow.onload = () => {
      //     printWindow.print();
      //   };
      // } else {
      //   toast.error("Pop-up blocked. Please allow pop-ups to print.");
      // }

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'print',
            payload: { base64 }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups to print.");
        }
      }
    } catch (err) {
      console.error("Failed to print demand", err);
      toast.error("Failed to generate demand PDF");
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    if (!paymentId) return;
    setPrintingId(`receipt-${paymentId}`);
    try {
      const res = await API.get(`/fee/payments/${paymentId}/receipt`, {
        responseType: "blob",
      });
      // const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      // const printWindow = window.open(url, "_blank");
      // if (printWindow) {
      //   printWindow.onload = () => {
      //     printWindow.print();
      //   };
      // } else {
      //   toast.error("Pop-up blocked. Please allow pop-ups to print.");
      // }

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'print',
            payload: { base64 }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups to print.");
        }
      }
    } catch (err) {
      console.error("Failed to print receipt", err);
      toast.error("Failed to generate receipt PDF");
    } finally {
      setPrintingId(null);
    }
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentSelectChange = (name, value) => {
    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePrintCombined = async (invoiceId, pId = null) => {
    setPrintingInvoice(true);
    try {
      let endpoint = `/fee/get/invoices/${invoiceId}/combined-pdf`;
      if (pId) endpoint += `?payment_id=${pId}`;

      const res = await API.get(endpoint, {
        responseType: "blob",
      });
      // const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      // const printWindow = window.open(url, "_blank");
      // if (printWindow) {
      //   printWindow.onload = () => {
      //     printWindow.print();
      //   };
      // } else {
      //   toast.error("Pop-up blocked. Please allow pop-ups to print.");
      // }

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'print',
            payload: { base64 }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups to print.");
        }
      }
    } catch (err) {
      console.error("Failed to print combined PDF", err);
      toast.error("Failed to generate PDF");
    } finally {
      setPrintingInvoice(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    const pAmt = parseFloat(paymentData.paid_amount) || 0;
    const dAmt = parseFloat(paymentData.discount_amount) || 0;

    if (pAmt <= 0 && dAmt <= 0) {
      toast.error("Please enter a valid payment or discount amount");
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await API.post(`/fee/add/invoices/${selectedInvoice.id}/pay`, {
        invoice_id: selectedInvoice.id,
        paid_amount: pAmt,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference,
        discount_amount: dAmt,
        discount_reason: paymentData.discount_reason
      });

      toast.success("Processed successfully");

      const paymentId = response.data.payment_id;

      handlePrintCombined(selectedInvoice.id, paymentId);

      // Automatically trigger printing
      // await handlePrintDemand(selectedInvoice.id);

      setPaymentDialogOpen(false);
      setPaymentData({
        paid_amount: "",
        payment_method: "cash",
        reference: "",
        discount_amount: "",
        discount_reason: ""
      });
      loadInvoices();
    } catch (err) {
      console.error("Failed to record payment", err);
      toast.error(err.response?.data?.error || "Failed to record payment");
    } finally {
      setProcessingPayment(false);
    }
  };


  const handleExportCSV = async () => {
    try {
      const params = {};
      if (filterAcademicYear !== "all") params.academic_year_id = filterAcademicYear;
      if (filterGrade !== "all") params.grade_id = filterGrade;
      if (filterClass !== "all") params.class_id = filterClass;

      const res = await API.get(`/fee/export/due-invoices`, {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `due_invoices_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV exported successfully");
    } catch (err) {
      console.error("Failed to export CSV", err);
      toast.error("No invoices with dues found for the selected criteria");
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : `${studentId}`;
  };

  const isOverdue = (invoice) => {
    if (invoice.status === 'paid') return false;
    return new Date(invoice.period_end) < new Date();
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
      grade_id: "",
      student_ids: [],
      fee_type_ids: [],
      months_count: "1",
      period_start: new Date().toISOString().split('T')[0],
      is_auto_generate: false
    });
  };

  const calculateBalance = () => {
    if (!selectedInvoice) return 0;
    let balance = parseFloat(selectedInvoice.amount_due) - parseFloat(selectedInvoice.amount_paid);
    if (paymentDialogOpen && paymentData.discount_amount && !isNaN(parseFloat(paymentData.discount_amount))) {
      balance -= parseFloat(paymentData.discount_amount);
    }
    return balance < 0 ? 0 : balance;
  };

  const calculateBalnaceinTable = (invoice) => {
    let balance = parseFloat(invoice.amount_due) - parseFloat(invoice.amount_paid);
    return balance < 0 ? 0 : balance;
  };

  const handleAddDiscount = async (e) => {
    e.preventDefault();
    if (!discountAmount || parseFloat(discountAmount) <= 0) {
      toast.error("Please enter a valid discount amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post(`/fee/add/invoices/${selectedInvoice.id}/add-discount`, {
        amount: parseFloat(discountAmount),
        reason: discountReason
      });
      toast.success("Discount added successfully");
      setDiscountDialogOpen(false);
      setDiscountAmount("");
      setDiscountReason("");
      loadInvoices();
    } catch (err) {
      console.error("Failed to add discount", err);
      toast.error(err.response?.data?.error || "Failed to add discount");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPreviousDues = async (e) => {
    e.preventDefault();
    if (!prevPaymentDues && !prevFineDues) {
      toast.error("Please enter either payment dues or fine dues");
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post(`/fee/add/invoices/${selectedInvoice.id}/add-previous-dues`, {
        previous_month: prevMonth,
        payment_dues: prevPaymentDues,
        fine_dues: prevFineDues
      });
      toast.success("Previous dues added successfully");
      setPrevDuesDialogOpen(false);
      loadInvoices();
    } catch (err) {
      console.error("Failed to add previous dues", err);
      toast.error(err.response?.data?.error || "Failed to add previous dues");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableAutoGenerate = async (invoiceId) => {
    if (!confirm("Are you sure you want to disable auto-generate for this invoice?")) {
      return;
    }
    try {
      await API.put(`/fee/update/invoices/${invoiceId}/disable-auto-generate`);
      toast.success("Auto-generate disabled successfully");
      loadInvoices();
    } catch (err) {
      console.error("Failed to disable auto-generate", err);
      toast.error(err.response?.data?.error || "Failed to disable auto-generate");
    }
  };

  const handleToggleSelectAll = () => {
    const currentPageInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const currentPageIds = currentPageInvoices.map(inv => inv.id);
    const allSelected = currentPageIds.every(id => selectedInvoiceIds.includes(id));

    if (allSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedInvoiceIds(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  };

  const handleToggleSelectInvoice = (id) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedInvoiceIds.length} invoices? This action cannot be undone.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      await API.post(`/fee/delete/invoices-bulk`, { invoiceIds: selectedInvoiceIds });
      toast.success(`${selectedInvoiceIds.length} invoices deleted successfully`);
      setSelectedInvoiceIds([]);
      loadInvoices();
    } catch (err) {
      console.error("Failed to delete invoices", err);
      toast.error(err.response?.data?.error || "Failed to delete invoices");
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkPrint = async () => {
    if (selectedInvoiceIds.length > 10) {
      toast.warning("Please select a maximum of 10 invoices for bulk printing to ensure optimal performance.");
      return;
    }
    setBulkPrinting(true);
    try {
      const res = await API.post(`/fee/get/invoices-bulk/pdf`, { invoiceIds: selectedInvoiceIds }, {
        responseType: "blob",
      });

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'print',
            payload: { base64 }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups to print.");
        }
      }
    } catch (err) {
      console.error("Failed to print invoices", err);
      toast.error("Failed to generate bulk PDF");
    } finally {
      setBulkPrinting(false);
    }
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
          <Button
            variant="outline"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Dues CSV
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
                <form id="invoice-generation-form" onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"> */}
                    <div className="space-y-4 py-4">
                      <ComboboxFormField
                        field={{
                          value: formData.grade_id,
                          onChange: (value) =>
                            setFormData(prev => ({
                              ...prev,
                              grade_id: value,
                              student_ids: [], // reset students when class changes
                              fee_type_ids: []
                            }))
                        }}
                        label="Class"
                        required
                        items={classes}
                        valueKey="id"
                        labelKey="name"
                        searchKey="name"
                        placeholder="Select class"
                        searchPlaceholder="Search class..."
                        emptyMessage="No class found."
                      />

                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-medium">Students *</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="justify-between"
                              disabled={!formData.grade_id}
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

                      <div className="space-y-2 flex flex-col">
                        <label className="text-sm font-medium">Fee Types *</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="justify-between"
                              disabled={!formData.grade_id || availableFeeTypes.length === 0}
                            >
                              {formData.fee_type_ids.length > 0
                                ? `${formData.fee_type_ids.length} fee types selected`
                                : "Select Fee Types"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput className="focus:outline-none" placeholder="Search fee type..." />
                              <CommandList>
                                <CommandEmpty>No fee type found.</CommandEmpty>
                                <CommandGroup>
                                  {availableFeeTypes.map(fee => {
                                    const checked = formData.fee_type_ids.includes(fee.fee_type_id);
                                    return (
                                      <CommandItem
                                        key={fee.fee_type_id}
                                        onSelect={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            fee_type_ids: checked
                                              ? prev.fee_type_ids.filter(id => id !== fee.fee_type_id)
                                              : [...prev.fee_type_ids, fee.fee_type_id]
                                          }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            checked ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {fee.fee_name} ({formatCurrency(fee.monthly_amount)})
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="period_start" className="text-sm font-medium">Period Start</label>
                        <DatePicker
                          value={formData.period_start}
                          onChange={(date) => setFormData({ ...formData, period_start: date })}
                          placeholder="dd/mm/yyyy"
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
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="auto_generate"
                        checked={formData.is_auto_generate}
                        onCheckedChange={(checked) => handleSelectChange("is_auto_generate", checked)}
                      />
                      <Label htmlFor="auto_generate">Enable Auto-Generate for Next Period</Label>
                    </div>
                  </div>
                </form>

              </ScrollArea>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="invoice-generation-form" disabled={isSubmitting}>
                  {isSubmitting ? "Generating..." : "Generate Invoice"}
                </Button>
              </DialogFooter>

            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Academic Year</Label>
              <Select value={filterAcademicYear} onValueChange={(val) => { setFilterAcademicYear(val); loadInvoices(); }}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Grade / Level</Label>
              <Select value={filterGrade} onValueChange={(val) => { setFilterGrade(val); setFilterClass("all"); loadInvoices(); }}>
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
              <Label>Class / Section</Label>
              <Select value={filterClass} onValueChange={(val) => { setFilterClass(val); loadInvoices(); }}>
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

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => {
                setFilterAcademicYear("all");
                setFilterGrade("all");
                setFilterClass("all");
                loadInvoices();
              }}>
                Clear Filters
              </Button>
              <Button onClick={loadInvoices} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Stats */}
      < Card >
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
      </Card >

      {/* Bulk Action Header */}
      {
        selectedInvoiceIds.length > 0 && (
          <Card className="bg-primary/10 border-primary/20 sticky top-2 z-10 shadow-lg animate-in slide-in-from-top duration-300">
            <CardContent className="px-4 py-1 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="px-3 py-1 text-sm font-bold">
                  {selectedInvoiceIds.length} Selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoiceIds([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear Selection
                </Button>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 md:flex-none shadow-sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Bulk Delete
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 md:flex-none shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleBulkPrint}
                  disabled={bulkPrinting}
                >
                  {bulkPrinting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                  Bulk Print
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      }

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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).length > 0 &&
                            filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).every(inv => selectedInvoiceIds.includes(inv.id))
                          }
                          onCheckedChange={handleToggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-20">Invoice ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((invoice) => (
                      <TableRow key={invoice.id} className={selectedInvoiceIds.includes(invoice.id) ? "bg-primary/5" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoiceIds.includes(invoice.id)}
                            onCheckedChange={() => handleToggleSelectInvoice(invoice.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          INV-{invoice.id.toString().padStart(4, '0')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getStudentName(invoice.user_name)}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {invoice.student_id}
                            <div className="text-xs text-muted-foreground">{invoice.academic_year_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.grade_name || invoice.class_name || `Class ${invoice.class_id}`}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {/* {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)} */}
                            {invoice.period}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="font-bold">{formatCurrency(invoice.amount_due)}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="font-bold text-red-600">{formatCurrency(calculateBalnaceinTable(invoice))}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={invoice.amount_paid > 0 ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                            {formatCurrency(invoice.amount_paid)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            {getStatusBadge(invoice.status)}
                            {isOverdue(invoice) && (
                              <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                Overdue
                              </Badge>
                            )}
                            {invoice.is_auto_generate === 1 && (
                              <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                                Auto-Gen Enabled
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/school/finance/invoices/${invoice.id}`)}
                              disabled={selectedInvoiceIds.length > 0}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.is_auto_generate === 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDisableAutoGenerate(invoice.id)}
                                title="Disable Auto-Generate"
                                disabled={selectedInvoiceIds.length > 0}
                              >
                                <RefreshCw className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'carried_forward' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentDialogOpen(true);
                                }}
                                title="Record Payment"
                                disabled={selectedInvoiceIds.length > 0}
                              >
                                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </Button>
                            )}
                            {invoice.status !== 'carried_forward' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setFineDialogOpen(true);
                                }}
                                title="Add Fine"
                                disabled={selectedInvoiceIds.length > 0}
                              >
                                <IndianRupeeIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'carried_forward' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setDiscountDialogOpen(true);
                                }}
                                title="Add Discount"
                                disabled={selectedInvoiceIds.length > 0}
                              >
                                <DollarSign className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                              </Button>
                            )}
                            {invoice.status !== 'paid' && invoice.status !== 'carried_forward' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPrevDuesDialogOpen(true);
                                }}
                                title="Add Previous Dues"
                                disabled={selectedInvoiceIds.length > 0}
                              >
                                <History className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintDemand(invoice.id)}
                              title="Print Demand Bill"
                              className="text-blue-500"
                              disabled={printingId === invoice.id || selectedInvoiceIds.length > 0}
                            >
                              {printingId === invoice.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              disabled={selectedInvoiceIds.length > 0}
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
                {filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((invoice) => (
                  <Card key={invoice.id} className={cn("p-4 flex flex-col gap-3 relative transition-all duration-200", selectedInvoiceIds.includes(invoice.id) ? "border-primary ring-1 ring-primary bg-primary/5 shadow-md" : "hover:shadow-md")}>
                    <div className="absolute top-4 right-4 z-10">
                      <Checkbox
                        checked={selectedInvoiceIds.includes(invoice.id)}
                        onCheckedChange={() => handleToggleSelectInvoice(invoice.id)}
                        className="h-5 w-5"
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-bold text-sm text-primary">
                          INV-{invoice.id.toString().padStart(4, '0')}
                        </div>
                        <div className="font-medium text-lg mt-1">{getStudentName(invoice.user_name)}</div>
                        <div className="text-sm text-muted-foreground">{invoice.class_name || `Class ${invoice.class_id}`}</div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge(invoice.status)}
                        {isOverdue(invoice) && (
                          <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            Overdue
                          </Badge>
                        )}
                        {invoice.is_auto_generate === 1 && (
                          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                            Auto-Gen Enabled
                          </Badge>
                        )}
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
                        <div className="text-muted-foreground">Total Amount</div>
                        <div className="font-bold text-base">{formatCurrency(invoice.amount_due)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Amount Due</div>
                        <div className="font-bold text-base">{formatCurrency(calculateBalnaceinTable(invoice))}</div>
                      </div>
                      <div className="col-span-2 flex justify-between items-center mt-1">
                        <div className="text-muted-foreground">Amount Paid</div>
                        <div className={invoice.amount_paid > 0 ? "text-green-600 dark:text-green-400 font-bold text-base" : "text-muted-foreground font-medium"}>
                          {formatCurrency(invoice.amount_paid)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/school/finance/invoices/${invoice.id}`)}
                        disabled={selectedInvoiceIds.length > 0}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      {invoice.is_auto_generate === 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisableAutoGenerate(invoice.id)}
                          className="text-orange-500 border-orange-200"
                          disabled={selectedInvoiceIds.length > 0}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" /> Disable Auto-Gen
                        </Button>
                      )}
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPaymentDialogOpen(true);
                          }}
                          className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                          disabled={selectedInvoiceIds.length > 0}
                        >
                          <CreditCard className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setFineDialogOpen(true);
                        }}
                        className="text-red-600 dark:text-red-400"
                        disabled={selectedInvoiceIds.length > 0}
                      >
                        <IndianRupeeIcon className="h-4 w-4 mr-1" /> Fine
                      </Button>
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setDiscountDialogOpen(true);
                          }}
                          className="text-orange-500 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          disabled={selectedInvoiceIds.length > 0}
                        >
                          <IndianRupeeIcon className="h-4 w-4 mr-1" /> Discount
                        </Button>
                      )}
                      {invoice.status !== 'paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setPrevDuesDialogOpen(true);
                          }}
                          className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                          disabled={selectedInvoiceIds.length > 0}
                        >
                          <History className="h-4 w-4 mr-1" /> Previous Dues
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintDemand(invoice.id)}
                        className="text-blue-500 border-blue-200"
                        disabled={printingId === invoice.id || selectedInvoiceIds.length > 0}
                      >
                        {printingId === invoice.id ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        {printingId === invoice.id ? "Printing..." : "Print Bill"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="text-red-500 dark:text-red-400 border-red-200 dark:border-red-800"
                        disabled={selectedInvoiceIds.length > 0}
                      >
                        <AlertCircle className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))}
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
                    onClick={loadInvoices}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(filteredInvoices.length / pageSize) || 1}
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredInvoices.length / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(filteredInvoices.length / pageSize) || filteredInvoices.length === 0}
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

      <Dialog open={fineDialogOpen} onOpenChange={setFineDialogOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Fine</DialogTitle>
            <DialogDescription>
              Add penalty or late fee to invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2">Fine Type</Label>
              <Select onValueChange={(v) => setFineType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fine type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late_fee">Late Fee</SelectItem>
                  <SelectItem value="exam_fee">Exam Late Fee</SelectItem>
                  <SelectItem value="penalty">Penalty</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2">Amount</Label>
              <Input
                type="number"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
              />
            </div>

            <div>
              <Label className="mb-2">Description</Label>
              <Input
                placeholder="Reason for fine"
                value={fineDescription}
                onChange={(e) => setFineDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={async () => {
                await API.post(
                  `/fee/add/invoices/${selectedInvoice.id}/add-fine`,
                  {
                    fine_type: fineType,
                    amount: fineAmount,
                    description: fineDescription
                  }
                );
                toast.success("Fine added");
                setFineDialogOpen(false);
                loadInvoices();
                setFineType("");
                setFineAmount("");
                setFineDescription("");
              }}
            >
              Add Fine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Discount</DialogTitle>
            <DialogDescription>
              Apply a discount to the selected invoice.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDiscount} className="space-y-4">
            <div>
              <Label className="mb-2">Discount Amount</Label>
              <Input
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>

            <div>
              <Label className="mb-2">Reason</Label>
              <Input
                placeholder="Optional reason for discount"
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDiscountDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Applying..." : "Add Discount"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={prevDuesDialogOpen} onOpenChange={setPrevDuesDialogOpen}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add Previous Dues</DialogTitle>
            <DialogDescription>
              Carry forward previous month's payment or fine dues.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddPreviousDues} className="space-y-4">
            <div>
              <Label className="mb-2">Previous Month</Label>
              <Select value={prevMonth} onValueChange={setPrevMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month (e.g., March)" />
                </SelectTrigger>
                <SelectContent>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2">Payment Dues Amount</Label>
              <Input
                type="number"
                value={prevPaymentDues}
                onChange={(e) => setPrevPaymentDues(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <Label className="mb-2">Fine Dues Amount</Label>
              <Input
                type="number"
                value={prevFineDues}
                onChange={(e) => setPrevFineDues(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPrevDuesDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Dues"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for invoice INV-{selectedInvoice?.id.toString().padStart(4, '0')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Balance</label>
              <div className="p-2 border rounded bg-muted text-foreground font-mono text-lg font-bold">
                {formatCurrency(calculateBalance())}
              </div>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount to Pay</Label>
                <Input
                  type="number"
                  name="paid_amount"
                  value={paymentData.paid_amount}
                  onChange={handlePaymentInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(calculateBalance())}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Discount Amount(Optional)</Label>
                <Input
                  type="number"
                  name="discount_amount"
                  value={paymentData.discount_amount}
                  onChange={handlePaymentInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Discount Reason */}
              {paymentData.discount_amount && parseFloat(paymentData.discount_amount) > 0 && (
                <div className="space-y-2">
                  <Label>Discount Reason</Label>
                  <Input
                    name="discount_reason"
                    value={paymentData.discount_reason}
                    onChange={handlePaymentInputChange}
                    placeholder="Why are you discounting?"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  name="payment_method"
                  value={paymentData.payment_method}
                  onValueChange={(value) => handlePaymentSelectChange('payment_method', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  name="reference"
                  value={paymentData.reference}
                  onChange={handlePaymentInputChange}
                  placeholder="Optional reference number"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentDialogOpen(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>


        </DialogContent>
      </Dialog>
    </div >
  );
}