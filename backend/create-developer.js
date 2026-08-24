// backend/create-developer.js
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

async function createDeveloper() {
  try {
    const roleName = 'developer';
    const username = 'mayankdeveloperadmin';
    const email = 'mayankdev@school.com';
    const rawPassword = 'mayankAdmin@123';
    const name = 'mayankdeveloperadmin';

    // 1. Check or insert developer role
    let [roleRows] = await db.execute('SELECT id FROM roles WHERE LOWER(role_name) = ?', [roleName.toLowerCase()]);
    let roleId;

    if (roleRows.length > 0) {
      roleId = roleRows[0].id;
      console.log(`✅ Role "${roleName}" already exists with id=${roleId}`);
    } else {
      const [roleResult] = await db.execute('INSERT INTO roles (role_name, sub_role) VALUES (?, NULL)', [roleName]);
      roleId = roleResult.insertId;
      console.log(`✅ Role "${roleName}" created with id=${roleId}`);
    }

    // 2. Assign all existing menus to developer role
    const [menus] = await db.execute('SELECT id FROM menus');
    if (menus.length > 0) {
      for (const m of menus) {
        await db.execute('INSERT IGNORE INTO role_menus (role_id, menu_id) VALUES (?, ?)', [roleId, m.id]);
      }
      console.log(`✅ Assigned ${menus.length} menus to role_id=${roleId}`);
    }

    // 3. Check or create developer user first
    const [userRows] = await db.execute('SELECT id, Email FROM users WHERE role_id = ? OR name = ? OR Email = ?', [roleId, username, email]);
    const hash = await bcrypt.hash(rawPassword, 10);

    if (userRows.length > 0) {
      const existingUser = userRows[0];
      await db.execute('UPDATE users SET name = ?, Email = ?, password_hash = ?, role_id = ?, is_active = 1 WHERE id = ?', [name, email, hash, roleId, existingUser.id]);
      console.log(`✅ Updated developer user (id=${existingUser.id}, email=${email}, username=${username}) with developer role (id=${roleId}).`);
    } else {
      const [userResult] = await db.execute(
        'INSERT INTO users (name, Email, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)',
        [name, email, hash, roleId]
      );
      console.log(`✅ Developer user created (id=${userResult.insertId}, email=${email}, username=${username}, role_id=${roleId})`);
    }

    // 4. Restore student user email if modified previously
    const [studentRestore] = await db.execute("UPDATE users SET Email = 'mayankmehar4@gmail.com' WHERE Email LIKE 'mayankmehar4_student_%'");
    if (studentRestore.affectedRows > 0) {
      console.log(`✅ Restored original student email "mayankmehar4@gmail.com"`);
    }

    console.log('\n--- DEVELOPER CREDENTIALS ---');
    console.log(`Email           : ${email}`);
    console.log(`Username        : ${username}`);
    console.log(`Password        : ${rawPassword}`);
    console.log(`Role            : ${roleName} (role_id=${roleId})`);
    console.log('-----------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating developer user/role:', err);
    process.exit(1);
  }
}

createDeveloper();
