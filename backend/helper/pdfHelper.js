const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Register Handlebars helper for simple math
handlebars.registerHelper('add', (a, b) => {
    return parseInt(a) + parseInt(b);
});

// ✅ REGISTER HERE (IMPORTANT)
handlebars.registerHelper('isPreviousFine', function (str) {
    if (!str) return false;
    return str.toUpperCase().includes('PREVIOUS');
});

// Helper to convert numbers to words
function toWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return; var str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : '';
    return str.trim() === '' ? 'Zero Only' : str.trim();
}

/**
 * Base function to generate PDF from HTML template
 */
async function generatePDFFromTemplate(templateName, data, options = {}) {
    const templatePath = path.join(__dirname, `../templates/${templateName}.hbs`);
    const templateHtml = fs.readFileSync(templatePath, 'utf8');

    // Convert logo to base64 for embedding
    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/school_invoice_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) {
        console.error("Logo conversion error:", e);
    }

    const template = handlebars.compile(templateHtml);
    // Add watermark control to default data
    const html = template({ ...data, logoData, showWatermark: true });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

    const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        width: options.width || '210mm',
        height: options.height || '297mm',
        printBackground: true,
        margin: options.margin || {
            top: '10px',
            right: '10px',
            bottom: '10px',
            left: '10px'
        }
    });

    await browser.close();
    return pdfBuffer;
}

