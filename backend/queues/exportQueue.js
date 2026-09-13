const { Queue } = require('bullmq');
const connection = require('../config/redis');

let exportQueue = null;

try {
  exportQueue = new Queue('exportQueue', { connection });
  console.log('✅ BullMQ exportQueue initialized for Times International School');
} catch (err) {
  console.warn('⚠️ BullMQ exportQueue initialization skipped:', err.message);
}

module.exports = exportQueue;
