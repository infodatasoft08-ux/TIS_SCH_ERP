const db = require('../db');
const exportQueue = require('../queues/exportQueue');
const exportService = require('../services/exportService');
const { processExportJob } = require('../workers/exportWorker');
const fs = require('fs');
const path = require('path');

exports.startExport = async (req, res) => {
  try {
    const { format = 'xlsx' } = req.body;
    const user = req.user || { id: 1, name: 'School Admin' };
    const schoolName = await exportService.fetchSchoolInfo();

    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    const insertSql = `
      INSERT INTO export_logs (
        export_id, school_name, user_id, user_name, export_type, status, progress, current_step
      ) VALUES (?, ?, ?, ?, ?, 'pending', 0, 'Export job queued...')
    `;
    await db.query(insertSql, [
      exportId,
      schoolName,
      user.id,
      user.name || 'Admin',
      format === 'csv_zip' || format === 'raw_zip' || format === 'zip' ? 'zip' : 'xlsx'
    ]);

    let queuedWithBullMQ = false;
    if (exportQueue) {
      try {
        await exportQueue.add('processExport', {
          exportId,
          user,
          format,
          schoolName
        });
        queuedWithBullMQ = true;
      } catch (qErr) {
        console.warn('BullMQ push failed, falling back to background processing:', qErr.message);
      }
    }

    if (!queuedWithBullMQ) {
      setImmediate(async () => {
        try {
          await processExportJob({ exportId, user, format, schoolName });
        } catch (jobErr) {
          console.error(`Fallback background export job ${exportId} failed:`, jobErr);
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Complete ERP Data Export job initiated successfully.',
      exportId,
      status: 'pending',
      progress: 0,
      format
    });
  } catch (err) {
    console.error('Error initiating data export:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate data export.',
      error: err.message
    });
  }
};

exports.getExportStatus = async (req, res) => {
  try {
    const { exportId } = req.params;
    const [rows] = await db.query(
      `SELECT export_id, status, progress, current_step, record_counts, file_name, file_size, error_message, created_at, completed_at 
       FROM export_logs WHERE export_id = ?`,
      [exportId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Export log record not found.'
      });
    }

    const record = rows[0];
    return res.status(200).json({
      success: true,
      export: record
    });
  } catch (err) {
    console.error('Error fetching export status:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve export status.',
      error: err.message
    });
  }
};

exports.getExportHistory = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, export_id, user_name, export_type, status, progress, current_step, file_name, file_size, created_at, completed_at 
       FROM export_logs ORDER BY id DESC LIMIT 20`
    );

    return res.status(200).json({
      success: true,
      history: rows
    });
  } catch (err) {
    console.error('Error fetching export history:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch export history logs.',
      error: err.message
    });
  }
};

exports.downloadExportFile = async (req, res) => {
  try {
    const { exportId } = req.params;
    const [rows] = await db.query(
      `SELECT file_path, file_name, status FROM export_logs WHERE export_id = ?`,
      [exportId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Export record not found.' });
    }

    const { file_path, file_name, status } = rows[0];

    if (status !== 'completed' || !file_path) {
      return res.status(400).json({
        success: false,
        message: 'Export file is not ready or failed to generate.'
      });
    }

    if (!fs.existsSync(file_path)) {
      return res.status(404).json({
        success: false,
        message: 'Export file missing from server storage.'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    if (file_name.endsWith('.xlsx')) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (file_name.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
    }

    const fileStream = fs.createReadStream(file_path);
    return fileStream.pipe(res);
  } catch (err) {
    console.error('Error downloading export file:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to download export file.',
      error: err.message
    });
  }
};
