// backend/create-admin.js
require('dotenv').config();
const db = require('./db'); // uses backend/db.js which exports a mysql2/promise pool
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  try {
    const email = 'superadmin@school.com';
    const rawPassword = 'SuperAdmin@123';
    const name = 'Super Admin';

    // check existing
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) {
      console.log(`SuperAdmin already exists with email ${email} (id=${rows[0].id})`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(rawPassword, 10);
    const [result] = await db.execute('INSERT INTO users (name,email,password_hash,role_id) VALUES (?,?,?,?)', [name, email, hash, 6]);

    console.log(`SuperAdmin created (id=${result.insertId}, email=${email})`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating SuperAdmin:', err);
    process.exit(1);
  }
}

createSuperAdmin();
