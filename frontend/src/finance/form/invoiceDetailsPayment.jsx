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
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/auth/AuthContext';

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
  const [processingPdf, setProcessingPdf] = useState(false);
  const [printingReceiptId, setPrintingReceiptId] = useState(null);

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
      setProcessingPdf(false);
    }
  };


  const handlePrintCombined = async (pId = null) => {
    setProcessingPdf(true);
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
      setProcessingPdf(false);
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    if (!paymentId) return;
    setPrintingReceiptId(paymentId);
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
      setPrintingReceiptId(null);
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
      const response = await API.post(`/fee/add/invoices/${invoiceId}/pay`, {
        invoice_id: parseInt(invoiceId),
        paid_amount: pAmt,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference,
        discount_amount: dAmt,
        discount_reason: paymentData.discount_reason
      });

      toast.success("Processed successfully");

      const paymentId = response.data.payment_id;

      // Automatically trigger combined printing
      await handlePrintCombined(paymentId);

      setPaymentDialogOpen(false);
      setPaymentData({
        paid_amount: "",
        payment_method: "cash",
        reference: "",
        discount_amount: "",
        discount_reason: ""
      });
      loadInvoiceDetails();
    } catch (err) {
      console.error("Failed to record payment", err);
      toast.error(err.response?.data?.error || "Failed to record payment");
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
          {invoice.status !== 'paid' && invoice.status !== 'carried_forward' && calculateBalance() > 0 && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md"
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
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Invoice Balance</label>
                      <div className="p-2 border rounded bg-muted text-foreground font-mono text-lg font-bold">
                        {formatCurrency(calculateBalance())}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="paid_amount" className="text-sm font-medium">Amount Paid</label>
                      <Input
                        id="paid_amount"
                        name="paid_amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentData.paid_amount}
                        onChange={handlePaymentInputChange}
                        min="0"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum: {formatCurrency(calculateBalance())}
                      </p>
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
                      <label className="text-sm font-medium">Payment Method</label>
                      <Select
                        value={paymentData.payment_method}
                        onValueChange={(value) => handlePaymentSelectChange("payment_method", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  <DialogFooter>
                    <Button type="button" variant="outline" disabled={processingPayment} onClick={() => setPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={processingPayment}>
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
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Status:</div>
              <div>{getStatusBadge(invoice.status)}</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Created:</div>
              <div>{formatDate(invoice.created_at)}</div>
            </div>
            <div className="text-sm">
              <div className="font-medium">Duration:</div>
              <div>{invoice.months_count} {invoice.months_count === 1 ? 'month' : 'months'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of fees in this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <>
            <div className="hidden xl:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fine Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.fines && invoice.fines.length > 0 ? (
                    invoice.fines.map((fine) => (
                      <TableRow key={fine.id}>
                        <TableCell>
                          <div className="font-medium">{fine.fine_type}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{fine.description}</Badge>
                        </TableCell>
                        <TableCell>
                          {fine.is_reversed && (
                            <Badge className="bg-muted text-muted-foreground hover:text-white mt-1">
                              Reversed - {fine.reversed_reason}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!fine.is_reversed && (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No fines found for this invoice
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="hidden xl:block rounded-md border mt-2">
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
                      <div className="font-medium">{fine.fine_type}</div>
                      <div className="font-bold text-red-600 dark:text-red-400">{formatCurrency(fine.amount)}</div>
                    </div>
                    <div>
                      <Badge variant="outline">{fine.description}</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t pt-2">
                      <div>
                        {fine.is_reversed && (
                          <Badge className="bg-muted text-muted-foreground">
                            Reversed
                          </Badge>
                        )}
                      </div>
                      {!fine.is_reversed && (
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
    </div>
  );
}