const generateInvoicePDF = async (invoice) => {
    const date = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

    // Prepare row items
    const rowItems = [
        ...(invoice.lines || []).map(l => ({ name: l.fee_name, amount: parseFloat(l.amount).toFixed(1) })),
        ...(invoice.fines || []).map(f => ({ name: f.fine_type.startsWith('previous_') ? (f.description || f.fine_type) : `Fine: ${f.description || f.fine_type}`, amount: parseFloat(f.amount).toFixed(1) }))
    ];

    // ✅ ADD DISCOUNT ROW
    const discount = parseFloat(invoice.discount_amount || 0);
    if (discount > 0) {
        rowItems.push({
            name: `Discount`,
            amount: -discount // negative value
        });
    }

    // const amount = (parseFloat(invoice.amount_due) || 0) - (parseFloat(invoice.discount_amount) || 0);
    const amount = (parseFloat(invoice.amount_due) || 0);

    const subtotal = rowItems.reduce((acc, item) => acc + parseFloat(item.amount), 0).toFixed(1);
    // const subtotal = rowItems.reduce((acc, item) => acc + item.amount, 0);
    const amountInWords = toWords(Math.round(amount));

    const data = {
        invoice: {
            ...invoice,
            date,
            subtotal,
            amount_in_words: amountInWords,
            amount_due: (parseFloat(invoice.amount_due)).toFixed(1),
            discount_amount: invoice.discount_amount ? parseFloat(invoice.discount_amount).toFixed(1) : null
        },
        rowItems
    };

    return await generatePDFFromTemplate('niyati_invoice', data, {
        format: 'A6',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
};

const generatePaymentReceiptPDF = async (payment) => {
    const date = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const fineAmount = parseFloat(payment.fine_amount || 0);
    const amountInWords = toWords(Math.round(payment.paid_amount));

    let bal = parseFloat(payment.amount_due) - parseFloat(payment.amount_paid);
    if (bal < 0) bal = 0;

    const data = {
        payment: {
            ...payment,
            date,
            amount_in_words: amountInWords,
            fines_amount: fineAmount,
            total_amount: (parseFloat(payment.amount_due) + parseFloat(payment.discount_amount)).toFixed(2),
            paid_amount: parseFloat(payment.paid_amount).toFixed(2),
            balance: bal.toFixed(2),
            hasOutstanding: bal > 0
        }
    };

    return await generatePDFFromTemplate('niyati_receipt', data, {
        format: 'A6',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
};

const generateAdmissionFormPDF = async (student) => {
    // Format dates for display
    const formattedStudent = {
        ...student,
        admission_date: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-GB') : 'N/A',
        date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : 'N/A'
    };

    return await generatePDFFromTemplate('studentAdmissionForm', { student: formattedStudent }, {
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
};

const generateCombinedInvoiceReceiptPDF = async (invoice, payment) => {
    // For combined, we'll process both templates and wrap them
    const invoiceDate = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const invoiceRowItems = [
        ...(invoice.lines || []).map(l => ({ name: l.fee_name, amount: parseFloat(l.amount).toFixed(2) })),
        ...(invoice.fines || []).map(f => ({ name: f.fine_type.startsWith('previous_') ? (f.description || f.fine_type) : `Fine: ${f.description || f.fine_type}`, amount: parseFloat(f.amount).toFixed(2) }))
    ];

    const discount = parseFloat(invoice.discount_amount || 0);
    if (discount > 0) {
        invoiceRowItems.push({
            name: `Discount`,
            amount: -discount
        });
    }

    // const amount = (parseFloat(invoice.amount_due) || 0) + (parseFloat(invoice.discount_amount) || 0);
    const amount = (parseFloat(invoice.amount_due) || 0);

    const invoiceSubtotal = invoiceRowItems.reduce((acc, item) => acc + parseFloat(item.amount), 0).toFixed(2);
    const invoiceAmountInWords = toWords(Math.round(amount));

    const receiptDate = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const receiptAmountInWords = toWords(Math.round(payment.paid_amount));
    let bal = parseFloat(payment.amount_due) - parseFloat(payment.amount_paid);
    if (bal < 0) bal = 0;

    // Load templates
    const invoiceTemplatePath = path.join(__dirname, '../templates/niyati_invoice.hbs');
    const receiptTemplatePath = path.join(__dirname, '../templates/niyati_receipt.hbs');

    const invoiceTemplateSource = fs.readFileSync(invoiceTemplatePath, 'utf8');
    const receiptTemplateSource = fs.readFileSync(receiptTemplatePath, 'utf8');

    // Define a wrapper template
    const combinedTemplateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .page-break { page-break-after: always; }
                body { margin: 0; padding: 0; }
            </style>
        </head>
        <body>
            <div class="page-invoice">
                {{{invoiceHtml}}}
            </div>
            <div class="page-break"></div>
            <div class="page-receipt">
                {{{receiptHtml}}}
            </div>
        </body>
        </html>
    `;

    // Process sub-templates
    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/school_invoice_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) { }

    const invoiceCompiled = handlebars.compile(invoiceTemplateSource);
    const invoiceHtml = invoiceCompiled({
        invoice: {
            ...invoice,
            date: invoiceDate,
            subtotal: invoiceSubtotal,
            amount_in_words: invoiceAmountInWords,
            // amount_due: (parseFloat(invoice.amount_due) + parseFloat(invoice.discount_amount)).toFixed(2),
            amount_due: (parseFloat(invoice.amount_due)).toFixed(2),
            discount_amount: invoice.discount_amount ? parseFloat(invoice.discount_amount).toFixed(2) : null
        },
        rowItems: invoiceRowItems,
        logoData
    });

    const receiptCompiled = handlebars.compile(receiptTemplateSource);
    const receiptHtml = receiptCompiled({
        payment: {
            ...payment,
            date: receiptDate,
            amount_in_words: receiptAmountInWords,
            total_amount: (parseFloat(payment.amount_due) + parseFloat(payment.discount_amount)).toFixed(2),
            paid_amount: parseFloat(payment.paid_amount).toFixed(2),
            balance: bal.toFixed(2),
            hasOutstanding: bal > 0
        },
        logoData
    });

    const combinedTemplate = handlebars.compile(combinedTemplateHtml);
    const finalHtml = combinedTemplate({ invoiceHtml, receiptHtml });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(finalHtml, { waitUntil: 'load', timeout: 60000 });

    const pdfBuffer = await page.pdf({
        format: 'A6',
        printBackground: true,
        margin: {
            top: '0px',
            right: '0px',
            bottom: '0px',
            left: '0px'
        }
    });

    await browser.close();
    return pdfBuffer;
};

const generateTeacherDetailsPDF = async (teacherData) => {
    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/school_invoice_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) { }

    const data = {
        teacher: teacherData.teacher,
        subjects: teacherData.subjects || [],
        generation_date: new Date().toLocaleDateString('en-GB'),
        logoData
    };

    return await generatePDFFromTemplate('teacherDetails', data, {
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
};

const generateBulkInvoicesPDF = async (invoices) => {
    // Convert logo to base64 for embedding
    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/school_invoice_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) { }

    const invoiceTemplatePath = path.join(__dirname, '../templates/niyati_invoice.hbs');
    const invoiceTemplateSource = fs.readFileSync(invoiceTemplatePath, 'utf8');
    const invoiceCompiled = handlebars.compile(invoiceTemplateSource);

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    const invoiceHtmls = invoices.map(invoice => {
        const date = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        const rowItems = [
            ...(invoice.lines || []).map(l => ({ name: l.fee_name, amount: parseFloat(l.amount).toFixed(2) })),
            ...(invoice.fines || []).map(f => ({
                name: f.fine_type.startsWith('previous_') ? (f.description || f.fine_type) : `Fine: ${f.description || f.fine_type}`,
                amount: parseFloat(f.amount).toFixed(2)
            }))
        ];

        const discount = parseFloat(invoice.discount_amount || 0);
        if (discount > 0) {
            rowItems.push({
                name: `Discount`,
                amount: -discount
            });
        }

        const amount = parseFloat(invoice.amount_due) || 0;
        const subtotal = rowItems.reduce((acc, item) => acc + parseFloat(item.amount), 0).toFixed(2);
        const amountInWords = toWords(Math.round(amount));
        const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);

        return invoiceCompiled({
            invoice: {
                ...invoice,
                date,
                subtotal,
                amount_in_words: amountInWords,
                amount_due: amount.toFixed(2),
                discount_amount: invoice.discount_amount ? parseFloat(invoice.discount_amount).toFixed(2) : null,
                period: startMonth
            },
            rowItems,
            logoData
        });
    });

    const combinedTemplateHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .page-break { page-break-after: always; }
                body { margin: 0; padding: 0; }
                .invoice-container { margin-bottom: 20px; }
            </style>
        </head>
        <body>
            ${invoiceHtmls.map((html, index) => `
                <div class="invoice-container">
                    ${html}
                </div>
                ${index < invoiceHtmls.length - 1 ? '<div class="page-break"></div>' : ''}
            `).join('')}
        </body>
        </html>
    `;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(combinedTemplateHtml, { waitUntil: 'load', timeout: 60000 });

    const pdfBuffer = await page.pdf({
        format: 'A6',
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();
    return pdfBuffer;
};

const generateAdmitCardPDF = async (admitCardData) => {
    // Format dates in routine
    const formattedRoutine = (admitCardData.routine || []).map(r => ({
        ...r,
        exam_date: r.exam_date ? new Date(r.exam_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD',
        time: r.start_time && r.end_time ? `${r.start_time.substring(0, 5)} - ${r.end_time.substring(0, 5)}` : 'TBD'
    }));

    const admitCardCode = `AC-${admitCardData.student.roll_no || admitCardData.student.id}-${admitCardData.exam_id}-${Date.now().toString().slice(-4)}`;

    return await generatePDFFromTemplate('admitCard', {
        student: admitCardData.student,
        exam_name: admitCardData.exam_name,
        routine: formattedRoutine,
        admitCardCode
    }, {
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });
};

module.exports = {
    generateInvoicePDF,
    generatePaymentReceiptPDF,
    generateCombinedInvoiceReceiptPDF,
    generateAdmissionFormPDF,
    generateTeacherDetailsPDF,
    generateBulkInvoicesPDF,
    generateAdmitCardPDF
};