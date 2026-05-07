const db = require("../db");
const bcrypt = require('bcryptjs');
require('dotenv').config();
const SALT_ROUNDS = 10;
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));



const AddParents = async (req, res) => {
  const { name, email, password, role_id, relation, occupation } = req.body;

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !role_id) {
    return res.status(400).json({ error: 'name, email, password and role_id are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const fullName = `${name.trim()}`;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // 1) create user
    const [userRes] = await conn.execute(
      `INSERT INTO users (name, email, password_hash, role_id, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [fullName, email.trim(), password_hash, role_id]
    );
    const userId = userRes.insertId;

    // 2) create parent profile
    const [parentRes] = await conn.execute(
      `INSERT INTO parents (id, user_id, relation, occupation) VALUES (?, ?, ?, ?)`,
      [userId, userId, relation || null, occupation || null]
    );
    const parentId = parentRes.insertId;

    await conn.commit();
    conn.release();

    // fetch created parent with user info
    const [rows] = await db.execute(
      `SELECT p.id AS parent_id, p.user_id, p.relation, p.occupation, u.id AS user_id, u.name AS user_name, u.email AS user_email, u.role_id
       FROM parents p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [parentId]
    );

    return res.status(201).json({ parent: rows[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/parents error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const GetParents = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  const conn = await db.getConnection();

  try {
    const sql = `
      SELECT p.id AS parent_id, p.user_id, p.relation, p.occupation, u.name AS user_name, u.email AS user_email
       FROM parents p
       JOIN users u ON u.id = p.user_id
       WHERE u.name LIKE ? OR u.email LIKE ? OR p.occupation LIKE ?
       ORDER BY p.id DESC
       LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await conn.execute(sql, [q, q, q]);
    return res.json({ parents: rows, limit, offset});
  } catch (err) {
    console.error('GET /api/parents error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const GetParentWithChildrenById = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });

  try {
    const [prows] = await db.execute(
      `SELECT p.id AS parent_id, p.user_id, p.relation, p.occupation, u.name AS user_name, u.email AS user_email
       FROM parents p JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );
    if (prows.length === 0) return res.status(404).json({ error: 'Parent not found' });
    const parent = prows[0];

    // children (students)
    const [children] = await db.execute(
      `SELECT s.id AS student_id, s.user_id, u.name AS student_name, u.email AS student_email, s.class_id, s.grade_id
       FROM parent_children pc
       JOIN students s ON s.id = pc.student_id
       JOIN users u ON u.id = s.user_id
       WHERE pc.parent_id = ?`,
      [id]
    );

    parent.children = children;
    return res.json({ parent });
  } catch (err) {
    console.error('GET /api/parents/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

};


const UpdateParent = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });

  const { name, email, role_id, relation, occupation } = req.body;
  if (name === undefined && email === undefined && role_id === undefined && relation === undefined && occupation === undefined) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // lock parent row
    const [prows] = await conn.execute(`SELECT * FROM parents WHERE id = ? FOR UPDATE`, [id]);
    if (prows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Parent not found' }); }
    const parentRow = prows[0];
    const userId = parentRow.user_id;

    // update users table if needed
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) {
      const [uRows] = await conn.execute(`SELECT name FROM users WHERE id = ? FOR UPDATE`, [userId]);
      const currentName = uRows[0] ? uRows[0].name : '';
      let curName = '';
      if (currentName) {
        curName = currentName;
      }
      const newName = name !== undefined ? (name || '').trim() : curFirst;
      userUpdates.push('name = ?');
      userParams.push(`${newName}`.trim());
    }

    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email || null); }
    if (role_id !== undefined) { userUpdates.push('role_id = ?'); userParams.push(role_id || null); }

    if (userUpdates.length > 0) {
      userParams.push(userId);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // update parents table fields
    const pUpdates = [];
    const pParams = [];
    if (relation !== undefined) { pUpdates.push('relation = ?'); pParams.push(relation || null); }
    if (occupation !== undefined) { pUpdates.push('occupation = ?'); pParams.push(occupation || null); }

    if (pUpdates.length > 0) {
      pParams.push(id);
      await conn.execute(`UPDATE parents SET ${pUpdates.join(', ')} WHERE id = ?`, pParams);
    }

    await conn.commit();
    conn.release();

    // return updated parent
    const [updated] = await db.execute(
      `SELECT p.id AS parent_id, p.user_id, p.relation, p.occupation, u.name AS user_name, u.email AS user_email
       FROM parents p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
      [id]
    );
    return res.json({ parent: updated[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('PUT /api/parents/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const UpdateParentPassword = async (req, res) => {
  const id = toInt(req.params.id);
  const { current_password, new_password } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });
  if (!isNonEmptyString(new_password) || new_password.length < 6) return res.status(400).json({ error: 'new_password required (min 6 chars)' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [prows] = await conn.execute(`SELECT user_id FROM parents WHERE id = ? FOR UPDATE`, [id]);
    if (prows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Parent not found' }); }
    const userId = prows[0].user_id;

    const [uRows] = await conn.execute(`SELECT password_hash FROM users WHERE id = ? FOR UPDATE`, [userId]);
    if (uRows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'User not found' }); }
    const currentHash = uRows[0].password_hash;

    if (isNonEmptyString(current_password)) {
      const ok = await bcrypt.compare(current_password, currentHash);
      if (!ok) { await conn.rollback(); conn.release(); return res.status(403).json({ error: 'Current password invalid' }); }
    }

    const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);

    await conn.commit();
    conn.release();
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('PUT /api/parents/:id/password error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const DeleteParent = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [prows] = await conn.execute(`SELECT user_id FROM parents WHERE id = ? FOR UPDATE`, [id]);
    if (prows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Parent not found' }); }
    const userId = prows[0].user_id;

    // delete links
    await conn.execute(`DELETE FROM parent_children WHERE parent_id = ?`, [id]);

    // delete parent row
    await conn.execute(`DELETE FROM parents WHERE id = ?`, [id]);

    // delete user row
    await conn.execute(`DELETE FROM users WHERE id = ?`, [userId]);

    await conn.commit();
    conn.release();
    return res.json({ success: true, deleted_parent_id: id });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('DELETE /api/parents/:id error', err);
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({ error: 'Parent cannot be deleted because referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const AddParentChildLink = async (req, res) => {
  const id = toInt(req.params.id);
  const studentIds = Array.isArray(req.body.student_ids) ? req.body.student_ids.map(Number).filter(Boolean) : [];
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });
  if (studentIds.length === 0) return res.status(400).json({ error: 'student_ids array required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [prows] = await conn.execute(`SELECT id FROM parents WHERE id = ? FOR UPDATE`, [id]);
    if (prows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Parent not found' }); }

    // ensure students exist (optional) - simple check: filter valid ids
    const [validStudents] = await conn.query(`SELECT id FROM students WHERE id IN (${studentIds.map(()=>'?').join(',')})`, studentIds);
    const validIds = validStudents.map(r => r.id);
    if (validIds.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'No valid student ids provided' }); }

    // insert ignore pairs
    const pairs = validIds.map(() => '(?, ?)').join(', ');
    const params = [];
    validIds.forEach(sid => params.push(id, sid));
    await conn.execute(`INSERT IGNORE INTO parent_children (parent_id, student_id) VALUES ${pairs}`, params);

    await conn.commit();
    conn.release();
    return res.json({ success: true, linked_student_ids: validIds });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/parents/:id/children error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const DeleteParentChild = async (req, res) => {
  const id = toInt(req.params.id);
  const studentId = toInt(req.params.student_id);
  if (!id || !studentId) return res.status(400).json({ error: 'Invalid id or student_id' });

  try {
    const [result] = await db.execute(`DELETE FROM parent_children WHERE parent_id = ? AND student_id = ?`, [id, studentId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Parent-child link not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/parents/:id/children/:student_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const GetChildrenFromParent = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid parent id' });

  try {
    const [children] = await db.execute(
      `SELECT s.id AS student_id, s.user_id, u.name AS student_name, u.email AS student_email, s.class_id, s.grade_id
       FROM parent_children pc
       JOIN students s ON s.id = pc.student_id
       JOIN users u ON u.id = s.user_id
       WHERE pc.parent_id = ?`,
      [id]
    );
    return res.json({ children });
  } catch (err) {
    console.error('GET /api/parents/:id/children error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  AddParents,
  GetParents,
  GetParentWithChildrenById,
  UpdateParent,
  UpdateParentPassword,
  DeleteParent,
  AddParentChildLink,
  DeleteParentChild,
  GetChildrenFromParent
};