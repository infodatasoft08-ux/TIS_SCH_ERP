const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine safe connection limit per PM2 process (default 15 per worker, total pool across 4 workers = 60 connections)
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
const queueLimit = parseInt(process.env.DB_QUEUE_LIMIT || '100', 10);

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: connectionLimit,
  queueLimit: queueLimit,
  connectTimeout: 10000,      // 10s connection timeout
  idleTimeout: 60000,         // Release idle connections after 60s
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

(async () => {
  try {
    const conn = await db.getConnection();
    console.log(`✅ MySQL connected (Process ${process.pid}, instance pool limit: ${connectionLimit})`);
    conn.release();
  } catch (err) {
    console.error(`❌ MySQL connection failed (Process ${process.pid}):`, err.message);
  }
})();

module.exports = db;