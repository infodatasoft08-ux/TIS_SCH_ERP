const formatMySQLDate = require("../config/deateConverter");
const db = require("../db");
const bcrypt = require('bcryptjs');
const { deleteFromCloudinary } = require("../helper/cloudinaryHelper");
const { generateNextId } = require("../utils/idGenerator");
const { generateAdmissionFormPDF } = require("../helper/pdfHelper");
require('dotenv').config();
const SALT_ROUNDS = 10;
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));


/**
 * POST /api/students
 * Body:
 * {
 *   first_name, last_name, email, password, role_id,
 *   admission_no?, roll_no?, date_of_birth?, gender?,
 *   grade_id?, class_id?, admission_date?, status?,
 *   avatar_url?, parent_ids?: [1,2], // optional to link existing parent user ids
 *   parent_contact?, contect_no?, acadmic_year?, mothers_name?, fathers_name?, address?
 * }
 *
 * Creates a users row and students row in a transaction.
 */
const AddStudent = async (req, res) => {
  const {
    name, email, password, role_id, phone,
    admission_no, roll_no, date_of_birth, gender,
    grade_id, class_id, admission_date, adhar_number, blood_group, mother_contect, father_occupation, status, parent_ids,
    parent_contact, academic_year_id, mothers_name, fathers_name, address
  } = req.body;

  const avatar_url = req.file ? req.file.path : undefined;

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password) || !role_id || !isNonEmptyString(phone) || !isNonEmptyString(gender)) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    return res.status(400).json({ error: 'name, email, password and role_id are required' });
  }
  if (password.length < 6) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) Create user
    const fullName = `${name.trim()}`;
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Dynamic ID Generation for admission_no
    let finalAdmissionNo = admission_no;
    const [settingsRows] = await conn.execute('SELECT setting_value FROM school_settings WHERE setting_key = "admission_no_prefix"');
    if (settingsRows.length > 0 && settingsRows[0].setting_value) {
      finalAdmissionNo = await generateNextId(settingsRows[0].setting_value, 'students', 'admission_no');
    }

    const [userRes] = await conn.execute(
      `INSERT INTO users (name, email, gender, password_hash, role_id, phone, avatar_url, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        fullName,
        email.trim(),
        gender,
        password_hash,
        role_id,
        phone,
        avatar_url || null,
        adhar_number || null,
        address || null
      ]
    );
    const userId = userRes.insertId;

    // 2) Create student profile
    // If your students table uses 'id = users.id' pattern (students.id references users.id),
    // replace the following INSERT to set id = userId and don't provide user_id column.
    // Example:
    // INSERT INTO students (id, admission_no, ...) VALUES (?, ?, ...)
    //
    const [studentRes] = await conn.execute(
      `INSERT INTO students
        (id, user_id, admission_no, date_of_birth, admission_date, blood_group, mother_contect, father_occupation, status,
         parent_contact, mothers_name, fathers_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        userId,
        finalAdmissionNo || null,
        date_of_birth || null,
        admission_date || null,
        // adhar_number || null,
        blood_group || null,
        mother_contect || null,
        father_occupation || null,
        status || 'active',
        parent_contact || null,
        mothers_name || null,
        fathers_name || null,
        // address || null
      ]
    );
    const studentId = studentRes.insertId;

    if (!grade_id || !class_id || !academic_year_id) {
      throw new Error("grade_id, class_id and academic_year_id are required for admission");
    }

    await conn.execute(
      `INSERT INTO student_academic_records
      (student_id, academic_year_id, grade_id, class_id, roll_no, result_status)
      VALUES (?, ?, ?, ?, ?, 'pass')`,
      [
        userId,
        academic_year_id || null,
        grade_id,
        class_id,
        roll_no || null
      ]
    );

    // 3) Optionally link parents (parent_ids should be parent table ids)
    // if (Array.isArray(parent_ids) && parent_ids.length > 0) {
    //   const pairs = parent_ids.map(pid => '(?, ?)').join(', ');
    //   const params = [];
    //   parent_ids.forEach(pid => { params.push(pid, studentId); });
    //   // use INSERT IGNORE if parent_children has unique PK (parent_id, student_id)
    //   await conn.execute(
    //     `INSERT IGNORE INTO parent_children (parent_id, student_id) VALUES ${pairs}`,
    //     params
    //   );
    // }

    // 4) Optionally link class (class_id should be class table ids)
    if (Array.isArray(class_id) && class_id.length > 0) {
      const pairs = class_id.map(cid => '(?, ?)').join(', ');
      const params = [];
      class_id.forEach(cid => { params.push(cid, studentId); });
      // use INSERT IGNORE if class_students has unique PK (class_id, student_id)
      await conn.execute(
        `INSERT IGNORE INTO class_students (class_id, student_id) VALUES ${pairs}`,
        params
      );
    }

    await conn.commit();

    // Return created student with user info
    const [rows] = await conn.execute(
      `SELECT s.*, u.id AS user_id, u.name AS user_name, u.email AS user_email, u.gender AS user_gender
      FROM students s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
      [studentId]
    );
    return res.status(201).json({ student: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/students error', err);
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email or admission_no conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



/**
 * GET /api/students
 * Query params: ?q=&grade_id=&class_id=&limit=&offset=
 */

const GetStudent = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  const gradeId = req.query.grade_id && req.query.grade_id !== '' ? Number(req.query.grade_id) : null;
  const classId = req.query.class_id && req.query.class_id !== '' ? Number(req.query.class_id) : null;
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  try {

    let sql = `
      SELECT 
        s.*,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        u.gender AS user_gender,
        u.phone AS user_phone,
        u.avatar_url AS user_avatar_url,
        u.address AS user_address,
        u.adhar_no AS user_adhar_no,
        ar.id AS academic_id,
        ar.academic_year_id,
        ar.roll_no,
        ar.grade_id,
        ar.class_id,
        g.name AS grade_name,
        c.name AS class_name,
        ay.name AS academic_year
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN student_academic_records ar ON ar.student_id = s.id
      JOIN (
        SELECT student_id, MAX(id) as latest_id
        FROM student_academic_records
        GROUP BY student_id
      ) latest ON latest.student_id = s.id 
                AND ar.id = latest.latest_id
      LEFT JOIN grades g ON g.id = ar.grade_id
      LEFT JOIN classes c ON c.id = ar.class_id
      LEFT JOIN academic_years ay ON ay.id = ar.academic_year_id
      WHERE (u.name LIKE ? OR u.email LIKE ? OR s.admission_no LIKE ? OR ar.roll_no LIKE ? OR g.name LIKE ? OR c.name LIKE ?)
    `;

    const params = [q, q, q, q, q, q];

    if (gradeId) { sql += ' AND ar.grade_id = ?'; params.push(gradeId); }
    if (classId) { sql += ' AND ar.class_id = ?'; params.push(classId); }

    sql += ` ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`;
    // sql += ' ORDER BY s.id DESC LIMIT ? OFFSET ?';
    // params.push(limit, offset);
    const [rows] = await db.execute(sql, params);

    const formattedStudents = rows.map(student => ({
      ...student,
      // Format date as yyyy-mm-dd without timezone conversion
      admission_date: student.admission_date ?
        formatMySQLDate(student.admission_date) :
        null,
      date_of_birth: student.date_of_birth ?
        formatMySQLDate(student.date_of_birth) :
        null
    }));

    return res.json({ students: formattedStudents, limit, offset });
  } catch (err) {
    console.error('GET /api/students error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * GET /api/students/:id
 * Returns student with user info, parents list, grade/class, invoices summary and attendance summary
 */


const GetStudentById = async (req, res) => {
  // const id = toInt(req.params.id);
  const userId = req.user.id;
  if (!userId) return res.status(400).json({ error: 'Invalid student id' });
  // const conn = await db.getConnection();

  // 1️⃣ get student
  const [trows] = await db.execute(
    `SELECT id FROM students WHERE user_id = ?`,
    [userId]
  );

  if (trows.length === 0) {
    return res.status(403).json({ error: 'You are not a student' });
  }

  const studentId = trows[0].id;

  // if (!id) return res.status(400).json({ error: 'Invalid student id' });

  try {

    const [srows] = await db.execute(
      `SELECT 
        s.*, 
        u.name AS user_name, u.email, u.gender, u.phone, u.avatar_url as user_avatar_url,
        u.address AS user_address,
        u.adhar_no AS user_adhar_no,
        ar.id AS academic_id,
        ar.academic_year_id,
        ar.roll_no,
        ar.grade_id,
        ar.class_id,
        g.name AS grade_name,
        c.name AS class_name,
        ay.name AS academic_year_name
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN student_academic_records ar ON ar.student_id = s.id
      LEFT JOIN grades g ON g.id = ar.grade_id
      LEFT JOIN classes c ON c.id = ar.class_id
      LEFT JOIN academic_years ay ON ay.id = ar.academic_year_id
      WHERE s.id = ?
      ORDER BY ar.academic_year_id DESC, ar.id DESC
      LIMIT 1`,
      [studentId]
    );

    if (srows.length === 0) return res.status(404).json({ error: 'Student not found' });
    const student = srows[0];

    // parents
    // const [parents] = await db.execute(
    //   `SELECT p.*, u.id AS user_id, u.name AS user_name, u.email AS user_email
    //    FROM parent_children pc
    //    JOIN parents p ON p.id = pc.parent_id
    //    JOIN users u ON u.id = p.user_id
    //    WHERE pc.student_id = ?`,
    //   [studentId]
    // );

    // invoices summary (last 5 invoices)
    const [invoices] = await db.execute(
      `SELECT id, period_start, period_end, months_count, amount_due, amount_paid, status, created_at
       FROM student_invoices WHERE student_id = ? ORDER BY created_at DESC LIMIT 10`,
      [studentId]
    );

    // attendance summary: total records, present_count, percent (last 30 days)
    const [attSummary] = await db.execute(
      `SELECT
         COUNT(*) AS total_count,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count
       FROM attendance
       WHERE student_id = ? AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [studentId]
    );
    const total = attSummary[0].total_count || 0;
    const present = attSummary[0].present_count || 0;
    const percent = total === 0 ? null : Math.round((present / total) * 10000) / 100;

    // student.parents = parents;
    student.invoices = invoices;
    student.attendance_summary_30d = { total, present, percent };

    return res.json({ student });
  } catch (err) {
    console.error('GET /api/students/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const DownloadAdmissionForm = async (req, res) => {
  const { id } = req.params;
  const studentId = parseInt(id);

  if (!studentId) return res.status(400).json({ error: "Invalid student id" });

  try {
    const [rows] = await db.execute(
      `SELECT 
        s.*, 
        u.name AS user_name, u.email, u.gender, u.phone, u.avatar_url as user_avatar_url,
        u.address AS user_address,
        u.adhar_no AS user_adhar_no,
        ar.id AS academic_id,
        ar.roll_no,
        ar.grade_id,
        ar.class_id,
        g.name AS grade_name,
        c.name AS class_name,
        ay.name AS academic_year_name
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN student_academic_records ar ON ar.student_id = s.id
      LEFT JOIN grades g ON g.id = ar.grade_id
      LEFT JOIN classes c ON c.id = ar.class_id
      LEFT JOIN academic_years ay ON ay.id = ar.academic_year_id
      WHERE s.id = ?
      ORDER BY ar.academic_year_id DESC, ar.id DESC
      LIMIT 1`,
      [studentId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Student not found" });

    const student = rows[0];
    const pdfBuffer = await generateAdmissionFormPDF(student);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Admission_Form_${student.user_name.replace(/\s+/g, "_")}.pdf`
    );
    return res.end(pdfBuffer);
  } catch (err) {
    console.error("DownloadAdmissionForm error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


/**
 * PUT /api/students/:id
 * Updates student profile and optionally user (name/email/role_id)
 * Body may contain:
 * { first_name?, last_name?, email?, role_id?, admission_no?, roll_no?, date_of_birth?, gender?, grade_id?, class_id?, admission_date?, status?, avatar_url?, parent_contact, contect_no, acadmic_year, mothers_name, fathers_name, address }
 */


const UpdateStudent = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid student id' });

  const {
    name, email, role_id, phone,
    admission_no, roll_no, date_of_birth, gender,
    grade_id, class_id, admission_date, adhar_number, blood_group, mother_contect, father_occupation, status,
    avatar_url: body_avatar_url, parent_contact, academic_year_id, mothers_name, fathers_name, address
  } = req.body;
  const avatar_url = req.file ? req.file.path : body_avatar_url;

  if (
    name === undefined && email === undefined && role_id === undefined && phone === undefined &&
    admission_no === undefined && roll_no === undefined && date_of_birth === undefined && gender === undefined &&
    grade_id === undefined && class_id === undefined && admission_date === undefined && status === undefined &&
    avatar_url === undefined && parent_contact === undefined && academic_year_id === undefined &&
    mothers_name === undefined && fathers_name === undefined && address === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // lock student row
    const [srows] = await conn.execute(`SELECT * FROM students WHERE id = ? FOR UPDATE`, [id]);
    if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Student not found' }); }
    const studentRow = srows[0];
    const userId = studentRow.user_id;

    // update user (name/email/role_id)
    const userUpdates = [];
    const userParams = [];
    if (name !== undefined) {
      // fetch current name
      const [uRows] = await conn.execute(`SELECT name FROM users WHERE id = ? FOR UPDATE`, [userId]);
      const currentName = uRows[0] ? uRows[0].name : '';
      let curName = '';
      if (currentName) {
        curName = currentName;
      }
      const newName = name !== undefined ? (name || '').trim() : curName;
      userUpdates.push('name = ?');
      userParams.push(`${newName}`.trim());
    }
    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email || null); }
    if (gender !== undefined) { userUpdates.push('gender = ?'); userParams.push(gender || null); }
    if (role_id !== undefined) { userUpdates.push('role_id = ?'); userParams.push(role_id || null); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone || null); }
    if (address !== undefined) { userUpdates.push('address = ?'); userParams.push(address || null); }
    if (adhar_number !== undefined) { userUpdates.push('adhar_no = ?'); userParams.push(adhar_number || null); }
    if (req.body.password !== undefined && req.body.password !== "") {
      const password_hash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
      userUpdates.push('password_hash = ?');
      userParams.push(password_hash);
    }
    if (avatar_url !== undefined) {
      // 🟢 Delete old avatar from Cloudinary
      const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [userId]);
      if (uRows[0] && uRows[0].avatar_url) {
        await deleteFromCloudinary(uRows[0].avatar_url);
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(avatar_url || null);
    }
    if (userUpdates.length > 0) {
      userParams.push(userId);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // update student fields (personal details only)
    const sUpdates = [];
    const sParams = [];
    if (admission_no !== undefined) { sUpdates.push('admission_no = ?'); sParams.push(admission_no || null); }
    // roll_no is now in academic records
    if (date_of_birth !== undefined) { sUpdates.push('date_of_birth = ?'); sParams.push(date_of_birth || null); }
    // grade_id is now in academic records
    // class_id is now in academic records
    if (admission_date !== undefined) { sUpdates.push('admission_date = ?'); sParams.push(admission_date || null); }
    // if (adhar_number !== undefined) { sUpdates.push('adhar_number = ?'); sParams.push(adhar_number || null); }
    if (blood_group !== undefined) { sUpdates.push('blood_group = ?'); sParams.push(blood_group || null); }
    if (mother_contect !== undefined) { sUpdates.push('mother_contect = ?'); sParams.push(mother_contect || null); }
    if (father_occupation !== undefined) { sUpdates.push('father_occupation = ?'); sParams.push(father_occupation || null); }
    if (status !== undefined) { sUpdates.push('status = ?'); sParams.push(status || null); }
    if (parent_contact !== undefined) { sUpdates.push('parent_contact = ?'); sParams.push(parent_contact || null); }
    // acadmic_year is now in academic records
    if (mothers_name !== undefined) { sUpdates.push('mothers_name = ?'); sParams.push(mothers_name || null); }
    if (fathers_name !== undefined) { sUpdates.push('fathers_name = ?'); sParams.push(fathers_name || null); }
    // if (address !== undefined) { sUpdates.push('address = ?'); sParams.push(address || null); }

    if (sUpdates.length > 0) {
      sParams.push(id);
      await conn.execute(`UPDATE students SET ${sUpdates.join(', ')} WHERE id = ?`, sParams);
    }

    // update academic records (grade/class/roll_no/academic_year)
    // strategy: find the latest academic record for this student and update it.
    // If acadmic_year is being updated, it might mean we need to find THAT specific record or update the latest one.
    // simpler approach: update the LATEST academic record for this student.
    const hasAcademicUpdates = (grade_id !== undefined || class_id !== undefined || roll_no !== undefined || academic_year_id !== undefined);

    if (hasAcademicUpdates) {
      // get latest record
      const [recs] = await conn.execute(
        `SELECT id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
        [id]
      );

      if (recs.length > 0) {
        const recId = recs[0].id;
        const aUpdates = [];
        const aParams = [];

        if (grade_id !== undefined) { aUpdates.push('grade_id = ?'); aParams.push(grade_id || null); }
        if (class_id !== undefined) { aUpdates.push('class_id = ?'); aParams.push(class_id || null); }
        if (roll_no !== undefined) { aUpdates.push('roll_no = ?'); aParams.push(roll_no || null); }
        if (academic_year_id !== undefined) { aUpdates.push('academic_year_id = ?'); aParams.push(academic_year_id || null); }

        if (aUpdates.length > 0) {
          aParams.push(recId);
          await conn.execute(`UPDATE student_academic_records SET ${aUpdates.join(', ')} WHERE id = ?`, aParams);
        }
      } else {
        // No academic record exists? Should not happen for valid students, but if it does, insert one?
        // For now, let's assume it exists if student exists, or we skip.
        // Optionally we could INSERT if missing, but we need mandatory fields like academic_year_id.
      }
    }

    await conn.commit();

    // return updated student
    const [updatedRows] = await conn.execute(
      `SELECT s.*, u.id AS user_id, u.name AS user_name, u.email AS user_email, u.gender AS user_gender,
              ar.grade_id, g.name AS grade_name, ar.class_id, c.name AS class_name, ar.roll_no, ar.academic_year_id
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_academic_records ar ON ar.student_id = s.id
       LEFT JOIN grades g ON g.id = ar.grade_id
       LEFT JOIN classes c ON c.id = ar.class_id
       WHERE s.id = ?
       ORDER BY ar.academic_year_id DESC, ar.id DESC
       LIMIT 1`,
      [id]
    );

    return res.json({ student: updatedRows[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('PUT /api/students/:id error', err);
    if (req.file) await deleteFromCloudinary(req.file.path);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email or admission_no conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



const UpdateStudentPassword = async (req, res) => {
  const id = toInt(req.params.id);
  const { current_password, new_password } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid student id' });
  if (!isNonEmptyString(new_password) || new_password.length < 6) return res.status(400).json({ error: 'new_password required (min 6 chars)' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [srows] = await conn.execute(`SELECT user_id FROM students WHERE id = ? FOR UPDATE`, [id]);
    if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Student not found' }); }
    const userId = srows[0].user_id;

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
    return res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/students/:id/password error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const DeleteStudent = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid student id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [srows] = await conn.execute(`SELECT user_id FROM students WHERE id = ? FOR UPDATE`, [id]);
    if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Student not found' }); }
    const userId = srows[0].user_id;

    const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [userId]);
    const avatarUrl = uRows[0] ? uRows[0].avatar_url : null;

    // delete parent_children links first (optional)
    await conn.execute(`DELETE FROM parent_children WHERE student_id = ?`, [id]);

    // delete student row
    await conn.execute(`DELETE FROM students WHERE id = ?`, [id]);

    // delete user row
    await conn.execute(`DELETE FROM users WHERE id = ?`, [userId]);

    // 🟢 Delete avatar from Cloudinary
    if (avatarUrl) {
      await deleteFromCloudinary(avatarUrl);
    }

    await conn.commit();
    return res.json({ success: true, deleted_student_id: id });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/students/:id error', err);
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({ error: 'Student cannot be deleted because referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


/* ===== Parent / child relations ===== */

/**
 * POST /api/students/:id/parents
 * Body: { parent_ids: [1,2] }  (parent table ids)
 */

const AddParentOnStudent = async (req, res) => {
  const id = toInt(req.params.id);
  const parentIds = Array.isArray(req.body.parent_ids) ? req.body.parent_ids.map(Number).filter(Boolean) : [];
  if (!id) return res.status(400).json({ error: 'Invalid student id' });
  if (parentIds.length === 0) return res.status(400).json({ error: 'parent_ids array required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ensure student exists
    const [srows] = await conn.execute(`SELECT id FROM students WHERE id = ? FOR UPDATE`, [id]);
    if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Student not found' }); }

    const pairs = parentIds.map(() => '(?, ?)').join(', ');
    const params = [];
    parentIds.forEach(pid => params.push(pid, id));

    await conn.execute(`INSERT IGNORE INTO parent_children (parent_id, student_id) VALUES ${pairs}`, params);

    await conn.commit();
    return res.json({ success: true, linked_parent_ids: parentIds });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/students/:id/parents error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


/**
 * DELETE /api/students/:id/parents/:parent_id
 */

const DeleteParentOnStudent = async (req, res) => {
  const id = toInt(req.params.id);
  const parentId = toInt(req.params.parent_id);
  if (!id || !parentId) return res.status(400).json({ error: 'Invalid id or parent_id' });

  try {
    const [result] = await db.execute(`DELETE FROM parent_children WHERE parent_id = ? AND student_id = ?`, [parentId, id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Parent-child link not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/students/:id/parents/:parent_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



/* ===== Student invoices and attendance endpoints (helpers) ===== */

/**
 * GET /api/students/:id/invoices
 * List invoices for a student
 */

const GetStudentInvoice = async (req, res) => {
  const id = toInt(req.params.id);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  if (!id) return res.status(400).json({ error: 'Invalid student id' });

  try {
    const [ar] = await db.execute(
      `SELECT id FROM student_academic_records
      WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
      ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
      [id]
    );

    if (!ar.length) return res.json({ studentInvoice: [] });

    const academicId = ar[0].id;

    const [rows] = await db.execute(
      `SELECT si.*, c.name AS class_name
       FROM student_invoices si
       LEFT JOIN classes c ON c.id = si.class_id
       WHERE si.student_academic_id = ?
       ORDER BY si.created_at DESC
       LIMIT ? OFFSET ?`,
      [academicId, limit, offset]
    );
    return res.json({ invoices: rows });
  } catch (err) {
    console.error('GET /api/students/:id/invoices error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * GET /api/students/:id/attendance
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */

const GetAttendenceForStudent = async (req, res) => {
  const id = toInt(req.params.id);
  const userId = req.user.id;
  if (!userId) return res.status(400).json({ error: 'Invalid student id' });
  const from = req.query.from || null;
  const to = req.query.to || null;

  try {
    const [ar] = await db.execute(
      `SELECT id FROM student_academic_records
      WHERE student_id = (SELECT id FROM students WHERE user_id = ?)
      ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
      [userId]
    );

    if (!ar.length) return res.json({ attendance: [] });

    const academicId = ar[0].id;

    let sql = `SELECT date, status, class_id, lesson_id, recorded_at FROM attendance WHERE student_id = ?`;
    const params = [academicId];
    if (from && to) { sql += ' AND date BETWEEN ? AND ?'; params.push(from, to); }
    else if (from) { sql += ' AND date >= ?'; params.push(from); }
    else if (to) { sql += ' AND date <= ?'; params.push(to); }

    sql += ' ORDER BY date DESC';

    const [rows] = await db.execute(sql, params);
    return res.json({ attendance: rows });
  } catch (err) {
    console.error('GET /api/students/:id/attendance error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



const GetStudentsByClassId = async (req, res) => {
  const classId = toInt(req.params.classId);
  let academicYearId = toInt(req.query.academic_year_id);

  // Handle "NaN" or "undefined" string from frontend
  if (isNaN(academicYearId)) academicYearId = null;

  if (!classId) return res.status(400).json({ error: 'Invalid class id' });
  try {

    // 2️⃣ get supervised class
    const [crows] = await db.execute(
      `SELECT id, name FROM classes WHERE id = ?`,
      [classId]
    );

    if (crows.length === 0) {
      return res.status(404).json({ error: 'No class found' });
    }

    // 3️⃣ get students of that class
    let sql = `SELECT 
         s.id AS student_id,
         sar.roll_no,
         sar.id AS student_academic_id,
         u.gender,
         u.name AS student_name,
         u.avatar_url AS user_avatar_url,
         u.email AS student_email,
         u.address AS user_address,
         u.adhar_no AS user_adhar_no,
         c.name AS class_name,
         g.name AS grade_name
       FROM student_academic_records sar
       JOIN students s ON s.id = sar.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN classes c ON c.id = sar.class_id
       LEFT JOIN grades g ON g.id = sar.grade_id
       WHERE sar.class_id = ?`;

    const params = [classId];

    if (academicYearId) {
      sql += ` AND sar.academic_year_id = ?`;
      params.push(academicYearId);
    } else {
      // If no year specified, get only from the latest year for each student
      sql += ` AND sar.id IN (
        SELECT MAX(id) FROM student_academic_records GROUP BY student_id
      )`;
    }

    sql += ` ORDER BY sar.roll_no ASC`;

    const [students] = await db.execute(sql, params);

    return res.json({
      class: crows[0],
      students
    });
  } catch (err) {
    console.error('GET /api/students/class/:classId error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const GetStudentSubjects = async (req, res) => {
  const userId = req.user.id;
  try {
    // 1. Find grade_id from any available source
    // Try student_academic_records first (active)
    let [rows] = await db.execute(
      `SELECT sar.grade_id 
       FROM student_academic_records sar
       JOIN students s ON s.id = sar.student_id
       WHERE s.user_id = ?`,
      [userId]
    );

    let gradeId = rows.length > 0 ? rows[0].grade_id : null;

    // If not found in academic records, check students table as fallback
    if (!gradeId) {
      [rows] = await db.execute(
        `SELECT grade_id FROM student_academic_records WHERE student_id = ?`,
        [userId]
      );
      gradeId = rows.length > 0 ? rows[0].grade_id : null;
    }

    if (!gradeId) {
      return res.json({ subjects: [] });
    }

    // 2. Get subjects assigned to this grade
    const [subjects] = await db.execute(
      `SELECT s.* 
       FROM grade_subjects gs 
       JOIN subjects s ON s.id = gs.subject_id 
       WHERE gs.grade_id = ?`,
      [gradeId]
    );

    return res.json({ subjects });
  } catch (err) {
    console.error('GetStudentSubjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  AddStudent,
  GetStudent,
  GetStudentById,
  UpdateStudent,
  UpdateStudentPassword,
  DeleteStudent,
  AddParentOnStudent,
  DeleteParentOnStudent,
  GetStudentInvoice,
  GetAttendenceForStudent,
  GetStudentsByClassId,
  GetStudentSubjects,
  DownloadAdmissionForm
};