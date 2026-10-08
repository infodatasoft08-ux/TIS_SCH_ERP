const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine safe connection limit per PM2 process (default 15 per worker, total pool across 4 workers = 60 connections)
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10);
const queueLimit = parseInt(process.env.DB_QUEUE_LIMIT || '100', 10);

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

(async () => {
  console.log(`🔍 [DB TARGET] Host: "${process.env.DB_HOST || '127.0.0.1'}", Port: ${process.env.DB_PORT || 3306}, User: "${process.env.DB_USER}", DB: "${process.env.DB_NAME}"`);
  try {
    const conn = await db.getConnection();
    console.log(`✅ MySQL connected (Process ${process.pid}, instance pool limit: ${connectionLimit})`);
    conn.release();
  } catch (err) {
    console.error(`❌ MySQL connection failed (Process ${process.pid}) to "${process.env.DB_HOST || '127.0.0.1'}":`, err.message);
  }
})();

module.exports = db;