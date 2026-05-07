const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createFeeType, GetFeeTypes, GetFeeTypeById, UpdateFeeType, CreateClassFeeStructure, GetClassFeeStructure, UpdateClassFeeStructure, DeleteClassFeeStructure, CreateInvoice, GetInvoices, GetInvoiceById, DownloadInvoicePDF, DownloadPaymentReceiptPDF, DeleteInvoice, AddPaymentToInvoice, GetPayments, GetStudentFeeSummary, CreateBulkInvoices, UpdateInvoiceWithFine, AddInvoiceFine, AddPreviousDues, AddInvoiceDiscount, ReverseInvoiceFine, GetFinesByInvoiceId, GetStudentFeeFullDetails, DownloadCombinedPDF, DeleteFeeType, DisableAutoGenerate, BulkDeleteInvoices, DownloadBulkInvoicePDF } = require('../controller/feeController');


// Fee Type Routes
router.post('/add/feestype', auth, createFeeType);
router.get('/list/feestype', auth, GetFeeTypes);
router.get('/get/feestype/:id', auth, GetFeeTypeById);
router.put('/update/feestype/:id', auth, UpdateFeeType);
router.delete('/delete/feestype/:id', auth, DeleteFeeType);

// CLASS FEE STRUCTURE Routes
router.post('/add/class-structure', auth, CreateClassFeeStructure);
/**
 * GET /api/fees/class-structure?class_id=#
 */
router.get('/list/class-structure', auth, GetClassFeeStructure);
router.put('/update/class-structure/:id', auth, UpdateClassFeeStructure);
router.delete('/delete/class-structure/:id', auth, DeleteClassFeeStructure);


/** ----------------------
 * INVOICE GENERATION / MANAGEMENT Routes
 * ---------------------- */
// router.post('/add/generate-invoice', auth, CreateInvoice);
router.post('/add/generate-invoice', auth, CreateBulkInvoices);
router.post('/add/invoices/:id/add-fine', auth, AddInvoiceFine);
router.post('/add/invoices/:id/add-previous-dues', auth, AddPreviousDues);
router.post('/add/invoices/:id/add-discount', auth, AddInvoiceDiscount);
router.post('/invoices/fines/:fineId/reverse', auth, ReverseInvoiceFine);
router.get('/list/invoices', auth, GetInvoices);
router.get('/get/invoices/:id', auth, GetInvoiceById);
router.get('/get/invoices/:id/pdf', auth, DownloadInvoicePDF);
router.get('/get/invoices/:id/combined-pdf', auth, DownloadCombinedPDF);
router.get('/get/fine_invoices/:id', auth, GetFinesByInvoiceId);
router.delete('/delete/invoices/:id', auth, DeleteInvoice);
router.post('/delete/invoices-bulk', auth, BulkDeleteInvoices);
router.post('/get/invoices-bulk/pdf', auth, DownloadBulkInvoicePDF);
router.put('/update/invoices/:id/disable-auto-generate', auth, DisableAutoGenerate);

/** ----------------------
 * PAYMENTS Routes
 * ---------------------- */
router.post('/add/invoices/:id/pay', auth, AddPaymentToInvoice);
router.get('/list/payments', auth, GetPayments);
router.get('/list/payaments/student-summary/:student_id', auth, GetStudentFeeSummary);
router.get('/payments/:id/receipt', auth, DownloadPaymentReceiptPDF);
router.get('/student-fee-details', auth, GetStudentFeeFullDetails);

module.exports = router;