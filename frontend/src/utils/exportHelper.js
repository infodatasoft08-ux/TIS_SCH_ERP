import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

const sendToMobile = (base64, fileName, mimeType) => {
    window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'download',
        payload: { base64, fileName, mimeType }
    }));
};

/**
 * Export data to Excel
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the file
 * @param {String} sheetName - Name of the sheet
 */
export const exportToExcel = (data, fileName = 'export', sheetName = 'Data') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    // XLSX.writeFile(workbook, `${fileName}.xlsx`);

    if (isMobileApp) {
        const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        sendToMobile(base64, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
};

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {String} fileName - Name of the file
 */
export const exportToCSV = (data, fileName = 'export') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    // const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    // const link = document.createElement("a");
    // const url = URL.createObjectURL(blob);
    // link.setAttribute("href", url);
    // link.setAttribute("download", `${fileName}.csv`);
    // link.style.visibility = 'hidden';
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);

    if (isMobileApp) {
        const base64 = btoa(unescape(encodeURIComponent(csvOutput)));
        sendToMobile(base64, `${fileName}.csv`, 'text/csv');
    } else {
        const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Export data to PDF using jspdf-autotable
 * @param {Array} columns - Table columns { header, dataKey }
 * @param {Array} data - Array of objects
 * @param {String} title - PDF Title
 * @param {String} fileName - Name of the file
 */
export const exportToPDF = (columns, data, title = 'Data Export', fileName = 'export') => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    // Table
    const tableHeaders = columns.map(col => col.header);
    const tableBody = data.map(row => columns.map(col => row[col.dataKey] || ''));

    autoTable(doc, {
        head: [tableHeaders],
        body: tableBody,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] }, // Indigo color
        styles: { fontSize: 8 },
        margin: { top: 35 }
    });

    // doc.save(`${fileName}.pdf`);

    if (isMobileApp) {
        const dataUri = doc.output('datauristring');
        const base64 = dataUri.split(',')[1];
        sendToMobile(base64, `${fileName}.pdf`, 'application/pdf');
    } else {
        doc.save(`${fileName}.pdf`);
    }
};

/**
 * Download a blank Excel template for bulk uploads with optional data validation dropdowns
 * @param {Array} headers - Column headers for the template
 * @param {String} fileName - Name of the file
 * @param {Object} dropdowns - Object where keys are header names and values are arrays of options
 */
import ExcelJS from 'exceljs';

export const downloadTemplate = async (headers, fileName = 'template', dropdowns = {}, mandatoryHeaders = []) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Add headers
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEEEEEE' }
    };

    // Apply mandatory styling
    headers.forEach((header, index) => {
        if (mandatoryHeaders.includes(header)) {
            const cell = headerRow.getCell(index + 1);
            cell.font = { bold: true, color: { argb: 'FFFF0000' } }; // Red font for mandatory fields
            cell.note = 'This field is mandatory';
        }
    });

    // Add data validation (dropdowns and dates)
    headers.forEach((header, index) => {
        const colLetter = worksheet.getColumn(index + 1).letter;
        const options = dropdowns[header];

        // Dropdowns
        if (options && options.length > 0) {
            // Apply to next 1000 rows
            for (let i = 2; i <= 1001; i++) {
                worksheet.getCell(`${colLetter}${i}`).dataValidation = {
                    type: 'list',
                    allowBlank: true,
                    formulae: [`"${options.join(',')}"`],
                    showErrorMessage: true,
                    errorTitle: 'Invalid Selection',
                    error: 'Please select a value from the dropdown list.'
                };
            }
        }

        // Date Validation
        if (header.toLowerCase().includes('date') || header.toLowerCase().includes('_at')) {
            const column = worksheet.getColumn(index + 1);
            column.numFmt = 'yyyy-mm-dd';

            for (let i = 2; i <= 1001; i++) {
                worksheet.getCell(`${colLetter}${i}`).dataValidation = {
                    type: 'date',
                    operator: 'between',
                    allowBlank: true,
                    showErrorMessage: true,
                    errorTitle: 'Invalid Date',
                    error: 'Please enter a valid date in YYYY-MM-DD format (e.g., 2024-03-20)',
                    formulae: [new Date(1900, 0, 1), new Date(2100, 11, 31)]
                };
            }
        }
    });

    // Adjust column widths
    worksheet.columns.forEach(column => {
        column.width = 20;
    });

    // Write to buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    // const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    // const link = document.createElement('a');
    // link.href = URL.createObjectURL(blob);
    // link.download = `${fileName}.xlsx`;
    // link.click();
    // URL.revokeObjectURL(link.href);

    if (isMobileApp) {
        // Convert ArrayBuffer to Base64
        const uint8Array = new Uint8Array(buffer);
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        sendToMobile(base64, `${fileName}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.xlsx`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

