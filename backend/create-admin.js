// backend/create-admin.js
require('dotenv').config();
const db = require('./db'); // uses backend/db.js which exports a mysql2/promise pool
const bcrypt = require('bcryptjs');

async function createAdmin() {
  try {
    const email = 'admin@school.com';
    const rawPassword = 'Admin@123';
    const name = 'SchoolAdmin';

    // check existing
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) {
      console.log(`Admin already exists with email ${email} (id=${rows[0].id})`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(rawPassword, 10);
    const [result] = await db.execute('INSERT INTO users (name,email,password_hash,role_id) VALUES (?,?,?,?)', [name, email, hash, 3]);

    console.log(`Admin created (id=${result.insertId}, email=${email})`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
