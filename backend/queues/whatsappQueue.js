const { Queue } = require('bullmq');
const connection = require('../config/redis');

/**
 * Define the WhatsApp Queue instance
 */
const whatsappQueue = new Queue('whatsappQueue', {
    connection,
    defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
            type: 'exponential', // Exponential backoff for retries
            delay: 5000, // Starting delay is 5 seconds
        },
        removeOnComplete: true, // Automatically remove completed jobs to save memory
        removeOnFail: false, // Keep failed jobs for debugging and manual retries
    },
});

module.exports = whatsappQueue;
