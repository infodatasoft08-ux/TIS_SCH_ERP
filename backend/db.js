const mysql = require('mysql2/promise');
require('dotenv').config();
const fs = require('fs')

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // ssl: {
  //   ca: fs.readFileSync(process.env.CA),
  // },
  waitForConnections: true,
  connectionLimit: 10,     // Max concurrent connections
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});



(async () => {
  try {
    const conn = await db.getConnection();
    console.log('✅ MySQL connected');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
  }
})();

module.exports = db;