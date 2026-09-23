const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { restrictRoles } = require('../middleware/admincheck');
const { createFeeType, GetFeeTypes, GetFeeTypeById, UpdateFeeType, CreateClassFeeStructure, GetClassFeeStructure, UpdateClassFeeStructure, DeleteClassFeeStructure, CreateInvoice, GetInvoices, GetInvoiceById, DownloadInvoicePDF, DownloadPaymentReceiptPDF, DeleteInvoice, AddPaymentToInvoice, GetPayments, GetStudentFeeSummary, CreateBulkInvoices, UpdateInvoiceWithFine, AddInvoiceFine, AddPreviousDues, AddInvoiceDiscount, ReverseInvoiceFine, GetFinesByInvoiceId, GetStudentFeeFullDetails, DownloadCombinedPDF, DeleteFeeType, DisableAutoGenerate, BulkDeleteInvoices, DownloadBulkInvoicePDF, ExportDueInvoicesCSV, ExportPaymentHistoryCSV, RestoreInvoiceStatus } = require('../controller/feeController');


// Fee Type Routes
router.post('/add/feestype', auth, restrictRoles([1, 5]), createFeeType);
router.get('/list/feestype', auth, GetFeeTypes);
router.get('/get/feestype/:id', auth, GetFeeTypeById);
router.put('/update/feestype/:id', auth, restrictRoles([1, 5]), UpdateFeeType);
router.delete('/delete/feestype/:id', auth, restrictRoles([1, 5]), DeleteFeeType);

// CLASS FEE STRUCTURE Routes
router.post('/add/class-structure', auth, restrictRoles([1, 5]), CreateClassFeeStructure);
/**
 * GET /api/fees/class-structure?class_id=#
 */
router.get('/list/class-structure', auth, GetClassFeeStructure);
router.put('/update/class-structure/:id', auth, restrictRoles([1, 5]), UpdateClassFeeStructure);
router.delete('/delete/class-structure/:id', auth, restrictRoles([1, 5]), DeleteClassFeeStructure);


/** ----------------------
 * INVOICE GENERATION / MANAGEMENT Routes
 * ---------------------- */
// router.post('/add/generate-invoice', auth, CreateInvoice);
router.post('/add/generate-invoice', auth, restrictRoles([1, 5]), CreateBulkInvoices);
router.post('/add/invoices/:id/add-fine', auth, restrictRoles([1, 5]), AddInvoiceFine);
router.post('/add/invoices/:id/add-previous-dues', auth, restrictRoles([1, 5]), AddPreviousDues);
router.post('/add/invoices/:id/add-discount', auth, restrictRoles([1, 5]), AddInvoiceDiscount);
router.post('/invoices/fines/:fineId/reverse', auth, restrictRoles([1, 5]), ReverseInvoiceFine);
router.get('/list/invoices', auth, GetInvoices);
router.get('/export/due-invoices', auth, ExportDueInvoicesCSV);
router.get('/export/payments', auth, ExportPaymentHistoryCSV);
router.get('/get/invoices/:id', auth, GetInvoiceById);
router.get('/get/invoices/:id/pdf', auth, DownloadInvoicePDF);
router.get('/get/invoices/:id/combined-pdf', auth, DownloadCombinedPDF);
router.get('/get/fine_invoices/:id', auth, GetFinesByInvoiceId);
router.delete('/delete/invoices/:id', auth, restrictRoles([1, 5]), DeleteInvoice);
router.post('/delete/invoices-bulk', auth, restrictRoles([1, 5]), BulkDeleteInvoices);
router.post('/get/invoices-bulk/pdf', auth, DownloadBulkInvoicePDF);
router.put('/update/invoices/:id/disable-auto-generate', auth, restrictRoles([1, 5]), DisableAutoGenerate);
router.put('/update/invoices/:id/restore-status', auth, restrictRoles([1, 5]), RestoreInvoiceStatus);

/** ----------------------
 * PAYMENTS Routes
 * ---------------------- */
router.post('/add/invoices/:id/pay', auth, restrictRoles([1, 5]), AddPaymentToInvoice);
router.get('/list/payments', auth, GetPayments);
router.get('/list/payaments/student-summary/:student_id', auth, GetStudentFeeSummary);
router.get('/payments/:id/receipt', auth, DownloadPaymentReceiptPDF);
router.get('/student-fee-details', auth, GetStudentFeeFullDetails);

module.exports = router;