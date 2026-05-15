const Redis = require('ioredis');
require('dotenv').config();

/**
 * Redis connection configuration
 * Uses environment variables REDIS_HOST and REDIS_PORT, defaulting to localhost:6379
 */
const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    // maxRetriesPerRequest must be null for BullMQ
    maxRetriesPerRequest: null,
};

const connection = new Redis(redisOptions);

connection.on('connect', () => {
    console.log('✅ Connected to Redis successfully');
});

connection.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
});

module.exports = connection;