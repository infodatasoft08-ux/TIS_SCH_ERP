const { Worker } = require('bullmq');
const connection = require('../config/redis');
const exportService = require('../services/exportService');

async function processExportJob(jobData) {
  const { exportId, user, format, schoolName } = jobData;
  console.log(`🚀 Starting export job ${exportId} (Format: ${format}) for User ${user ? user.name : 'Admin'}...`);

  if (format === 'zip' || format === 'raw_zip') {
    return await exportService.generateZipExport(
      exportId,
      user || { id: 1, name: 'Admin' },
      schoolName || 'Times International School',
      format === 'raw_zip'
    );
  } else {
    return await exportService.generateExcelExport(
      exportId,
      user || { id: 1, name: 'Admin' },
      schoolName || 'Times International School'
    );
  }
}

let worker = null;
try {
  worker = new Worker(
    'exportQueue',
    async (job) => {
      return await processExportJob(job.data);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Export job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Export job ${job.id} failed:`, err.message);
  });

  console.log('✅ BullMQ exportWorker started for Times International School');
} catch (err) {
  console.warn('⚠️ BullMQ exportWorker initialization skipped:', err.message);
}

module.exports = {
  processExportJob,
  worker
};
