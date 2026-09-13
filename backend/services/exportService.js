const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const moment = require('moment');
const db = require('../db');
const exportMappings = require('./exportMappings');

const EXPORT_DIR = path.join(__dirname, '../uploads/exports');

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

async function updateLogStatus(exportId, status, progress, currentStep, extraData = {}) {
  try {
    const fields = ['status = ?', 'progress = ?', 'current_step = ?'];
    const values = [status, progress, currentStep];

    if (status === 'completed') {
      fields.push('completed_at = NOW()');
    }
    if (extraData.recordCounts) {
      fields.push('record_counts = ?');
      values.push(JSON.stringify(extraData.recordCounts));
    }
    if (extraData.filePath) {
      fields.push('file_path = ?');
      values.push(extraData.filePath);
    }
    if (extraData.fileName) {
      fields.push('file_name = ?');
      values.push(extraData.fileName);
    }
    if (extraData.fileSize) {
      fields.push('file_size = ?');
      values.push(extraData.fileSize);
    }
    if (extraData.errorMessage) {
      fields.push('error_message = ?');
      values.push(extraData.errorMessage);
    }

    values.push(exportId);
    const sql = `UPDATE export_logs SET ${fields.join(', ')} WHERE export_id = ?`;
    await db.query(sql, values);
  } catch (err) {
    console.error(`Failed to update export log status for ${exportId}:`, err);
  }
}

async function fetchSchoolInfo() {
  try {
    const [rows] = await db.query(
      `SELECT setting_value FROM school_settings WHERE setting_key IN ('school_name', 'name') LIMIT 1`
    );
    if (rows && rows.length > 0 && rows[0].setting_value) {
      return rows[0].setting_value;
    }
  } catch (e) {
    // Fallback
  }
  return 'Times International School';
}

