const { Worker } = require('bullmq');
const connection = require('../config/redis');
const whatsappService = require('../services/whatsappService');

console.log('🚀 Starting WhatsApp Queue Worker...');

/**
 * WhatsApp Worker instance
 * Handles rate limiting (max 50 messages per minute)
 */
const worker = new Worker(
    'whatsappQueue',
    async (job) => {
        const { contact, message, jobType } = job.data;

        console.log(`⏳ Processing job ${job.id} for contact ${contact} (Type: ${jobType || 'Standard'})`);

        try {
            const result = await whatsappService.sendWhatsAppTemplate(contact, message);
            console.log(`✅ Job ${job.id} completed successfully for ${contact}`);
            return result;
        } catch (error) {
            console.error(`❌ Job ${job.id} failed for ${contact}: ${error.message}`);
            throw error; // Throwing the error triggers the retry mechanism
        }
    },
    {
        connection,
        limiter: {
            max: 50, // 50 messages
            duration: 60000, // per 60 seconds (1 minute)
        },
    }
);

worker.on('completed', (job) => {
    // console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`⚠️ Job ${job.id} has failed after ${job.attemptsMade} attempts. Error: ${err.message}`);
});

worker.on('error', (err) => {
    // log worker-level errors (e.g. Redis disconnected)
    console.error('Worker Error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await worker.close();
    process.exit(0);
});

module.exports = worker;
