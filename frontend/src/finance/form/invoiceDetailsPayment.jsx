// src/pages/finance/InvoiceDetails.js
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  CreditCard,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  School,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/auth/AuthContext';
import { printPdfBlob } from '@/utils/fileHelper';
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export default function InvoiceDetails() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const { user } = useAuth();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState(null);
  // Reverse Fine form state
  const [reverseReason, setReverseReason] = useState("");
  const [paymentData, setPaymentData] = useState({
    paid_amount: "",
    payment_method: "cash",
    reference: "",
    discount_amount: "",
    discount_reason: ""
  });
  const [selectedMethods, setSelectedMethods] = useState(["cash"]);
  const [methodAmounts, setMethodAmounts] = useState({ cash: "" });
  const [availableMethods] = useState([
    { id: 'cash', label: 'Cash' },
    { id: 'card', label: 'Card' },
    { id: 'upi', label: 'UPI' },
    { id: 'cheque', label: 'Cheque' },
    { id: 'bank_transfer', label: 'Bank Transfer' }
  ]);
  const [processingPdf, setProcessingPdf] = useState(false);
  const [printingReceiptId, setPrintingReceiptId] = useState(null);

  // Add Fee Types dialog state
  const [addFeeTypeDialogOpen, setAddFeeTypeDialogOpen] = useState(false);
  const [loadingAvailableFees, setLoadingAvailableFees] = useState(false);
  const [availableFeeOptions, setAvailableFeeOptions] = useState([]);
  const [selectedFeeTypeIds, setSelectedFeeTypeIds] = useState([]);
  const [feeTypeAmounts, setFeeTypeAmounts] = useState({});
  const [addingFeeTypes, setAddingFeeTypes] = useState(false);
  const [feeTypeSearchOpen, setFeeTypeSearchOpen] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceDetails();
    }
  }, [invoiceId]);

  async function loadInvoiceDetails() {
    setLoading(true);
    try {
      const res = await API.get(`/fee/get/invoices/${invoiceId}`);
      setInvoice(res.data.invoice);
    } catch (err) {
      console.error("Failed to load invoice details", err);
      toast.error("Failed to load invoice details");
      navigate("/school/finance/invoice/manage");
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddFeeTypeModal = async () => {
    setAddFeeTypeDialogOpen(true);
    setSelectedFeeTypeIds([]);
    setFeeTypeAmounts({});
    setLoadingAvailableFees(true);

    try {
      const gradeId = invoice?.grade_id;
      let classStructureFees = [];
      if (gradeId) {
        try {
          const res = await API.get('/fee/list/class-structure', {
            params: { grade_id: gradeId, limit: 1000 }
          });
          classStructureFees = res.data.fee_structure || [];
        } catch (e) {
          console.error("Error fetching class fee structure", e);
        }
      }

      let allFeeTypes = [];
      try {
        const resTypes = await API.get('/fee/list/feestype', { params: { limit: 1000 } });
        allFeeTypes = resTypes.data.fee_types || [];
      } catch (e) {
        console.error("Error fetching all fee types", e);
      }

      // Existing fee types already present in this invoice
      const existingFeeTypeIds = new Set((invoice?.lines || []).map(l => Number(l.fee_type_id)));

      // Map class structure monthly amounts by fee_type_id
      const structureMap = new Map();
      classStructureFees.forEach(cs => {
        structureMap.set(Number(cs.fee_type_id), cs);
      });

      const options = [];
      const seenIds = new Set();

      // First add from class structure (if not already in invoice lines)
      classStructureFees.forEach(cs => {
        const fId = Number(cs.fee_type_id);
        if (!existingFeeTypeIds.has(fId) && !seenIds.has(fId)) {
          seenIds.add(fId);
          options.push({
            fee_type_id: fId,
            fee_name: cs.fee_name,
            fee_code: cs.fee_code,
            monthly_amount: Number(cs.monthly_amount || 0),
            has_structure: true
          });
        }
      });

      // Then add any other fee types from allFeeTypes (if not already added)
      allFeeTypes.forEach(ft => {
        const fId = Number(ft.id);
        if (!existingFeeTypeIds.has(fId) && !seenIds.has(fId)) {
          seenIds.add(fId);
          const struct = structureMap.get(fId);
          options.push({
            fee_type_id: fId,
            fee_name: ft.name,
            fee_code: ft.code,
            monthly_amount: struct ? Number(struct.monthly_amount || 0) : 0,
            has_structure: Boolean(struct)
          });
        }
      });

      setAvailableFeeOptions(options);
    } catch (err) {
      console.error("Failed to load fee types", err);
      toast.error("Failed to load available fee types");
    } finally {
      setLoadingAvailableFees(false);
    }
  };

  const toggleFeeTypeSelection = (fee) => {
    const fId = fee.fee_type_id;
    const isSelected = selectedFeeTypeIds.includes(fId);
    if (isSelected) {
      setSelectedFeeTypeIds(prev => prev.filter(id => id !== fId));
      setFeeTypeAmounts(prev => {
        const copy = { ...prev };
        delete copy[fId];
        return copy;
      });
    } else {
      setSelectedFeeTypeIds(prev => [...prev, fId]);
      const months = Math.max(1, Number(invoice?.months_count || 1));
      const defaultAmount = Number((Number(fee.monthly_amount || 0) * months).toFixed(2));
      setFeeTypeAmounts(prev => ({
        ...prev,
        [fId]: defaultAmount > 0 ? defaultAmount.toString() : ""
      }));
    }
  };

  const handleAddFeeTypesSubmit = async (e) => {
    e.preventDefault();
    if (selectedFeeTypeIds.length === 0) {
      toast.error("Please select at least one fee type to add");
      return;
    }

    const payloadItems = [];
    for (const fId of selectedFeeTypeIds) {
      const fee = availableFeeOptions.find(opt => opt.fee_type_id === fId);
      const amtStr = feeTypeAmounts[fId];
      const amt = parseFloat(amtStr);
      if (isNaN(amt) || amt <= 0) {
        toast.error(`Please enter a valid amount greater than 0 for ${fee?.fee_name || 'selected fee'}`);
        return;
      }
      payloadItems.push({
        fee_type_id: fId,
        amount: amt
      });
    }

    setAddingFeeTypes(true);
    try {
      const res = await API.post(`/fee/add/invoices/${invoiceId}/add-fee-types`, {
        fee_types: payloadItems
      });
      toast.success(res.data.message || "Fee types added successfully");
      setAddFeeTypeDialogOpen(false);
      setSelectedFeeTypeIds([]);
      setFeeTypeAmounts({});
      loadInvoiceDetails();
    } catch (err) {
      console.error("Failed to add fee types", err);
      toast.error(err.response?.data?.error || "Failed to add fee types to invoice");
    } finally {
      setAddingFeeTypes(false);
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

  const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

  const handlePrintDemand = async () => {
    setProcessingPdf(true);
    const toastId = toast.loading("Generating invoice PDF for printing...");
    try {
      const res = await API.get(`/fee/get/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      toast.success("Opening print preview...", { id: toastId });
      printPdfBlob(res.data);
    } catch (err) {
      console.error("Failed to print demand", err);
      toast.error("Failed to generate demand PDF", { id: toastId });
    } finally {
      setProcessingPdf(false);
    }
  };

  const handlePrintCombined = async (pId = null, existingToastId = null) => {
    setProcessingPdf(true);
    const toastId = existingToastId || toast.loading("Generating print receipt & invoice PDF...");
    try {
      let endpoint = `/fee/get/invoices/${invoiceId}/combined-pdf`;
      if (pId) endpoint += `?payment_id=${pId}`;

      const res = await API.get(endpoint, {
        responseType: "blob",
      });
      toast.success("Opening print preview...", { id: toastId });
      printPdfBlob(res.data);
    } catch (err) {
      console.error("Failed to print combined PDF", err);
      toast.error("Failed to generate PDF", { id: toastId });
    } finally {
      setProcessingPdf(false);
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    if (!paymentId) return;
    setPrintingReceiptId(paymentId);
    const toastId = toast.loading("Generating receipt PDF for printing...");
    try {
      const res = await API.get(`/fee/payments/${paymentId}/receipt`, {
        responseType: "blob",
      });
      toast.success("Opening print preview...", { id: toastId });
      printPdfBlob(res.data);
    } catch (err) {
      console.error("Failed to print receipt", err);
      toast.error("Failed to generate receipt PDF", { id: toastId });
    } finally {
      setPrintingReceiptId(null);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    // Calculate total paid amount from methodAmounts
    let totalPaid = 0;
    let paymentMethodStringArray = [];
    if (selectedMethods.length > 0) {
      selectedMethods.forEach(methodId => {
        const amount = parseFloat(methodAmounts[methodId]) || 0;
        if (amount > 0) {
          totalPaid += amount;
          const label = availableMethods.find(m => m.id === methodId)?.label || methodId;
          paymentMethodStringArray.push(`${amount} ${label}`);
        }
      });
    }

    const pAmt = totalPaid;
    const dAmt = parseFloat(paymentData.discount_amount) || 0;

    if (pAmt <= 0 && dAmt <= 0) {
      toast.error("Please enter a valid payment or discount amount");
      return;
    }

    const invoiceBalance = invoice ? Math.max(0, parseFloat(invoice.amount_due || 0) - parseFloat(invoice.amount_paid || 0)) : 0;
    if (dAmt > invoiceBalance) {
      toast.error(`Discount amount (${formatCurrency(dAmt)}) exceeds invoice balance (${formatCurrency(invoiceBalance)})`);
      return;
    }
    const remainingBalanceAfterDiscount = Math.max(0, invoiceBalance - dAmt);
    if (pAmt > remainingBalanceAfterDiscount) {
      toast.error(`Payment amount (${formatCurrency(pAmt)}) exceeds remaining invoice balance (${formatCurrency(remainingBalanceAfterDiscount)})`);
      return;
    }

    const finalPaymentMethodString = paymentMethodStringArray.length > 0 
      ? paymentMethodStringArray.join(', ') 
      : "None";

    setProcessingPayment(true);
    const toastId = toast.loading("Processing payment...");
    try {
      const response = await API.post(`/fee/add/invoices/${invoiceId}/pay`, {
        invoice_id: parseInt(invoiceId),
        paid_amount: pAmt,
        payment_method: finalPaymentMethodString,
        reference: paymentData.reference,
        discount_amount: dAmt,
        discount_reason: paymentData.discount_reason
      });

      const paymentId = response.data.payment_id;

      setPaymentDialogOpen(false);
      setPaymentData({
        paid_amount: "",
        payment_method: "cash",
        reference: "",
        discount_amount: "",
        discount_reason: ""
      });
      setSelectedMethods(["cash"]);
      setMethodAmounts({ cash: "" });
      loadInvoiceDetails();

      toast.loading("Payment recorded! Generating print receipt PDF...", { id: toastId });
      await handlePrintCombined(paymentId, toastId);
    } catch (err) {
      console.error("Failed to record payment", err);
      toast.error(err.response?.data?.error || "Failed to record payment", { id: toastId });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDownloadPDF = async () => {
    setProcessingPdf(true);
    try {
      const res = await API.get(`/fee/get/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      // const url = window.URL.createObjectURL(new Blob([res.data]));
      // const link = document.createElement('a');
      // link.href = url;
      // link.setAttribute('download', `Invoice_INV_${invoiceId}.pdf`);
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
      // toast.success("Invoice PDF downloaded");

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'download',
            payload: {
              base64,
              fileName: `Invoice_INV_${invoiceId}.pdf`,
              mimeType: 'application/pdf'
            }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice_INV_${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Invoice PDF downloaded");
      }
    } catch (err) {
      console.error("Failed to download PDF", err);
      toast.error("Failed to download PDF");
    } finally {
      setProcessingPdf(false);
    }
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
      case 'carried_forward':
        return <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">Carried Forward</Badge>;
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

  const calculateBalance = () => {
    if (!invoice) return 0;
    let balance = parseFloat(invoice.amount_due) - parseFloat(invoice.amount_paid);
    if (paymentDialogOpen && paymentData.discount_amount && !isNaN(parseFloat(paymentData.discount_amount))) {
      balance -= parseFloat(paymentData.discount_amount);
    }
    return balance < 0 ? 0 : balance;
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Invoice not found</p>
        <Button onClick={() => navigate("/school/finance/invoice/manage")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/school/finance/invoice/manage")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice INV-{invoice.id.toString().padStart(4, '0')}
            </h1>
            <p className="text-muted-foreground mt-1">
              Invoice details and payment history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={loadInvoiceDetails}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={processingPdf} className="w-full sm:w-auto">
            {processingPdf ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {processingPdf ? "Downloading..." : "Download PDF"}
          </Button>
          {/* <Button variant="outline" onClick={handlePrintDemand} className="w-full sm:w-auto text-blue-600 border-blue-200">
            <FileText className="h-4 w-4 mr-2" />
            Print Demand
          </Button> */}
          <Button variant="outline" onClick={() => handlePrintCombined()} disabled={processingPdf} className="w-full sm:w-auto text-blue-600 border-blue-200">
            {processingPdf ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {processingPdf ? "Generating..." : "Print Invoices"}
          </Button>
          {invoice.status !== 'carried_forward' && (
            <Button
              variant="outline"
              onClick={handleOpenAddFeeTypeModal}
              className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Type
            </Button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'carried_forward' && calculateBalance() > 0 && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-2xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record payment for invoice INV-{invoice.id.toString().padStart(4, '0')}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRecordPayment}>
                  {(() => {
                    const totalPaidAmount = selectedMethods.reduce((sum, id) => sum + (parseFloat(methodAmounts[id]) || 0), 0);
                    const rawInvoiceBalance = invoice ? Math.max(0, parseFloat(invoice.amount_due || 0) - parseFloat(invoice.amount_paid || 0)) : 0;
                    const enteredDiscount = parseFloat(paymentData.discount_amount) || 0;
                    const netInvoiceBalance = Math.max(0, rawInvoiceBalance - enteredDiscount);
                    const isPaymentExceeded = totalPaidAmount > netInvoiceBalance;
                    const isDiscountExceeded = enteredDiscount > rawInvoiceBalance;

                    return (
                      <>
                        <ScrollArea className="max-h-[75vh] pr-2">
                        <div className="space-y-4 py-2">
                          {/* Balance summary bar */}
                          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">Invoice Balance</p>
                              <p className="text-xl font-bold font-mono">{formatCurrency(calculateBalance())}</p>
                            </div>
                            <div className="h-8 w-px bg-border" />
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">Amount Being Paid</p>
                              <p className={`text-xl font-bold font-mono transition-colors ${
                                isPaymentExceeded ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400'
                              }`}>
                                {formatCurrency(totalPaidAmount)}
                              </p>
                            </div>
                          </div>

                          {/* Warning Alerts */}
                          {isPaymentExceeded && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 animate-in fade-in duration-200">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                              <div className="text-xs space-y-0.5">
                                <p className="font-semibold text-sm text-red-800 dark:text-red-200">
                                  ⚠️ Payment Exceeds Invoice Balance!
                                </p>
                                <p>
                                  Total payment amount ({formatCurrency(totalPaidAmount)}) is greater than remaining balance ({formatCurrency(netInvoiceBalance)}) by <strong className="font-bold underline">{formatCurrency(totalPaidAmount - netInvoiceBalance)}</strong>. Please correct the entered amount.
                                </p>
                              </div>
                            </div>
                          )}

                          {isDiscountExceeded && (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 animate-in fade-in duration-200">
                              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                              <div className="text-xs space-y-0.5">
                                <p className="font-semibold text-sm text-red-800 dark:text-red-200">
                                  ⚠️ Discount Exceeds Invoice Balance!
                                </p>
                                <p>
                                  Discount amount ({formatCurrency(enteredDiscount)}) exceeds remaining invoice balance ({formatCurrency(rawInvoiceBalance)}).
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="font-semibold">Payment Methods</Label>
                            <div className="grid grid-cols-3 gap-2 border p-3 rounded-md">
                              {availableMethods.map((method) => {
                                const isSelected = selectedMethods.includes(method.id);
                                return (
                                  <div
                                    key={method.id}
                                    onClick={() => {
                                      setSelectedMethods(prev => {
                                        if (isSelected) return prev.filter(m => m !== method.id);
                                        return [...prev, method.id];
                                      });
                                      if (isSelected) setMethodAmounts(prev => ({ ...prev, [method.id]: "" }));
                                    }}
                                    className={`flex flex-col gap-2 p-2 border-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                      <Checkbox
                                        id={`detail-method-${method.id}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          setSelectedMethods(prev => {
                                            if (checked) return [...prev, method.id];
                                            return prev.filter(m => m !== method.id);
                                          });
                                          if (!checked) setMethodAmounts(prev => ({ ...prev, [method.id]: "" }));
                                        }}
                                      />
                                      <label
                                        htmlFor={`detail-method-${method.id}`}
                                        className="text-sm font-semibold cursor-pointer select-none whitespace-nowrap"
                                      >
                                        {method.label}
                                      </label>
                                    </div>
                                    {isSelected && (
                                      <Input
                                        type="number"
                                        placeholder="₹ Amount"
                                        className="h-8 text-sm"
                                        value={methodAmounts[method.id] || ""}
                                        onClick={e => e.stopPropagation()}
                                        onChange={(e) => setMethodAmounts(prev => ({ ...prev, [method.id]: e.target.value }))}
                                        min="0"
                                        step="0.01"
                                        autoFocus
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="discount_amount" className="text-sm font-medium">Discount Amount (Optional)</label>
                            <Input
                              id="discount_amount"
                              name="discount_amount"
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={paymentData.discount_amount}
                              onChange={handlePaymentInputChange}
                              min="0"
                            />
                            <p className="text-xs text-muted-foreground">
                              Maximum discount: {formatCurrency(parseFloat(invoice.amount_due) - parseFloat(invoice.amount_paid))}
                            </p>
                          </div>

                          {paymentData.discount_amount && parseFloat(paymentData.discount_amount) > 0 && (
                            <div className="space-y-2">
                              <Label>Discount Reason(Optional)</Label>
                              <Input
                                name="discount_reason"
                                type="text"
                                placeholder="e.g., Sibling discount, sports concession"
                                value={paymentData.discount_reason}
                                onChange={handlePaymentInputChange}
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <label htmlFor="reference" className="text-sm font-medium">Reference Number</label>
                            <Input
                              id="reference"
                              name="reference"
                              placeholder="e.g., CASH-RECEIPT-001"
                              value={paymentData.reference}
                              onChange={handlePaymentInputChange}
                            />
                          </div>
                        </div>
                        </ScrollArea>
                        <DialogFooter className="mt-4">
                          <Button type="button" variant="outline" disabled={processingPayment} onClick={() => setPaymentDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={processingPayment || isPaymentExceeded || isDiscountExceeded}
                            className={isPaymentExceeded || isDiscountExceeded ? "opacity-60 cursor-not-allowed bg-red-600 hover:bg-red-600 text-white" : ""}
                          >
                            {processingPayment ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Record Payment
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </>
                    );
                  })()}
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Invoice Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Academic Year</div>
                <div className="text-sm">{invoice.academic_year_name}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Period</div>
                <div className="text-sm">
                  {formatDate(invoice.period_start)} to {formatDate(invoice.period_end)}<br />
                  {invoice.period}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Student</div>
                <div className="text-sm">Student ID: {invoice.student_id}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Class</div>
                <div className="text-sm">{invoice.class_name || `Class ${invoice.class_id}`}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Amount Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Base Total:</div>
              <div className="font-mono font-bold">{formatCurrency(parseFloat(invoice.amount_due || 0) + parseFloat(invoice.discount_amount || 0))}</div>
            </div>
            <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
              <div className="text-sm">Total Discount (-):</div>
              <div className="font-mono font-bold">-{formatCurrency(invoice.discount_amount || 0)}</div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm">Net Payable:</div>
              <div className="font-mono font-bold">{formatCurrency(invoice.amount_due)}</div>
            </div>
            <div className="flex justify-between items-center text-green-600 dark:text-green-400">
              <div className="text-sm">Paid to Date (-):</div>
              <div className="font-mono font-medium">{formatCurrency(invoice.amount_paid)}</div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <div className="text-sm font-bold">Current Balance:</div>
              <div className={`font-mono text-lg font-bold ${calculateBalance() > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                }`}>
                {formatCurrency(calculateBalance())}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status & Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.status === 'carried_forward' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" />
                This invoice has been carried forward to a newer invoice of the next month.
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Status:</div>
              <div>{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="text-sm   ">
              <div className="font-medium">Created:</div>
              <div>{formatDate(invoice.created_at)}</div>
            </div>
            <div className="text-sm  flex items-center justify-between">
              <div className="font-medium">Duration:</div>
              <div>{invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Lines */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Fee Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of fees in this invoice
            </CardDescription>
          </div>
          {invoice.status !== 'carried_forward' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAddFeeTypeModal}
              className="h-9 font-semibold text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Fee Type
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <>
            {invoice.fines && invoice.fines.length > 0 && (
              <div className="hidden xl:block rounded-md border mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dues / Fine Type</TableHead>
                      <TableHead>Description / Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.fines.map((fine) => (
                      <TableRow key={fine.id}>
                        <TableCell>
                          <div className="font-medium capitalize">{fine.fine_type ? fine.fine_type.replace(/_/g, ' ') : ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">{fine.description || fine.fine_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {Boolean(fine.is_reversed) ? (
                            <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300">
                              Reversed {fine.reversed_reason ? `- ${fine.reversed_reason}` : ""}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!Boolean(fine.is_reversed) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFine(fine);
                                setReverseDialogOpen(true);
                              }}
                            >
                              Reverse
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-right">
                          {formatCurrency(fine.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="hidden xl:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lines && invoice.lines.length > 0 ? (
                    invoice.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div className="font-medium">{line.fee_name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{line.fee_code}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(line.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No fee lines found for this invoice
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="text-right font-medium text-muted-foreground uppercase text-xs">
                      Subtotal:
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(parseFloat(invoice.amount_due || 0) + parseFloat(invoice.discount_amount || 0))}
                    </TableCell>
                  </TableRow>
                  {invoice.discounts && invoice.discounts.map((discount) => (
                    <TableRow key={`discount-${discount.id}`} className="text-orange-600 dark:text-orange-400 italic">
                      <TableCell colSpan={2} className="text-right">
                        <div className="text-xs uppercase font-medium">Discount: {discount.reason || 'Applied Discount'} (-)</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        -{formatCurrency(discount.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-bold">
                      Net Amount Due:
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold">
                      {formatCurrency(invoice.amount_due)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="text-green-600 dark:text-green-400">
                    <TableCell colSpan={2} className="text-right font-medium uppercase text-xs">
                      Total Paid (-):
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(invoice.amount_paid)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2 border-primary/20">
                    <TableCell colSpan={2} className="text-right font-black uppercase text-sm">
                      Outstanding Balance:
                    </TableCell>
                    <TableCell className="text-right font-mono text-xl font-black text-primary">
                      {formatCurrency(calculateBalance())}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:hidden">
              {invoice.lines && invoice.lines.length > 0 ? (
                invoice.lines.map((line) => (
                  <Card key={line.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{line.fee_name}</div>
                      <div className="font-bold">{formatCurrency(line.amount)}</div>
                    </div>
                    <div>
                      <Badge variant="outline">{line.fee_code}</Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded bg-muted/20">
                  No fee lines found for this invoice
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <Card className="p-4 bg-muted/30 flex justify-between items-center mt-2 border-dashed border-2">
                  <span className="font-medium text-muted-foreground">Total Before Discount:</span>
                  <span className="font-bold text-muted-foreground">
                    {formatCurrency(parseFloat(invoice.amount_due || 0) + parseFloat(invoice.discount_amount || 0))}
                  </span>
                </Card>
              )}
              {invoice.discounts && invoice.discounts.map((discount) => (
                <Card key={`mdiscount-${discount.id}`} className="p-4 flex flex-col gap-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-orange-600 dark:text-orange-400">Discount: {discount.reason || 'Applied'}</div>
                    <div className="font-bold text-orange-600 dark:text-orange-400">-{formatCurrency(discount.amount)}</div>
                  </div>
                </Card>
              ))}
              <Card className="p-4 bg-muted/50 border-primary/20 flex justify-between items-center mt-2">
                <span className="font-bold">Total Amount Due:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(invoice.amount_due)}
                </span>
              </Card>
            </div>
          </>

          <>

            <div className="grid grid-cols-1 gap-4 md:hidden mt-4">
              {invoice.fines && invoice.fines.length > 0 && (
                <h3 className="font-medium text-sm text-muted-foreground">Fines</h3>
              )}
              {invoice.fines && invoice.fines.length > 0 ? (
                invoice.fines.map((fine) => (
                  <Card key={fine.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="font-medium capitalize">{fine.fine_type ? fine.fine_type.replace(/_/g, ' ') : ''}</div>
                      <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(fine.amount)}</div>
                    </div>
                    <div>
                      <Badge variant="outline">{fine.description}</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t pt-2">
                      <div>
                        {Boolean(fine.is_reversed) ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300">
                            Reversed
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Active
                          </Badge>
                        )}
                      </div>
                      {!Boolean(fine.is_reversed) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedFine(fine);
                            setReverseDialogOpen(true);
                          }}
                        >
                          Reverse
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              ) : null}
            </div>
          </>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All payments made against this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoice.payments && invoice.payments.length > 0 ? (
            <>
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">{formatDate(payment.payment_date)}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {payment.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(payment.paid_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">User #{payment.processed_by}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintReceipt(payment.id)}
                            title="Print Receipt"
                            className="text-green-600"
                            disabled={printingReceiptId === payment.id}
                          >
                            {printingReceiptId === payment.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">
                        Total Paid:
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(invoice.amount_paid)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {invoice.payments.map((payment) => (
                  <Card key={payment.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{formatDate(payment.payment_date)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(payment.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • User #{payment.processed_by}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                          {formatCurrency(payment.paid_amount)}
                        </div>
                        <div className="mt-1">
                          <Badge variant="outline" className="capitalize">
                            {payment.payment_method}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {payment.reference && (
                      <div className="text-sm font-mono mt-2 p-1.5 bg-muted/30 rounded border border-dashed">
                        Ref: {payment.reference}
                      </div>
                    )}
                    <div className="flex justify-end mt-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintReceipt(payment.id)}
                        className="text-green-600 border-green-200"
                        disabled={printingReceiptId === payment.id}
                      >
                        {printingReceiptId === payment.id ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        {printingReceiptId === payment.id ? "Generating..." : "Print Receipt"}
                      </Button>
                    </div>
                  </Card>
                ))}

                <Card className="p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/40 flex justify-between items-center">
                  <span className="font-bold text-green-800 dark:text-green-400">Total Paid:</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(invoice.amount_paid)}
                  </span>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-8 border rounded bg-muted/50">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No payments recorded yet</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Record a payment to update the invoice status
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-full max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Reverse Fine</DialogTitle>
            <DialogDescription>
              This action will adjust invoice total and cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Reason for reversal</Label>
            <Input
              placeholder="Enter reason"
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                await API.post(
                  `/fee/invoices/fines/${selectedFine.id}/reverse`,
                  { reason: reverseReason }
                );
                toast.success("Fine reversed");
                setReverseDialogOpen(false);
                loadInvoiceDetails();
              }}
            >
              Confirm Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Fee Type Dialog */}
      <Dialog open={addFeeTypeDialogOpen} onOpenChange={setAddFeeTypeDialogOpen}>
        <DialogContent
          className="w-full max-w-2xl rounded-2xl"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-blue-600" />
              Add Fee Types to Invoice
            </DialogTitle>
            <DialogDescription>
              Select fee types that are not yet added to Invoice INV-{invoice.id.toString().padStart(4, '0')} ({invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'})
            </DialogDescription>
          </DialogHeader>

          {loadingAvailableFees ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <RefreshCw className="h-7 w-7 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-muted-foreground">Loading available fee types...</p>
            </div>
          ) : (
            <form onSubmit={handleAddFeeTypesSubmit} className="space-y-4">
              <ScrollArea className="max-h-[70vh] pr-2">
                <div className="space-y-4 py-1">
                  {/* Multi-select Fee Types Popover */}
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-semibold flex items-center justify-between">
                      <span>Available Fee Types to Add *</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {availableFeeOptions.length} available to add
                      </span>
                    </label>

                    {availableFeeOptions.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed text-center bg-muted/30 text-sm text-muted-foreground">
                        All fee types are already added to this invoice or no fee types configured for this class.
                      </div>
                    ) : (
                      <Popover open={feeTypeSearchOpen} onOpenChange={setFeeTypeSearchOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between h-10 px-3 font-normal"
                          >
                            <span className="truncate">
                              {selectedFeeTypeIds.length > 0
                                ? `${selectedFeeTypeIds.length} fee type${selectedFeeTypeIds.length > 1 ? 's' : ''} selected`
                                : "Select fee types to add..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[320px]"
                          align="start"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <Command>
                            <CommandInput placeholder="Search fee type..." className="focus:outline-none" />
                            <CommandList>
                              <CommandEmpty>No matching fee type found.</CommandEmpty>
                              <CommandGroup>
                                {availableFeeOptions.map((fee) => {
                                  const isChecked = selectedFeeTypeIds.includes(fee.fee_type_id);
                                  const months = Math.max(1, Number(invoice.months_count || 1));
                                  const calcAmt = (fee.monthly_amount * months).toFixed(2);
                                  return (
                                    <CommandItem
                                      key={fee.fee_type_id}
                                      value={`${fee.fee_name} ${fee.fee_code || ''} ${fee.fee_type_id}`}
                                      onSelect={() => toggleFeeTypeSelection(fee)}
                                      className="cursor-pointer py-2.5 flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded-sm border",
                                            isChecked
                                              ? "bg-blue-600 border-blue-600 text-white"
                                              : "border-muted-foreground/40 opacity-70"
                                          )}
                                        >
                                          {isChecked && <Check className="h-3 w-3" />}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-sm">{fee.fee_name}</span>
                                          {fee.fee_code && (
                                            <span className="text-xs text-muted-foreground font-mono">
                                              Code: {fee.fee_code}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right text-xs">
                                        {fee.monthly_amount > 0 ? (
                                          <div>
                                            <span className="font-semibold">{formatCurrency(calcAmt)}</span>
                                            <span className="text-muted-foreground block">
                                              ({formatCurrency(fee.monthly_amount)}/mo)
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground italic">Custom Amount</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  {/* Selected Fee Types List with Editable Amount */}
                  {selectedFeeTypeIds.length > 0 && (() => {
                    const totalAdditional = selectedFeeTypeIds.reduce((sum, fId) => {
                      const val = parseFloat(feeTypeAmounts[fId]) || 0;
                      return sum + val;
                    }, 0);
                    const currentNet = parseFloat(invoice?.amount_due || 0);
                    const newNet = currentNet + totalAdditional;
                    const currentBal = calculateBalance();
                    const newBal = currentBal + totalAdditional;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">
                            Configure Amount for Selected Fee Types ({selectedFeeTypeIds.length})
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700"
                            onClick={() => {
                              setSelectedFeeTypeIds([]);
                              setFeeTypeAmounts({});
                            }}
                          >
                            Clear All
                          </Button>
                        </div>

                        <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
                          {selectedFeeTypeIds.map((fId) => {
                            const fee = availableFeeOptions.find((opt) => opt.fee_type_id === fId);
                            const months = Math.max(1, Number(invoice.months_count || 1));
                            const stdAmount = (Number(fee?.monthly_amount || 0) * months).toFixed(2);
                            return (
                              <div
                                key={fId}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border rounded-lg shadow-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                    onClick={() => toggleFeeTypeSelection(fee)}
                                    title="Remove fee type"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <div className="truncate">
                                    <div className="font-semibold text-sm truncate">{fee?.fee_name || `Fee #${fId}`}</div>
                                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                                      {fee?.fee_code && <Badge variant="outline" className="text-[10px] py-0">{fee.fee_code}</Badge>}
                                      {fee?.monthly_amount > 0 ? (
                                        <span className="text-muted-foreground">Std: {formatCurrency(fee.monthly_amount)} × {months} mo = {formatCurrency(stdAmount)}</span>
                                      ) : (
                                        <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[10px] py-0 font-normal">
                                          No standard rate set for this class
                                        </Badge>
                                      )}
                                    </div>
                                    {fee?.monthly_amount === 0 && !feeTypeAmounts[fId] && (
                                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                                        👉 Please enter the amount in the box on the right.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                  <span className="text-xs font-medium text-muted-foreground">Amount:</span>
                                  <div className="relative w-36">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">₹</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      placeholder={fee?.monthly_amount > 0 ? stdAmount : "Enter ₹ amount"}
                                      className={cn(
                                        "h-8 pl-6 text-right font-mono text-sm font-semibold",
                                        !feeTypeAmounts[fId] && fee?.monthly_amount === 0 ? "border-amber-500 bg-amber-50/20" : ""
                                      )}
                                      value={feeTypeAmounts[fId] ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFeeTypeAmounts((prev) => ({
                                          ...prev,
                                          [fId]: val
                                        }));
                                      }}
                                      required
                                      autoFocus={fee?.monthly_amount === 0}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Financial Impact Breakdown Card */}
                        <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Invoice Summary Preview
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Additional Fees Total (+):</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              +{formatCurrency(totalAdditional)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Current Net Amount Due:</span>
                            <span className="font-mono">{formatCurrency(invoice.amount_due)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center text-sm font-bold">
                            <span>Updated Net Amount Due:</span>
                            <span className="font-mono text-base text-foreground">
                              {formatCurrency(newNet)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-bold">
                            <span>New Outstanding Balance:</span>
                            <span className="font-mono text-base text-red-600 dark:text-red-400">
                              {formatCurrency(newBal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </ScrollArea>

              <DialogFooter className="mt-4 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  disabled={addingFeeTypes}
                  onClick={() => setAddFeeTypeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    addingFeeTypes ||
                    selectedFeeTypeIds.length === 0 ||
                    selectedFeeTypeIds.some(fId => {
                      const val = parseFloat(feeTypeAmounts[fId]);
                      return isNaN(val) || val <= 0;
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {addingFeeTypes ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding Fee Types...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Add Selected Fee Types
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}