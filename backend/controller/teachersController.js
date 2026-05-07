const db = require("../db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const formatMySQLDate = require("../config/deateConverter");
const { deleteFromCloudinary } = require("../helper/cloudinaryHelper");
const { generateNextId } = require("../utils/idGenerator");
require('dotenv').config();

const SALT_ROUNDS = 10;
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));


const AddTeacher = async (req, res) => {
  console.log("Received body:", req.body);
  const {
    name,
    email,
    gender,
    password,
    phone,
    role_id,
    employee_code,
    hire_date,
    qualification,
    bio,
    address,
    adhar_no,
  } = req.body || {};

  const avatar_url = req.file ? req.file.path : null;

  if (
    !isNonEmptyString(name) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(gender) ||
    !isNonEmptyString(password) ||
    !toInt(role_id) ||
    !isNonEmptyString(phone) ||
    !isNonEmptyString(adhar_no)
  ) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    return res
      .status(400)
      .json({ error: "name, email, gender, password, phone and role_id are required" });
  }
  if (password.length < 6) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) create user
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Dynamic ID Generation for employee_code
    let finalEmployeeCode = employee_code;
    const [settingsRows] = await conn.execute('SELECT setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
    if (settingsRows.length > 0 && settingsRows[0].setting_value) {
      finalEmployeeCode = await generateNextId(settingsRows[0].setting_value, 'teachers', 'employee_code');
    }

    const [userRes] = await conn.execute(
      `INSERT INTO users (name, email, gender, password_hash, phone, avatar_url, address, adhar_no, role_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [name, email.trim(), gender, password_hash, phone, avatar_url || null, address || null, adhar_no || null, role_id]
    );
    const userId = userRes.insertId;

    // 2) create teacher profile
    const [teacherRes] = await conn.execute(
      `INSERT INTO teachers (id, user_id, employee_code, hire_date, qualification, bio)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, userId, finalEmployeeCode || null, hire_date || null, qualification || null, bio || null]
    );

    // fetch created teacher with user info
    const [rows] = await conn.execute(
      `SELECT t.id AS teacher_id, t.user_id, t.employee_code, DATE_FORMAT(t.hire_date, '%Y-%m-%d') AS hire_date, t.qualification, t.bio,
              u.id AS user_id, u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id
      FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
      [teacherRes.insertId]
    );
    // await conn.commit();
    // conn.release();

    // Format dates correctly
    const formattedTeachers = rows.map(teacher => ({
      ...teacher,
      // Format date as yyyy-mm-dd without timezone conversion
      hire_date: teacher.hire_date ?
        formatMySQLDate(teacher.hire_date) :
        null
    }));
    await conn.commit();
    return res.status(201).json({ success: true, message: 'Teacher created successfully', teacher: formattedTeachers[0] });
  } catch (err) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    await conn.rollback();
    console.error("POST /api/teachers error", err);
    if (err && err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ error: "Email or employee_code already exists" });
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
};


/**
 * GET /api/teachers
 * optional query: ?q=&limit=&offset=
 */

const GetTeacher = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';

  // validate and clamp limit/offset
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 100;
  limit = Math.min(limit, 1000);

  let offset = parseInt(req.query.offset, 10);
  if (!Number.isFinite(offset) || offset < 0) offset = 0;

  // const conn = await db.getConnection();
  try {
    // embed limit/offset as numbers (safe because validated above)
    const sql = `
      SELECT t.id AS teacher_id, t.user_id, t.employee_code, t.hire_date, t.qualification, t.bio,
             u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_avatar_url, u.role_id, u.address AS user_address, u.adhar_no AS user_adhar_no
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      WHERE u.name LIKE ? OR u.email LIKE ? OR t.employee_code LIKE ?
      ORDER BY t.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(sql, [q, q, q]);

    // Fetch subjects for these teachers
    if (rows.length > 0) {
      const teacherIds = rows.map(r => r.teacher_id);
      const placeholders = teacherIds.map(() => '?').join(',');
      const [subjectsRows] = await db.execute(
        `SELECT ts.teacher_id, s.id as subject_id, s.name as subject_name 
         FROM teacher_subjects ts 
         JOIN subjects s ON ts.subject_id = s.id 
         WHERE ts.teacher_id IN (${placeholders})`,
        teacherIds
      );

      // Group subjects by teacher
      const subjectsMap = {};
      subjectsRows.forEach(row => {
        if (!subjectsMap[row.teacher_id]) subjectsMap[row.teacher_id] = [];
        subjectsMap[row.teacher_id].push({ subject_id: row.subject_id, id: row.subject_id, name: row.subject_name });
      });

      rows.forEach(row => {
        row.subjects = subjectsMap[row.teacher_id] || [];
      });
    }

    // Format dates correctly
    const formattedTeachers = rows.map(teacher => ({
      ...teacher,
      // Format date as yyyy-mm-dd without timezone conversion
      hire_date: teacher.hire_date ?
        formatMySQLDate(teacher.hire_date) :
        null
    }));
    // await conn.commit();
    return res.json({ teachers: formattedTeachers, limit, offset });
  } catch (err) {
    // await db.rollback();
    console.error('GET /api/teachers error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * GET /api/teachers/:id
 * returns teacher profile, user info, subjects taught, supervised classes
 */


const GetTeacherById = async (req, res) => {
  // const id = toInt(req.params.id);
  const userId = req.user.id;
  if (!userId) return res.status(400).json({ error: 'Invalid teacher id' });
  // const conn = await db.getConnection();

  // 1️⃣ get teacher
  const [trows] = await db.execute(
    `SELECT id FROM teachers WHERE user_id = ?`,
    [userId]
  );

  if (trows.length === 0) {
    return res.status(403).json({ error: 'You are not a teacher' });
  }

  const teacherId = trows[0].id;

  try {
    // main teacher + user
    const [trows] = await db.execute(
      `SELECT t.id AS teacher_id, t.user_id, t.employee_code, t.hire_date, t.qualification, t.bio,
              u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar_url, u.role_id, u.address AS user_address, u.adhar_no AS user_adhar_no
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`,
      [teacherId]
    );
    if (trows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const teacher = trows[0];

    // subjects
    const [subjects] = await db.execute(
      `SELECT s.* FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?`,
      [teacherId]
    );

    // supervised classes
    const [classes] = await db.execute(
      `SELECT c.* FROM classes c WHERE c.supervisor_teacher_id = ?`,
      [teacherId]
    );

    teacher.subjects = subjects;
    teacher.supervised_classes = classes;
    // Format dates correctly
    const formattedTeachers = trows.map(teacher => ({
      ...teacher,
      // Format date as yyyy-mm-dd without timezone conversion
      hire_date: teacher.hire_date ?
        formatMySQLDate(teacher.hire_date) :
        null
    }));
    // await conn.commit();
    return res.json({ teacher: formattedTeachers });
  } catch (err) {
    // await conn.rollback();
    console.error('GET /api/teachers/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/teachers/:id
 * body may include:
 * { first_name?, last_name?, email?, role_id?, employee_code?, hire_date?, qualification?, bio? }
 *
 * Updates both users table (name/email/role_id) and teachers profile.
 */

const UpdateTeacher = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid teacher id' });

  const { name, email, gender, role_id, phone, employee_code, hire_date, qualification, bio, address, adhar_no } = req.body || {};
  const avatar_url = req.file ? req.file.path : undefined;
  if (
    name === undefined &&
    email === undefined &&
    gender === undefined &&
    role_id === undefined &&
    phone === undefined &&
    avatar_url &&
    employee_code === undefined &&
    hire_date === undefined &&
    qualification === undefined &&
    bio === undefined &&
    address === undefined &&
    adhar_no === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ensure teacher exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM teachers WHERE id = ? FOR UPDATE`, [id]);
    if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Teacher not found' }); }
    const teacherRow = trows[0];

    // update users table if needed
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) {
      // fetch existing user name and split if needed
      const [uRows] = await conn.execute(`SELECT name FROM users WHERE id = ? FOR UPDATE`, [teacherRow.user_id]);
      const currentName = uRows[0] ? uRows[0].name : '';
      console.log('Current Name:', currentName);
      userUpdates.push('name = ?');
      userParams.push(`${name}`.trim());
    }

    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email || null); }
    if (gender !== undefined) { userUpdates.push('gender = ?'); userParams.push(gender || null); }
    if (role_id !== undefined) { userUpdates.push('role_id = ?'); userParams.push(role_id || null); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone || null); }
    if (address !== undefined) { userUpdates.push('address = ?'); userParams.push(address || null); }
    if (adhar_no !== undefined) { userUpdates.push('adhar_no = ?'); userParams.push(adhar_no || null); }
    if (req.body.password !== undefined && req.body.password !== "") {
      const password_hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      userUpdates.push('password_hash = ?');
      userParams.push(password_hash);
    }
    if (avatar_url !== undefined) {
      // 🟢 Delete old avatar if uploading new one
      const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [teacherRow.user_id]);
      if (uRows[0] && uRows[0].avatar_url) {
        await deleteFromCloudinary(uRows[0].avatar_url);
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(avatar_url || null);
    }

    if (userUpdates.length > 0) {
      userParams.push(teacherRow.user_id);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // update teachers table fields
    const tUpdates = [];
    const tParams = [];
    if (employee_code !== undefined) { tUpdates.push('employee_code = ?'); tParams.push(employee_code || null); }
    if (hire_date !== undefined) { tUpdates.push('hire_date = ?'); tParams.push(hire_date || null); }
    if (qualification !== undefined) { tUpdates.push('qualification = ?'); tParams.push(qualification || null); }
    if (bio !== undefined) { tUpdates.push('bio = ?'); tParams.push(bio || null); }

    if (tUpdates.length > 0) {
      tParams.push(id);
      await conn.execute(`UPDATE teachers SET ${tUpdates.join(', ')} WHERE id = ?`, tParams);
    }

    // return updated teacher
    const [updatedRows] = await conn.execute(
      `SELECT t.id AS teacher_id, t.user_id, t.employee_code, DATE_FORMAT(t.hire_date, '%Y-%m-%d') AS hire_date, t.qualification, t.bio,
              u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id
       FROM teachers t JOIN users u ON u.id = t.user_id WHERE t.id = ?`,
      [id]
    );
    // Format dates correctly
    const formattedTeachers = updatedRows.map(teacher => ({
      ...teacher,
      // Format date as yyyy-mm-dd without timezone conversion
      hire_date: teacher.hire_date ?
        formatMySQLDate(teacher.hire_date) :
        null
    }));
    await conn.commit();
    return res.json({ teacher: formattedTeachers[0] });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/teachers/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email or employee_code conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

/**
 * PUT /api/teachers/:id/password
 * Body: { current_password?, new_password }
 * If current_password provided, validates it.
 */

const UpdateTeacherPassword = async (req, res) => {
  const id = toInt(req.params.id);
  const { current_password, new_password } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid teacher id' });
  if (!isNonEmptyString(new_password) || new_password.length < 6) return res.status(400).json({ error: 'new_password required (min 6 chars)' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trows] = await conn.execute(`SELECT user_id FROM teachers WHERE id = ? FOR UPDATE`, [id]);
    if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Teacher not found' }); }
    const userId = trows[0].user_id;

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
    return res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/teachers/:id/password error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}



const DeleteTeacher = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid teacher id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trows] = await conn.execute(`SELECT user_id FROM teachers WHERE id = ? FOR UPDATE`, [id]);
    if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Teacher not found' }); }
    const userId = trows[0].user_id;

    const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [userId]);
    const avatarUrl = uRows[0] ? uRows[0].avatar_url : null;

    // delete teacher row
    await conn.execute(`DELETE FROM teachers WHERE id = ?`, [id]);

    // delete user row (will cascade/clean up depending on your FK design)
    await conn.execute(`DELETE FROM users WHERE id = ?`, [userId]);

    // 🟢 Delete avatar from Cloudinary
    if (avatarUrl) {
      await deleteFromCloudinary(avatarUrl);
    }

    await conn.commit();
    return res.json({ success: true, deleted_teacher_id: id });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/teachers/:id error', err);
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({ error: 'Teacher cannot be deleted because referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}







/* ====== TEACHER SUBJECT ASSIGNMENTS ====== */

/**
 * GET /api/teachers/:id/subjects
 */

const GetSubjectByAssignTeacher = async (req, res) => {
  // const teacherid = toInt(req.params.teacher_id);
  const userTeacherId = req.user.id;

  // 1️⃣ get teacher
  const [trows] = await db.execute(
    `SELECT id FROM teachers WHERE user_id = ?`,
    [userTeacherId]
  );

  if (trows.length === 0) {
    return res.status(403).json({ error: 'You are not a teacher' });
  }

  const teacherid = trows[0].id;
  // const conn = await db.getConnection();

  try {
    const [rows] = await db.execute(
      `SELECT s.* FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?`,
      [teacherid]
    );
    return res.json({ subjects: rows });
  } catch (err) {
    console.error('GET /api/teachers/:id/subjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const GetSubjectsByTeacherId = async (req, res) => {
  const teacherId = Number(req.params.id);
  if (!teacherId) return res.status(400).json({ error: 'Invalid teacher id' });

  try {
    const [rows] = await db.execute(
      `SELECT s.* FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?`,
      [teacherId]
    );
    return res.json({ subjects: rows });
  } catch (err) {
    console.error('GET /api/teachers/:id/subjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



const GetTeachersAssignOnSubject = async (req, res) => {
  const subjectId = toInt(req.params.subject_id);
  if (!subjectId) return res.status(400).json({ error: 'Invalid subject id' });

  // const conn = await db.getConnection();

  try {
    const [rows] = await db.execute(
      `SELECT t.*, u.name, u.email 
       FROM teacher_subjects ts 
       JOIN teachers t ON t.id = ts.teacher_id 
       JOIN users u ON u.id = t.user_id 
       WHERE ts.subject_id = ?`,
      [subjectId]
    );
    // await conn.commit();
    return res.json({ teachers: rows });
  } catch (err) {
    // await conn.rollback();
    console.error('GET /api/teacher/:id/teachers error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const GetAllTeacherSubjectAssignments = async (req, res) => {
  // const conn = await db.getConnection();
  try {
    const [rows] = await db.execute(`
      SELECT 
        ts.teacher_id,
        u.name AS teacher_name,
        u.email AS teacher_email,
        ts.subject_id,
        s.name AS subject_name,
        s.code AS subject_code
      FROM teacher_subjects ts
      JOIN teachers t ON t.id = ts.teacher_id
      JOIN users u ON u.id = t.user_id
      JOIN subjects s ON s.id = ts.subject_id
      ORDER BY u.name, s.name
    `);

    // 🔥 GROUP DATA
    const map = new Map();

    for (const row of rows) {
      if (!map.has(row.teacher_id)) {
        map.set(row.teacher_id, {
          teacher_id: row.teacher_id,
          teacher_name: row.teacher_name,
          teacher_email: row.teacher_email,
          subject_ids: [],
          subjects: []
        });
      }

      const entry = map.get(row.teacher_id);
      entry.subject_ids.push(row.subject_id);
      entry.subjects.push({
        id: row.subject_id,
        name: row.subject_name,
        code: row.subject_code
      });
    }

    // await conn.commit();

    return res.json({
      assignments: Array.from(map.values())
    });

    // return res.json({ assignments: rows });
  } catch (err) {
    // await conn.rollback();
    console.error('GET /api/teacher-subjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/teachers/:id/subjects
 * Body: { subject_ids: [1,2,3] } - assigns multiple subjects (idempotent)
 */


// const AsignTeacherForSubject = async (req, res) => {
//   const id = toInt(req.params.id);
//   const subjectIds = Array.isArray(req.body.subject_ids) ? req.body.subject_ids.map(Number).filter(Boolean) : [];
//   if (!id) return res.status(400).json({ error: 'Invalid teacher id' });
//   if (subjectIds.length === 0) return res.status(400).json({ error: 'subject_ids array required' });

//   const conn = await db.getConnection();
//   try {
//     await conn.beginTransaction();

//     // ensure teacher exists
//     const [trows] = await conn.execute(`SELECT id FROM teachers WHERE id = ? FOR UPDATE`, [id]);
//     if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Teacher not found' }); }

//     // insert ignoring duplicates
//     const insertVals = subjectIds.map(() => '(?, ?)').join(', ');
//     const params = [];
//     subjectIds.forEach(sid => { params.push(id, sid); });

//     // Use INSERT IGNORE to skip existing pairs (works if unique PK exists on teacher_subjects)
//     await conn.execute(
//       `INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES ${insertVals}`,
//       params
//     );

//     await conn.commit();
//     conn.release();
//     return res.json({ success: true, assigned_subject_ids: subjectIds });
//   } catch (err) {
//     await conn.rollback();
//     conn.release();
//     console.error('POST /api/teachers/:id/subjects error', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   }
// }



// const AsignTeacherForSubject = async (req, res) => {
//   const id = toInt(req.params.id);
//   const subjectIds = Array.isArray(req.body.subject_ids) ? req.body.subject_ids.map(Number).filter(Boolean) : [];
//   if (!id) return res.status(400).json({ error: 'Invalid teacher id' });
//   if (subjectIds.length === 0) return res.status(400).json({ error: 'subject_ids array required' });

//   const conn = await db.getConnection();
//   try {
//     await conn.beginTransaction();

//     // ensure teacher exists
//     const [trows] = await conn.execute(`SELECT id FROM teachers WHERE id = ? FOR UPDATE`, [id]);
//     if (trows.length === 0) { 
//       await conn.rollback(); 
//       conn.release(); 
//       return res.status(404).json({ error: 'Teacher not found' }); 
//     }

//     // Check for existing assignments
//     const placeholders = subjectIds.map(() => '?').join(', ');
//     const [existing] = await conn.execute(
//       `SELECT subject_id FROM teacher_subjects WHERE teacher_id = ? AND subject_id IN (${placeholders})`,
//       [id, ...subjectIds]
//     );

//     if (existing.length > 0) {
//       const duplicateIds = existing.map(row => row.subject_id);
//       await conn.rollback();
//       conn.release();
//       return res.status(409).json({ 
//         error: 'Some subjects are already assigned to this teacher',
//         duplicate_subject_ids: duplicateIds
//       });
//     }

//     // Insert new assignments
//     const insertVals = subjectIds.map(() => '(?, ?)').join(', ');
//     const params = [];
//     subjectIds.forEach(sid => { params.push(id, sid); });

//     await conn.execute(
//       `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ${insertVals}`,
//       params
//     );

//     await conn.commit();
//     return res.json({ success: true, assigned_subject_ids: subjectIds });
//   } catch (err) {
//     await conn.rollback();
//     console.error('POST /api/teachers/:id/subjects error', err);
//     return res.status(500).json({ error: 'Internal server error' });
//   } finally {
//     conn.release();
//   }
// }



const AsignTeacherForSubject = async (req, res) => {
  const teacherId = Number(req.params.id);
  const subjectIds = Array.isArray(req.body.subject_ids)
    ? [...new Set(req.body.subject_ids.map(Number).filter(Boolean))]
    : [];

  if (!teacherId) {
    return res.status(400).json({ error: 'Invalid teacher id' });
  }
  if (subjectIds.length === 0) {
    return res.status(400).json({ error: 'subject_ids array required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure teacher exists
    const [teacher] = await conn.execute(
      `SELECT id FROM teachers WHERE id = ? FOR UPDATE`,
      [teacherId]
    );

    if (teacher.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Bulk insert – duplicates automatically ignored
    const values = subjectIds.map(() => '(?, ?)').join(', ');
    const params = [];
    subjectIds.forEach(sid => params.push(teacherId, sid));

    const [result] = await conn.execute(
      `INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id)
       VALUES ${values}`,
      params
    );

    await conn.commit();

    return res.json({
      success: true,
      requested_subject_ids: subjectIds,
      newly_assigned_count: result.affectedRows
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



/**
 * DELETE /api/teachers/:id/subjects/:subject_id
 */

const DeleteSubjectAssignOnTeacher = async (req, res) => {
  const id = toInt(req.params.id);
  const subjectId = toInt(req.params.subject_id);
  console.log(id, subjectId);
  if (!id || !subjectId) return res.status(400).json({ error: 'Invalid id or subject_id' });
  const conn = await db.getConnection();

  try {
    const [result] = await conn.execute(`DELETE FROM teacher_subjects WHERE teacher_id = ? AND subject_id = ?`, [id, subjectId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/teachers/:id/subjects/:subject_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



/* ====== TEACHER SUPERVISED CLASSES ====== */

/**
 * GET /api/teachers/:id/classes
 * Lists classes where teacher is supervisor
 */

const GetClassByteacherSuperviser = async (req, res) => {
  const id = toInt(req.params.id);
  const userId = req.user.id;
  if (!userId) return res.status(400).json({ error: 'Invalid teacher id' });
  // const conn = await db.getConnection();

  // 1️⃣ get teacher
  const [trows] = await db.execute(
    `SELECT id FROM teachers WHERE user_id = ?`,
    [userId]
  );

  if (trows.length === 0) {
    return res.status(403).json({ error: 'You are not a teacher' });
  }

  const teacherId = trows[0].id;

  try {
    const [rows] = await db.execute(
      `SELECT c.* FROM classes c WHERE c.supervisor_teacher_id = ?`,
      [teacherId]
    );
    return res.json({ classes: rows });
  } catch (err) {
    console.error('GET /api/teachers/:id/classes error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



const GetStudentsOfMySupervisedClass = async (req, res) => {
  try {
    const userId = req.user.id;
    const roleId = req.user.role_id;
    let classId = req.query.class_id ? Number(req.query.class_id) : null;

    let selectedClass = null;

    // 1️⃣ Handle based on role
    if (roleId === 3) {
      // Admin: Must provide or use provided classId
      if (!classId) return res.status(400).json({ error: 'class_id is required for admins' });

      const [crows] = await db.execute(
        `SELECT id, name FROM classes WHERE id = ?`,
        [classId]
      );
      if (crows.length === 0) return res.status(404).json({ error: 'Class not found' });
      selectedClass = crows[0];
    } else {
      // Teacher: Default to supervised class if not provided, or verify they supervise provided class
      const [trows] = await db.execute(
        `SELECT id FROM teachers WHERE user_id = ?`,
        [userId]
      );

      if (trows.length === 0) return res.status(403).json({ error: 'You are not a teacher' });
      const teacherId = trows[0].id;

      if (classId) {
        // Verify teacher supervises this specific class
        const [crows] = await db.execute(
          `SELECT id, name FROM classes WHERE id = ? AND supervisor_teacher_id = ?`,
          [classId, teacherId]
        );
        if (crows.length === 0) return res.status(403).json({ error: 'You do not supervise this class' });
        selectedClass = crows[0];
      } else {
        // Default to their supervised class
        const [crows] = await db.execute(
          `SELECT id, name FROM classes WHERE supervisor_teacher_id = ?`,
          [teacherId]
        );
        if (crows.length === 0) return res.status(404).json({ error: 'No supervised class found' });
        selectedClass = crows[0];
        classId = selectedClass.id;
      }
    }

    // 2️⃣ get students of that class
    const [students] = await db.execute(
      `SELECT 
         s.id AS student_id,
         sar.roll_no,
         sar.id AS student_academic_id,
         u.gender,
         u.name AS student_name,
         u.email AS student_email,
         u.avatar_url AS user_avatar_url,
         u.phone AS student_contact,
         u.address AS user_address,
         u.adhar_no AS user_adhar_number,
         s.fathers_name,
         s.mothers_name,
         s.date_of_birth,
         s.admission_date,
         s.status,
         s.parent_contact AS father_contact,
         s.mother_contect AS mother_contact,
         c.name AS class_name,
         g.name AS grade_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       JOIN student_academic_records sar ON sar.student_id = s.id
         AND sar.academic_year_id = (SELECT academic_year_id FROM student_academic_records WHERE class_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1)
       JOIN classes c ON c.id = sar.class_id
       JOIN grades g ON g.id = sar.grade_id
       WHERE sar.class_id = ?
       ORDER BY sar.roll_no ASC`,
      [classId, classId]
    );

    // Format dates correctly
    const formattedStudents = students.map(student => ({
      ...student,
      // Format date as yyyy-mm-dd without timezone conversion
      date_of_birth: student.date_of_birth ?
        formatMySQLDate(student.date_of_birth) :
        null,
      admission_date: student.admission_date ?
        formatMySQLDate(student.admission_date) :
        null
    }));

    return res.json({
      class: selectedClass,
      students: formattedStudents
    });
  } catch (err) {
    console.error('GET /teachers/my/supervised-class/students error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



const GetPublicTeachers = async (req, res) => {
  try {
    const limit = 20; // public list limit
    
    const sql = `
      SELECT t.id AS teacher_id, t.employee_code, t.qualification, t.bio,
             u.name AS user_name, u.avatar_url AS user_avatar_url
      FROM teachers t
      JOIN users u ON u.id = t.user_id
      WHERE u.role_id = 2
      ORDER BY t.id ASC
      LIMIT ${limit}
    `;

    const [rows] = await db.execute(sql);

    // Fetch subjects for these teachers
    if (rows.length > 0) {
      const teacherIds = rows.map(r => r.teacher_id);
      const placeholders = teacherIds.map(() => '?').join(',');
      const [subjectsRows] = await db.execute(
        `SELECT ts.teacher_id, s.name as subject_name 
         FROM teacher_subjects ts 
         JOIN subjects s ON ts.subject_id = s.id 
         WHERE ts.teacher_id IN (${placeholders})`,
        teacherIds
      );

      const subjectsMap = {};
      subjectsRows.forEach(row => {
        if (!subjectsMap[row.teacher_id]) subjectsMap[row.teacher_id] = [];
        subjectsMap[row.teacher_id].push({ name: row.subject_name });
      });

      rows.forEach(row => {
        row.subjects = subjectsMap[row.teacher_id] || [];
      });
    }

    return res.json({ teachers: rows });
  } catch (err) {
    console.error('GET /api/teachers/public error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const { generateTeacherDetailsPDF } = require('../helper/pdfHelper');

const DownloadTeacherPdf = async (req, res) => {
  const teacherId = Number(req.params.id);
  if (!teacherId) return res.status(400).json({ error: 'Invalid teacher id' });

  try {
    const [trows] = await db.execute(
      `SELECT t.id AS teacher_id, t.employee_code, t.hire_date, t.qualification, t.bio,
              u.name, u.avatar_url
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = ?`,
      [teacherId]
    );

    if (trows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const teacher = trows[0];

    // subjects
    const [subjects] = await db.execute(
      `SELECT s.name FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id WHERE ts.teacher_id = ?`,
      [teacherId]
    );

    teacher.hire_date = teacher.hire_date ? formatMySQLDate(teacher.hire_date) : 'N/A';

    const pdfBuffer = await generateTeacherDetailsPDF({ teacher, subjects });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Teacher_Profile_${teacher.name.replace(/ /g, '_')}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('GET /api/teachers/public/:id/download-pdf error', err);
    return res.status(500).json({ error: 'Internal server error generating PDF' });
  }
};


module.exports = {
  AddTeacher,
  GetTeacher,
  GetTeacherById,
  UpdateTeacher,
  UpdateTeacherPassword,
  DeleteTeacher,
  GetSubjectByAssignTeacher,
  GetTeachersAssignOnSubject,
  AsignTeacherForSubject,
  DeleteSubjectAssignOnTeacher,
  GetClassByteacherSuperviser,
  GetAllTeacherSubjectAssignments,
  GetStudentsOfMySupervisedClass,
  GetSubjectsByTeacherId,
  GetPublicTeachers,
  DownloadTeacherPdf
};