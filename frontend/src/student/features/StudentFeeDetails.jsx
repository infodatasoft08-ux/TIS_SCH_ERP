import React, { useState, useEffect, useMemo } from 'react';
import {
    CreditCard,
    Receipt,
    History,
    Info,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowUpRight,
    Wallet,
    Calendar,
    ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import API from '@/api';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import ResponsiveDataTable from '@/components/common/ResponsiveDataTable';

const StudentFeeDetails = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isInvoiceDetailsOpen, setIsInvoiceDetailsOpen] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState('current');

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    useEffect(() => {
        fetchFeeDetails();
    }, [selectedAcademicYear]);

    const fetchAcademicYears = async () => {
        try {
            const response = await API.get('/admin/get/academic-years?limit=100');
            setAcademicYears(response.data.academic_years || []);
        } catch (error) {
            console.error("Error fetching academic years:", error);
        }
    };

    const fetchFeeDetails = async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedAcademicYear !== 'current') {
                params.academic_year_id = selectedAcademicYear;
            }
            const response = await API.get('/fee/student-fee-details', { params });
            setData(response.data);
        } catch (error) {
            console.error("Error fetching fee details:", error);
            toast.error("Failed to load fee details");
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (!data) return { totalDue: 0, totalPaid: 0, outstanding: 0, totalFines: 0 };

        const invoices = data.invoices || [];
        const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.amount_due), 0);
        const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid), 0);
        const totalFines = data.fines?.reduce((sum, fine) => sum + Number(fine.amount), 0) || 0;

        return {
            totalDue,
            totalPaid,
            outstanding: totalDue - totalPaid,
            totalFines
        };
    }, [data]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid':
                return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-none px-3">Paid</Badge>;
            case 'pending':
                return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-none px-3">Pending</Badge>;
            case 'partially_paid':
                return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border-none px-3">Partial</Badge>;
            case 'overdue':
                return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-none px-3">Overdue</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    };

    const handleViewInvoice = async (invoice) => {
        try {
            const response = await API.get(`/fee/get/invoices/${invoice.id}`);
            setSelectedInvoice(response.data.invoice);
            setIsInvoiceDetailsOpen(true);
        } catch (error) {
            console.error("Error fetching invoice details:", error);
            toast.error("Failed to load invoice details");
        }
    };

    // Table Column Definitions
    const invoiceColumns = [
        { label: 'Invoice ID', render: (inv) => <span className="font-bold text-primary/80">#{inv.id}</span> },
        {
            label: 'Period',
            render: (inv) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{format(new Date(inv.period_start), 'MMM yyyy')}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">to {format(new Date(inv.period_end), 'MMM yyyy')}</span>
                </div>
            )
        },
        { label: 'Amount Due', render: (inv) => <span className="font-bold text-base">{formatCurrency(inv.amount_due)}</span> },
        { label: 'Paid', render: (inv) => <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(inv.amount_paid)}</span> },
        { label: 'Status', render: (inv) => getStatusBadge(inv.status) },
        {
            label: 'Action',
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (inv) => (
                <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleViewInvoice(inv)}>
                    <ChevronRight className="h-5 w-5" />
                </Button>
            )
        }
    ];

    const paymentColumns = [
        { label: 'Date', render: (p) => <span className="font-semibold">{format(new Date(p.payment_date), 'dd MMM yyyy')}</span> },
        { label: 'Invoice', render: (p) => <Badge variant="secondary" className="font-mono text-[10px] px-2">#{p.invoice_id}</Badge> },
        { label: 'Method', render: (p) => <Badge variant="outline" className="capitalize border-primary/20 bg-primary/5 text-[10px]">{p.payment_method}</Badge> },
        { label: 'Ref No.', render: (p) => <span className="font-mono text-[10px] text-muted-foreground">{p.reference || 'N/A'}</span> },
        {
            label: 'Paid Amount',
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (p) => <span className="text-green-600 dark:text-green-400 font-bold text-base">{formatCurrency(p.paid_amount)}</span>
        }
    ];

    // Mobile Card Renderers
    const renderInvoiceCard = (inv) => (
        <div key={inv.id} className="p-5 space-y-4 hover:bg-muted/30 transition-all active:scale-[0.98]">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Invoice Registry</div>
                    <div className="text-lg font-bold">#{inv.id}</div>
                    <div className="text-xs text-muted-foreground font-medium">
                        {format(new Date(inv.period_start), 'MMMM yyyy')}
                    </div>
                </div>
                {getStatusBadge(inv.status)}
            </div>
            <div className="grid grid-cols-2 gap-6 py-2 border-y border-dashed border-muted-foreground/10">
                <div>
                    <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Total Due</div>
                    <div className="text-md font-bold text-foreground/90">{formatCurrency(inv.amount_due)}</div>
                </div>
                <div>
                    <div className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Total Paid</div>
                    <div className="text-md font-bold text-green-600 dark:text-green-400">{formatCurrency(inv.amount_paid)}</div>
                </div>
            </div>
            <Button variant="default" className="w-full h-11 shadow-sm font-bold gap-2" onClick={() => handleViewInvoice(inv)}>
                View Details <ArrowUpRight className="h-4 w-4" />
            </Button>
        </div>
    );

    const renderPaymentCard = (p) => (
        <div key={p.id} className="p-5 space-y-3 hover:bg-muted/30 transition-all">
            <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                    <div className="text-[10px] text-primary/60 font-bold uppercase tracking-wider">{format(new Date(p.payment_date), 'EEEE')}</div>
                    <div className="text-sm font-black">{format(new Date(p.payment_date), 'dd MMMM yyyy')}</div>
                </div>
                <div className="text-xl font-black text-green-600 dark:text-green-400 italic">{formatCurrency(p.paid_amount)}</div>
            </div>
            <div className="flex justify-between items-center text-[10px] bg-muted/50 p-2 rounded-lg border border-muted-foreground/5">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-[9px] h-5">INV: #{p.invoice_id}</Badge>
                    <span className="capitalize font-bold text-muted-foreground">{p.payment_method}</span>
                </div>
                <div className="font-mono text-muted-foreground opacity-60">REF: {p.reference || 'N/A'}</div>
            </div>
        </div>
    );

    // Fee Structure Custom Content
    const FeeStructureContent = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
                <Card className="border-none shadow-xl ring-1 ring-border overflow-hidden bg-background/40 backdrop-blur-md">
                    <CardHeader className="bg-primary/5 pb-2 border-b border-primary/10">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-2xl">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black">Monthly Fees</CardTitle>
                                {/* <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/60">Active setup for {data?.student?.grade_name}</CardDescription> */}
                            </div>
                        </div>
                    </CardHeader>
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-0">
                                <TableHead className="py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Fee Component</TableHead>
                                <TableHead className="py-4 font-bold text-xs uppercase tracking-widest text-muted-foreground">Billing Rate</TableHead>
                                <TableHead className="py-4 text-right font-bold text-xs uppercase tracking-widest text-muted-foreground">Monthly Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.fee_structure?.map((fee, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/20 transition-colors border-b border-muted-foreground/5 last:border-0 h-16">
                                    <TableCell>
                                        <div className="font-bold text-foreground/80">{fee.fee_name}</div>
                                        <div className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase">{fee.fee_code}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 text-primary/60">Recurring</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-base">{formatCurrency(fee.monthly_amount)}</TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-primary/5 hover:bg-primary/10 transition-colors font-black border-t-2 border-primary/20 h-10">
                                <TableCell colSpan={2} className="text-lg">Total Monthly Commitment</TableCell>
                                <TableCell className="text-right text-xl text-primary drop-shadow-sm">
                                    {formatCurrency(data?.fee_structure?.reduce((sum, f) => sum + Number(f.monthly_amount), 0))}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Card>
            </div>

            <div className="space-y-8">
                <Card className="border-none shadow-lg ring-1 ring-border bg-gradient-to-br from-primary/10 via-background to-background relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 bg-primary/20 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <CardHeader>
                        <CardTitle className="text-xs uppercase tracking-[0.2em] text-primary font-black">Note</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-8 text-muted-foreground/80 pb-2">
                        <div className="flex items-start gap-4 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="leading-relaxed">Fees are assigned based on your current academic tier: <strong className="text-foreground">{data?.student?.grade_name}</strong>.</p>
                        </div>
                        <div className="flex items-start gap-4 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="leading-relaxed">Invoices are computed on the <strong className="text-foreground">1st of every month</strong> as per the billing cycle.</p>
                        </div>
                        <div className="flex items-start gap-4 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-black/20 transition-colors">
                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">Cumulative <strong className="text-red-600/80">Late Fines</strong> apply to overdue invoices after the 10th of the month.</p>
                        </div>
                    </CardContent>
                </Card>
                {/* <Button className="w-full shadow-2xl h-14 text-lg font-black transition-all hover:scale-[1.03] active:scale-[0.98] group relative overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">Pay Outstanding Balance <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80" />
                </Button> */}
            </div>
        </div>
    );

    // Tab Configuration for ResponsiveDataTable
    const feeTabs = [
        {
            value: 'invoices',
            label: 'Invoices',
            icon: Receipt,
            data: data?.invoices || [],
            columns: invoiceColumns,
            renderCard: renderInvoiceCard,
            searchKey: 'id',
            searchPlaceholder: "Search by Invoice ID (e.g. 101)",
            statusOptions: [
                { label: 'Pending', value: 'pending' },
                { label: 'Completed', value: 'paid' },
                { label: 'Partial', value: 'partially_paid' },
                { label: 'Overdue', value: 'overdue' }
            ]
        },
        {
            value: 'structure',
            label: 'Fee Structure',
            icon: CreditCard,
            content: FeeStructureContent
        },
        {
            value: 'history',
            label: 'Payments',
            icon: History,
            data: data?.payments || [],
            columns: paymentColumns,
            renderCard: renderPaymentCard,
            searchKey: 'invoice_id',
            searchPlaceholder: "Search by Invoice ID..."
        }
    ];

    if (loading) {
        return (
            <div className="container mx-auto p-6 md:p-12 space-y-12 animate-in fade-in duration-700">
                <div className="space-y-4">
                    <Skeleton className="h-12 w-64 rounded-xl" />
                    <Skeleton className="h-5 w-96 opacity-50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="overflow-hidden border-none shadow-lg">
                            <CardHeader className="pb-4"><Skeleton className="h-4 w-28" /></CardHeader>
                            <CardContent><Skeleton className="h-10 w-40" /></CardContent>
                        </Card>
                    ))}
                </div>

                <div className="space-y-8 mt-12">
                    <Skeleton className="h-12 w-full md:w-[600px] rounded-2xl" />
                    <Skeleton className="h-[500px] w-full rounded-3xl opacity-40 shadow-inner" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 md:p-12 space-y-12 max-w-7xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Superior Header Design */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-muted pb-5">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                            <Wallet className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-foreground/90 leading-tight">
                            Fee <span className="text-primary italic">Details</span>
                        </h1>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2.5 font-medium ml-1 bg-muted/30 w-fit px-4 py-1.5 rounded-full border border-muted-foreground/10">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        Academic Cycle: <span className="text-foreground/80 font-bold">{data?.student?.academic_year_name || data?.student?.academic_year || '--'}</span>
                    </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3 bg-background p-2 rounded-2xl shadow-md ring-1 ring-border border-b-4 border-primary/20">
                        <div className="px-2 py-2 border-r border-muted flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Standard</span>
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-xl font-bold text-sm bg-primary/10 text-primary border-none">{data?.student?.grade_name}</Badge>
                        </div>
                        <div className="px-2 py-2 flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Division</span>
                            <Badge variant="outline" className="px-4 py-1.5 rounded-xl font-bold text-sm border-2 border-primary/10">{data?.student?.class_name}</Badge>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">View Year:</span>
                        <select 
                            value={selectedAcademicYear} 
                            onChange={(e) => setSelectedAcademicYear(e.target.value)}
                            className="bg-background border-2 border-primary/20 rounded-xl px-4 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                        >
                            <option value="current">Current Active</option>
                            {academicYears.map(ay => (
                                <option key={ay.id} value={ay.id}>{ay.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Metrics Grid with Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="relative overflow-hidden group border-none shadow-xl ring-1 ring-border hover:ring-2 hover:ring-primary/20 transition-all duration-500 bg-background/60 backdrop-blur-sm">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-700">
                        <Wallet className="h-24 w-24 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/60">Total Payable</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter">{formatCurrency(stats.totalDue)}</div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-xl ring-1 ring-border hover:ring-2 hover:ring-green-500/20 transition-all duration-500 bg-background/60 backdrop-blur-sm">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-700">
                        <CheckCircle2 className="h-24 w-24 text-green-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-green-600/60">Total Cleared</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter text-green-600 dark:text-green-400">{formatCurrency(stats.totalPaid)}</div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-xl ring-1 ring-border hover:ring-2 hover:ring-amber-500/20 transition-all duration-500 bg-background/60 backdrop-blur-sm">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-700">
                        <Clock className="h-24 w-24 text-amber-500" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-600/60">Balance Due</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter text-amber-600 dark:text-amber-400">{formatCurrency(stats.outstanding)}</div>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group border-none shadow-xl ring-1 ring-border bg-primary/10 hover:bg-primary/[0.15] transition-all duration-500 ring-2 ring-primary/20">
                    <div className="absolute -bottom-6 -right-6 p-4 opacity-10 group-hover:scale-125 group-hover:opacity-15 transition-all duration-700">
                        <AlertCircle className="h-24 w-24 text-primary" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/80 italic">Penalties Accrued</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black tracking-tighter drop-shadow-sm">{formatCurrency(stats.totalFines)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Standardized Tabbed Data View */}
            <ResponsiveDataTable
                tabs={feeTabs}
                defaultTab="invoices"
                className="mt-8"
            />

            {/* Enhanced Invoice Details Dialog */}
            <Dialog open={isInvoiceDetailsOpen} onOpenChange={setIsInvoiceDetailsOpen}>
                <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-md bg-background/95 backdrop-blur-xl">
                    <DialogHeader className="p-4 bg-primary text-primary-foreground relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="flex justify-between items-start relative z-10">
                            <div className="space-y-2">
                                {/* <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Document Registry</div> */}
                                <DialogTitle className="text-3xl font-black tracking-tighter italic">#{selectedInvoice?.id}</DialogTitle>
                                <DialogDescription className="text-primary-foreground/90 font-bold text-sm bg-black/10 w-fit px-3 py-1 rounded-lg">
                                    Issued on {selectedInvoice && format(new Date(selectedInvoice.created_at), 'dd MMM yyyy')}
                                </DialogDescription>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Status</span>
                                {selectedInvoice && getStatusBadge(selectedInvoice.status)}
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-4 space-y-5 overflow-y-auto max-h-[60vh]">
                        {/* Period and Basic Info */}
                        <div className="grid grid-cols-2 gap-8 pb-8 border-b border-muted">
                            <div className="space-y-2">
                                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Billing Period</span>
                                <div className="flex items-center text-md font-black italic">
                                    <Calendar className="h-5 w-5 mr-3 text-primary opacity-60" />
                                    {selectedInvoice && `${format(new Date(selectedInvoice.period_start), 'MMM yyyy')} - ${format(new Date(selectedInvoice.period_end), 'MMM yyyy')}`}
                                </div>
                            </div>
                            <div className="space-y-2 text-right">
                                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">Due Deadline</span>
                                <div className="text-md font-black text-red-500 italic">
                                    {selectedInvoice?.period_end ? format(new Date(selectedInvoice.period_end), 'dd MMM yyyy') : 'NOT SET'}
                                </div>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="space-y-5">
                            {/* <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 text-foreground/70">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" /> Itemized Invoice
                            </h4> */}
                            <div className="bg-muted/30 rounded-2xl border border-muted-foreground/10 overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="border-0">
                                            <TableHead className="py-4 text-[10px] uppercase font-black tracking-tighter text-muted-foreground">Charge Description</TableHead>
                                            <TableHead className="py-4 text-right text-[10px] uppercase font-black tracking-tighter text-muted-foreground">Amount (INR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedInvoice?.lines?.map((line, i) => (
                                            <TableRow key={i} className="border-muted-foreground/5 h-14 hover:bg-muted/20">
                                                <TableCell className="font-bold text-foreground/80">{line.fee_name}</TableCell>
                                                <TableCell className="text-right font-black text-sm">{formatCurrency(line.amount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Fines if any */}
                        {selectedInvoice?.fines?.length > 0 && (
                            <div className="space-y-5 animate-in slide-in-from-right-4">
                                <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 text-red-600/80">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-600" /> Penalties Identified
                                </h4>
                                <div className="bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-200/50 p-6 space-y-4 shadow-inner">
                                    {selectedInvoice.fines.map((fine, i) => (
                                        <div key={i} className="flex justify-between items-center group">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                                                    <span className="font-black text-sm uppercase tracking-tighter text-red-700/80">{fine.fine_type}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/80 font-medium italic ml-5">{fine.description}</p>
                                            </div>
                                            <span className="font-black text-xl text-red-600 italic tracking-tighter">{formatCurrency(fine.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Master Total Summary */}
                        <div className="bg-muted/40 p-8 rounded-[1.5rem] space-y-3 border border-muted-foreground/10 relative overflow-hidden ring-1 ring-primary/5">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                                <span className="text-muted-foreground">Subtotal Base</span>
                                <span className="text-foreground/70">{formatCurrency(selectedInvoice?.amount_due - (selectedInvoice?.fines || []).reduce((s, f) => s + Number(f.amount), 0))}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest border-b border-muted-foreground/10 pb-4">
                                <span className="text-red-500/80">Applied Penalties</span>
                                <span className="text-red-600">+{formatCurrency((selectedInvoice?.fines || []).reduce((s, f) => s + Number(f.amount), 0))}</span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-primary/60 tracking-[0.3em]">Grand Total</span>
                                    <div className="text-xl font-black tracking-tighter italic text-primary">{formatCurrency(selectedInvoice?.amount_due)}</div>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    <span className="text-[10px] font-black uppercase text-green-600/60 tracking-[0.2em]">Already Cleared</span>
                                    <div className="text-lg font-black text-green-600 italic underline decoration-green-600/30 underline-offset-8">
                                        {formatCurrency(selectedInvoice?.amount_paid)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-muted/20 border-t border-muted-foreground/5 flex gap-4">
                        <Button variant="outline" className="flex-1 h-10 rounded-md text-sm font-black hover:bg-muted/40 transition-all border-2 border-primary/10" onClick={() => setIsInvoiceDetailsOpen(false)}>
                            Dismiss
                        </Button>
                        <Button className="flex-1 h-10 rounded-md text-sm font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                            Print Invoice
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudentFeeDetails;
