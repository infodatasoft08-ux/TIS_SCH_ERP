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

const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    try {
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] || '00';
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes}${ampm}`;
    } catch (e) {
        return timeStr;
    }
};

/**
 * Base function to generate PDF from HTML template
 */
async function generatePDFFromTemplate(templateName, data, options = {}, existingBrowser = null) {
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

    const browser = existingBrowser || await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    let page;
    try {
        page = await browser.newPage();
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

        return pdfBuffer;
    } finally {
        if (page) {
            await page.close().catch(() => {});
        }
        if (!existingBrowser) {
            await browser.close().catch(() => {});
        }
    }
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

    return await generatePDFFromTemplate('times_international_invoice', data, {
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

    return await generatePDFFromTemplate('times_international_receipt', data, {
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
    const invoiceTemplatePath = path.join(__dirname, '../templates/times_international_invoice.hbs');
    const receiptTemplatePath = path.join(__dirname, '../templates/times_international_receipt.hbs');

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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    let page;
    try {
        page = await browser.newPage();
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

        return pdfBuffer;
    } finally {
        if (page) await page.close().catch(() => {});
        await browser.close().catch(() => {});
    }
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

    const invoiceTemplatePath = path.join(__dirname, '../templates/times_international_invoice.hbs');
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    let page;
    try {
        page = await browser.newPage();
        await page.setContent(combinedTemplateHtml, { waitUntil: 'load', timeout: 60000 });

        const pdfBuffer = await page.pdf({
            format: 'A6',
            printBackground: true,
            margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
        });

        return pdfBuffer;
    } finally {
        if (page) await page.close().catch(() => {});
        await browser.close().catch(() => {});
    }
};



const generateAdmitCardPDF = async (admitCardData, existingBrowser = null) => {
    let school = {};
    try {
        const schoolPath = path.join(__dirname, '../school-info.json');
        if (fs.existsSync(schoolPath)) {
            school = JSON.parse(fs.readFileSync(schoolPath, 'utf8'));
        }
    } catch (e) { }

    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/Times_Internation_School_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) { }

    const noWrapDots = (str) => {
        if (!str) return '';
        // Remove spaces before dots first, in case user typed "S .S.P.D"
        const cleanStr = str.replace(/\s+\./g, '.');
        return cleanStr.split(' ').map(word => {
            if (word.includes('.')) {
                return `<span style="white-space: nowrap;">${word}</span>`;
            }
            return word;
        }).join(' ');
    };

    const rawRoutine = admitCardData.routine || [];

    const isOralCategory = (catStr, item) => {
        if (!catStr) return Boolean(item.has_oral && !item.has_written);
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());
        return cats.includes('oral') || cats.includes('reading') || cats.includes('writing') || cats.includes('dictation') || cats.includes('recitation');
    };

    const isWrittenCategory = (catStr, item) => {
        if (!catStr) return !isOralCategory(catStr, item);
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());
        return cats.includes('written') || (!cats.includes('oral') && !cats.includes('reading') && !cats.includes('writing') && !cats.includes('dictation') && !cats.includes('recitation'));
    };

    const oralItems = rawRoutine.filter(r => isOralCategory(r.exam_category, r));
    const writtenItems = rawRoutine.filter(r => isWrittenCategory(r.exam_category, r));

    // Group Oral by Date
    const oralGrouped = {};
    oralItems.forEach(item => {
        const dateKey = item.exam_date ? new Date(item.exam_date).toISOString().split('T')[0] : 'TBD';
        if (!oralGrouped[dateKey]) {
            const d = item.exam_date ? new Date(item.exam_date) : null;
            oralGrouped[dateKey] = {
                date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                subjectsList: []
            };
        }

        let subDesc = item.subject_name;
        const catStr = item.exam_category || '';
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());

        const comps = [];
        if (cats.includes('reading') || item.has_reading) comps.push('Reading');
        if (cats.includes('writing') || item.has_writing_comp) comps.push('Writing');
        if (cats.includes('dictation') || item.has_dictation) comps.push('Dictation');
        if (cats.includes('recitation') || item.has_recitation) comps.push('Recitation');
        if (comps.length > 0) {
            subDesc += ` (${comps.join(' + ')})`;
        }
        oralGrouped[dateKey].subjectsList.push(subDesc);
    });

    const oralRoutine = Object.values(oralGrouped).map(g => ({
        date: g.date,
        day: g.day,
        subjects: noWrapDots(g.subjectsList.join(' + '))
    }));


    // Check if any subject explicitly uses sittings
    const hasSittings = writtenItems.some(item => item.sitting === '1st Sitting' || item.sitting === '2nd Sitting');

    let writtenRoutine = [];
    let firstSittingTiming = '08:30am to 10:30am';
    let secondSittingTiming = '11:00am to 01:00pm';

    if (hasSittings) {
        const writtenGrouped = {};
        writtenItems.forEach(item => {
            const dateKey = item.exam_date ? new Date(item.exam_date).toISOString().split('T')[0] : 'TBD';
            if (!writtenGrouped[dateKey]) {
                const d = item.exam_date ? new Date(item.exam_date) : null;
                writtenGrouped[dateKey] = {
                    date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                    day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                    sitting1: '---------',
                    sitting1CustomTime: '',
                    sitting2: '---------',
                    sitting2CustomTime: ''
                };
            }

            const isSitting1 = item.sitting === '1st Sitting' || (!item.sitting && writtenGrouped[dateKey].sitting1 === '---------');

            if (item.sitting === '1st Sitting' || (isSitting1 && writtenGrouped[dateKey].sitting1 === '---------')) {
                writtenGrouped[dateKey].sitting1 = item.subject_name;
                if (item.start_time && item.end_time) {
                    const formattedTime = `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}`;
                    writtenGrouped[dateKey].sitting1CustomTime = formattedTime;
                    firstSittingTiming = formattedTime;
                }
            } else {
                writtenGrouped[dateKey].sitting2 = item.subject_name;
                if (item.start_time && item.end_time) {
                    const formattedTime = `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}`;
                    writtenGrouped[dateKey].sitting2CustomTime = formattedTime;
                    secondSittingTiming = formattedTime;
                }
            }
        });
        writtenRoutine = Object.values(writtenGrouped).map(g => ({
            ...g,
            sitting1: g.sitting1 === '---------' ? g.sitting1 : noWrapDots(g.sitting1),
            sitting2: g.sitting2 === '---------' ? g.sitting2 : noWrapDots(g.sitting2)
        }));
    } else {
        writtenRoutine = writtenItems.map(item => {
            const d = item.exam_date ? new Date(item.exam_date) : null;
            return {
                date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                subject: noWrapDots(item.subject_name),
                time: item.start_time && item.end_time ? `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}` : 'TBD'
            };
        });
    }

    const admitCardCode = `AC-${admitCardData.student.roll_no || admitCardData.student.id}-${admitCardData.exam_id}-${Date.now().toString().slice(-4)}`;
    const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

    return await generatePDFFromTemplate('admitCard', {
        school,
        logoData,
        student: admitCardData.student,
        exam_name: admitCardData.exam_name,
        oralRoutine,
        hasOral: oralRoutine.length > 0,
        writtenRoutine,
        hasWritten: writtenRoutine.length > 0 || oralRoutine.length === 0,
        hasSittings,
        firstSittingTiming,
        secondSittingTiming,
        issueDate,
        admitCardCode
    }, {
        format: 'A4',
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    }, existingBrowser);
};

// const generateExamRoutinePDF = async (routineData) => {
//     // Convert logos
//     let logoData = null;
//     let cmcLogo = null;
//     try {
//         const logoPath = path.join(__dirname, '../assets/school_invoice_logo.png');
//         if (fs.existsSync(logoPath)) {
//             const logoBuffer = fs.readFileSync(logoPath);
//             logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
//         }

//         const cmcPath = path.join(__dirname, '../assets/Times_Internation_School_logo.png');
//         if (fs.existsSync(cmcPath)) {
//             const cmcBuffer = fs.readFileSync(cmcPath);
//             cmcLogo = `data:image/png;base64,${cmcBuffer.toString('base64')}`;
//         }
//     } catch (e) { console.error('Logo error:', e); }

//     const templatePath = path.join(__dirname, '../templates/examRoutine.hbs');
//     const templateSource = fs.readFileSync(templatePath, 'utf8');

//     // Register add helper if not exists (handled globally usually, but just in case)
//     if (!handlebars.helpers.add) {
//         handlebars.registerHelper('add', (a, b) => a + b);
//     }

//     const compiledTemplate = handlebars.compile(templateSource);

//     // Format dates in routine
//     const formattedRoutine = (routineData.routine || []).map(r => ({
//         ...r,
//         exam_date: r.exam_date ? new Date(r.exam_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD',
//         time: r.start_time && r.end_time ? `${formatTime12Hour(r.start_time)} - ${formatTime12Hour(r.end_time)}` : 'TBD'
//     }));

//     const html = compiledTemplate({
//         ...routineData,
//         routine: formattedRoutine,
//         logoData,
//         cmcLogo,
//         currentDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
//     });

//     const browser = await puppeteer.launch({
//         headless: 'new',
//         args: ['--no-sandbox', '--disable-setuid-sandbox']
//     });

//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: 'networkidle0' });

//     const pdfBuffer = await page.pdf({
//         format: 'A4',
//         printBackground: true,
//         margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
//     });

//     await browser.close();
//     return pdfBuffer;
// };

const generateExamRoutinePDF = async (examRoutineData) => {
    let school = {};
    try {
        const schoolPath = path.join(__dirname, '../school-info.json');
        if (fs.existsSync(schoolPath)) {
            school = JSON.parse(fs.readFileSync(schoolPath, 'utf8'));
        }
    } catch (e) { }

    let logoData = null;
    try {
        const logoPath = path.join(__dirname, '../assets/Times_Internation_School_logo.png');
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            logoData = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
    } catch (e) { }

    const noWrapDots = (str) => {
        if (!str) return '';
        const cleanStr = str.replace(/\s+\./g, '.');
        return cleanStr.split(' ').map(word => {
            if (word.includes('.')) {
                return `<span style="white-space: nowrap;">${word}</span>`;
            }
            return word;
        }).join(' ');
    };

    const rawRoutine = examRoutineData.routine || [];
    const examSession = examRoutineData.exam_session;
    const fromClassToClass = examRoutineData.classes;

    const isOralCategory = (catStr, item) => {
        if (!catStr) return Boolean(item.has_oral && !item.has_written);
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());
        return cats.includes('oral') || cats.includes('reading') || cats.includes('writing') || cats.includes('dictation') || cats.includes('recitation');
    };

    const isWrittenCategory = (catStr, item) => {
        if (!catStr) return !isOralCategory(catStr, item);
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());
        return cats.includes('written') || (!cats.includes('oral') && !cats.includes('reading') && !cats.includes('writing') && !cats.includes('dictation') && !cats.includes('recitation'));
    };

    const oralItems = rawRoutine.filter(r => isOralCategory(r.exam_category, r));
    const writtenItems = rawRoutine.filter(r => isWrittenCategory(r.exam_category, r));

    // Group Oral by Date
    const oralGrouped = {};
    oralItems.forEach(item => {
        const dateKey = item.exam_date ? new Date(item.exam_date).toISOString().split('T')[0] : 'TBD';
        if (!oralGrouped[dateKey]) {
            const d = item.exam_date ? new Date(item.exam_date) : null;
            oralGrouped[dateKey] = {
                date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                subjectsList: []
            };
        }

        let subDesc = item.subject_name;
        const catStr = item.exam_category || '';
        const cats = catStr.split(',').map(c => c.trim().toLowerCase());

        const comps = [];
        if (cats.includes('reading') || item.has_reading) comps.push('Reading');
        if (cats.includes('writing') || item.has_writing_comp) comps.push('Writing');
        if (cats.includes('dictation') || item.has_dictation) comps.push('Dictation');
        if (cats.includes('recitation') || item.has_recitation) comps.push('Recitation');
        if (comps.length > 0) {
            subDesc += ` (${comps.join(' + ')})`;
        }
        oralGrouped[dateKey].subjectsList.push(subDesc);
    });

    const oralRoutine = Object.values(oralGrouped).map(g => ({
        date: g.date,
        day: g.day,
        subjects: noWrapDots(g.subjectsList.join(' + '))
    }));


    // Check if any subject explicitly uses sittings
    const hasSittings = writtenItems.some(item => item.sitting === '1st Sitting' || item.sitting === '2nd Sitting');

    let writtenRoutine = [];
    let firstSittingTiming = '08:30am to 10:30am';
    let secondSittingTiming = '11:00am to 01:00pm';

    if (hasSittings) {
        const writtenGrouped = {};
        writtenItems.forEach(item => {
            const dateKey = item.exam_date ? new Date(item.exam_date).toISOString().split('T')[0] : 'TBD';
            if (!writtenGrouped[dateKey]) {
                const d = item.exam_date ? new Date(item.exam_date) : null;
                writtenGrouped[dateKey] = {
                    date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                    day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                    sitting1: '---------',
                    sitting1CustomTime: '',
                    sitting2: '---------',
                    sitting2CustomTime: ''
                };
            }

            const isSitting1 = item.sitting === '1st Sitting' || (!item.sitting && writtenGrouped[dateKey].sitting1 === '---------');

            if (item.sitting === '1st Sitting' || (isSitting1 && writtenGrouped[dateKey].sitting1 === '---------')) {
                writtenGrouped[dateKey].sitting1 = item.subject_name;
                if (item.start_time && item.end_time) {
                    const formattedTime = `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}`;
                    writtenGrouped[dateKey].sitting1CustomTime = formattedTime;
                    firstSittingTiming = formattedTime;
                }
            } else {
                writtenGrouped[dateKey].sitting2 = item.subject_name;
                if (item.start_time && item.end_time) {
                    const formattedTime = `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}`;
                    writtenGrouped[dateKey].sitting2CustomTime = formattedTime;
                    secondSittingTiming = formattedTime;
                }
            }
        });
        writtenRoutine = Object.values(writtenGrouped).map(g => ({
            ...g,
            sitting1: g.sitting1 === '---------' ? g.sitting1 : noWrapDots(g.sitting1),
            sitting2: g.sitting2 === '---------' ? g.sitting2 : noWrapDots(g.sitting2)
        }));
    } else {
        writtenRoutine = writtenItems.map(item => {
            const d = item.exam_date ? new Date(item.exam_date) : null;
            return {
                date: d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'TBD',
                day: d ? d.toLocaleDateString('en-US', { weekday: 'long' }) : '',
                subject: noWrapDots(item.subject_name),
                time: item.start_time && item.end_time ? `${formatTime12Hour(item.start_time)} to ${formatTime12Hour(item.end_time)}` : 'TBD'
            };
        });
    }

    const examRoutineCode = `ER-${examRoutineData.exam_id}-${Date.now().toString().slice(-4)}`;
    const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

    return await generatePDFFromTemplate('examRoutine', {
        school,
        logoData,
        // student: examRoutineData.student,
        exam_name: examRoutineData.exam_name,
        examSession,
        fromClassToClass,
        oralRoutine,
        hasOral: oralRoutine.length > 0,
        writtenRoutine,
        hasWritten: writtenRoutine.length > 0 || oralRoutine.length === 0,
        hasSittings,
        firstSittingTiming,
        secondSittingTiming,
        issueDate,
        examRoutineCode
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
    generateAdmitCardPDF,
    generateExamRoutinePDF
};