async function fetchAllRowsInBatches(baseQuery, batchSize = 1000) {
  let allRows = [];
  let offset = 0;
  let hasMore = true;

  const cleanQuery = baseQuery.trim().replace(/;$/, '');

  while (hasMore) {
    const paginatedQuery = `${cleanQuery} LIMIT ${batchSize} OFFSET ${offset}`;
    const [batch] = await db.query(paginatedQuery);

    if (batch && batch.length > 0) {
      allRows = allRows.concat(batch);
      offset += batch.length;
      if (batch.length < batchSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allRows;
}

async function generateExcelExport(exportId, userObj, schoolName = 'Times International School') {
  try {
    await updateLogStatus(exportId, 'processing', 10, 'Initializing Excel Workbook...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = schoolName;
    workbook.lastModifiedBy = userObj.name || 'School Admin';
    workbook.created = new Date();

    const recordCounts = {};
    const totalMappings = exportMappings.length;

    const metaSheet = workbook.addWorksheet('Export Information', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    metaSheet.columns = [
      { header: 'Metadata Field', key: 'field', width: 28 },
      { header: 'Details / Summary', key: 'value', width: 50 }
    ];

    const metaRows = [
      { field: 'School Name', value: schoolName },
      { field: 'Export Type', value: 'Complete ERP Production Data Package (.xlsx)' },
      { field: 'Generated At', value: moment().format('YYYY-MM-DD HH:mm:ss') },
      { field: 'Initiated By User', value: `${userObj.name || 'Admin'} (ID: ${userObj.id})` },
      { field: 'Total Modules Exported', value: totalMappings },
      { field: 'Security Boundary', value: 'Multi-Tenant Scoped / Human-Readable Foreign Keys' },
      { field: 'ERP Version', value: 'v1.0.0 (Production Data Portability Engine)' }
    ];

    metaRows.forEach(r => metaSheet.addRow(r));

    const metaHeader = metaSheet.getRow(1);
    metaHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    metaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    metaSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(1).font = { bold: true };
        row.height = 20;
      }
    });

    for (let i = 0; i < totalMappings; i++) {
      const moduleConfig = exportMappings[i];
      const stepPercent = Math.round(15 + ((i + 1) / totalMappings) * 75);

      await updateLogStatus(
        exportId,
        'processing',
        stepPercent,
        `Exporting ${moduleConfig.sheetName}...`
      );

      const rows = await fetchAllRowsInBatches(moduleConfig.query);
      recordCounts[moduleConfig.sheetName] = rows.length;

      metaSheet.addRow({ field: moduleConfig.sheetName, value: rows.length });

      const safeSheetName = moduleConfig.sheetName.substring(0, 31);
      const sheet = workbook.addWorksheet(safeSheetName, {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      if (rows.length > 0) {
        const sampleRow = rows[0];
        const columns = Object.keys(sampleRow).map(key => ({
          header: key,
          key: key,
          width: 18
        }));

        sheet.columns = columns;

        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        headerRow.height = 26;

        rows.forEach(row => {
          const formattedRow = {};
          Object.keys(row).forEach(colKey => {
            let val = row[colKey];
            if (val === null || val === undefined) {
              val = '';
            } else if (val instanceof Date) {
              val = moment(val).format('YYYY-MM-DD HH:mm');
            }
            formattedRow[colKey] = val;
          });
          sheet.addRow(formattedRow);
        });

        sheet.columns.forEach(column => {
          let maxLen = column.header ? column.header.length : 12;
          column.eachCell({ includeEmpty: false }, cell => {
            const cellVal = cell.value ? cell.value.toString() : '';
            if (cellVal.length > maxLen) {
              maxLen = cellVal.length;
            }
          });
          column.width = Math.min(Math.max(maxLen + 3, 12), 55);
        });
      } else {
        sheet.columns = [{ header: 'Message', key: 'message', width: 35 }];
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
        sheet.addRow({ message: 'No records available in database for this module.' });
      }
    }

    await updateLogStatus(exportId, 'processing', 92, 'Finalizing Excel file output...');

    const timestampStr = moment().format('YYYY-MM-DD_HHmm');
    const nameStr = typeof schoolName === 'string' ? schoolName : 'Times International School';
    const sanitizedSchoolName = nameStr.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${sanitizedSchoolName}_Complete_Data_Export_${timestampStr}.xlsx`;
    const filePath = path.join(EXPORT_DIR, fileName);

    await workbook.xlsx.writeFile(filePath);
    const stats = fs.statSync(filePath);

    await updateLogStatus(exportId, 'completed', 100, 'Export completed successfully', {
      recordCounts,
      filePath,
      fileName,
      fileSize: stats.size
    });

    return { exportId, fileName, filePath, fileSize: stats.size, recordCounts };
  } catch (err) {
    console.error(`Error generating Excel export ${exportId}:`, err);
    await updateLogStatus(exportId, 'failed', 0, 'Export failed', {
      errorMessage: err.message
    });
    throw err;
  }
}

function convertToCSV(data) {
  if (!data || data.length === 0) {
    return 'No data available\n';
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (val instanceof Date) {
        val = moment(val).format('YYYY-MM-DD HH:mm');
      } else {
        val = String(val).replace(/"/g, '""');
      }
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n') + '\n';
}

async function generateZipExport(exportId, userObj, schoolName = 'Times International School', includeRaw = true) {
  return new Promise(async (resolve, reject) => {
    try {
      await updateLogStatus(exportId, 'processing', 10, 'Initializing CSV / ZIP Archive...');

      const timestampStr = moment().format('YYYY-MM-DD_HHmm');
      const nameStr = typeof schoolName === 'string' ? schoolName : 'Times International School';
      const sanitizedSchoolName = nameStr.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${sanitizedSchoolName}_Complete_Data_Export_${timestampStr}.zip`;
      const filePath = path.join(EXPORT_DIR, fileName);

      const output = fs.createWriteStream(filePath);
      const archive = typeof archiver === 'function' 
        ? archiver('zip', { zlib: { level: 9 } })
        : (archiver.create ? archiver.create('zip', { zlib: { level: 9 } }) : new archiver.ZipArchive({ zlib: { level: 9 } }));

      output.on('close', async () => {
        const stats = fs.statSync(filePath);
        await updateLogStatus(exportId, 'completed', 100, 'Export completed successfully', {
          recordCounts,
          filePath,
          fileName,
          fileSize: stats.size
        });
        resolve({ exportId, fileName, filePath, fileSize: stats.size, recordCounts });
      });

      archive.on('error', async err => {
        await updateLogStatus(exportId, 'failed', 0, 'Export failed during ZIP compression', {
          errorMessage: err.message
        });
        reject(err);
      });

      archive.pipe(output);

      const recordCounts = {};
      const totalMappings = exportMappings.length;

      for (let i = 0; i < totalMappings; i++) {
        const moduleConfig = exportMappings[i];
        const stepPercent = Math.round(15 + ((i + 1) / totalMappings) * 75);

        await updateLogStatus(
          exportId,
          'processing',
          stepPercent,
          `Generating CSV: ${moduleConfig.csvName}...`
        );

        const rows = await fetchAllRowsInBatches(moduleConfig.query);
        recordCounts[moduleConfig.sheetName] = rows.length;

        const csvContent = convertToCSV(rows);
        archive.append(csvContent, { name: `readable_csv/${moduleConfig.csvName}.csv` });

        if (includeRaw) {
          archive.append(JSON.stringify(rows, null, 2), { name: `raw_json/${moduleConfig.csvName}.json` });
        }
      }

      const metadataObj = {
        schoolName,
        exportType: 'Complete ERP Production Data Archive (.zip)',
        generatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
        initiatedBy: `${userObj.name || 'Admin'} (ID: ${userObj.id})`,
        erpVersion: 'v1.0.0 (Data Portability System)',
        recordCounts
      };

      archive.append(JSON.stringify(metadataObj, null, 2), { name: 'export_metadata.json' });

      await updateLogStatus(exportId, 'processing', 92, 'Finalizing ZIP Compression...');
      archive.finalize();
    } catch (err) {
      console.error(`Error generating ZIP export ${exportId}:`, err);
      await updateLogStatus(exportId, 'failed', 0, 'Export failed', { errorMessage: err.message });
      reject(err);
    }
  });
}

module.exports = {
  generateExcelExport,
  generateZipExport,
  updateLogStatus,
  fetchSchoolInfo
};
