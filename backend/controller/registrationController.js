const db = require("../db");
const bcrypt = require('bcryptjs');
const { generateNextId } = require("../utils/idGenerator");
const formatMySQLDate = require("../config/deateConverter");

const SALT_ROUNDS = 10;

/**
 * Initialize table automatically
 */
const initTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS registration_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_type ENUM('student','teacher','staff') NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        is_approved BOOLEAN DEFAULT FALSE,
        approved_by INT DEFAULT NULL,
        approved_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        adhar_no VARCHAR(50) DEFAULT NULL,
        data JSON DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.query(query);
    console.log("Initialized registration_requests table successfully.");
  } catch (err) {
    console.error("Error initializing registration_requests table:", err.message);
  }
};

// Run automatically
initTable();

/**
 * Public endpoint: Register Student
 */
const registerStudent = async (req, res) => {
  try {
    const { name, email, password, phone, adhar_no } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    // Duplicate checks
    const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != '')", [email.trim(), adhar_no?.trim() || '']);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "An account with this email or Aadhaar number already exists in the system." });
    }

    const [existingReqs] = await db.query("SELECT id FROM registration_requests WHERE status = 'pending' AND (email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != ''))", [email.trim(), adhar_no?.trim() || '']);
    if (existingReqs.length > 0) {
      return res.status(409).json({ error: "A registration request with this email or Aadhaar number is already pending review." });
    }

    // Hash password
    const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);

    // Save request
    const payload = { ...req.body, password_hash };
    delete payload.password; // Do not save plain password in JSON

    const [result] = await db.execute(
      `INSERT INTO registration_requests (registration_type, status, name, email, phone, adhar_no, data) VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      ['student', name.trim(), email.trim(), phone?.trim() || null, adhar_no?.trim() || null, JSON.stringify(payload)]
    );

    return res.status(201).json({ success: true, message: "Student registration submitted successfully. Awaiting administration review.", id: result.insertId });
  } catch (err) {
    console.error("registerStudent error:", err);
    return res.status(500).json({ error: "Internal server error submitting registration." });
  }
};

/**
 * Public endpoint: Register Teacher
 */
const registerTeacher = async (req, res) => {
  try {
    const { name, email, password, phone, adhar_no } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    // Duplicate checks
    const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != '')", [email.trim(), adhar_no?.trim() || '']);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "An account with this email or Aadhaar number already exists in the system." });
    }

    const [existingReqs] = await db.query("SELECT id FROM registration_requests WHERE status = 'pending' AND (email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != ''))", [email.trim(), adhar_no?.trim() || '']);
    if (existingReqs.length > 0) {
      return res.status(409).json({ error: "A registration request with this email or Aadhaar number is already pending review." });
    }

    const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const payload = { ...req.body, password_hash };
    delete payload.password;

    const [result] = await db.execute(
      `INSERT INTO registration_requests (registration_type, status, name, email, phone, adhar_no, data) VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      ['teacher', name.trim(), email.trim(), phone?.trim() || null, adhar_no?.trim() || null, JSON.stringify(payload)]
    );

    return res.status(201).json({ success: true, message: "Teacher registration submitted successfully. Awaiting administration review.", id: result.insertId });
  } catch (err) {
    console.error("registerTeacher error:", err);
    return res.status(500).json({ error: "Internal server error submitting registration." });
  }
};

/**
 * Public endpoint: Register Staff
 */
const registerStaff = async (req, res) => {
  try {
    const { name, email, password, phone, adhar_no } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    // Duplicate checks
    const [existingUsers] = await db.query("SELECT id FROM users WHERE email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != '')", [email.trim(), adhar_no?.trim() || '']);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: "An account with this email or Aadhaar number already exists in the system." });
    }

    const [existingReqs] = await db.query("SELECT id FROM registration_requests WHERE status = 'pending' AND (email = ? OR (adhar_no = ? AND adhar_no IS NOT NULL AND adhar_no != ''))", [email.trim(), adhar_no?.trim() || '']);
    if (existingReqs.length > 0) {
      return res.status(409).json({ error: "A registration request with this email or Aadhaar number is already pending review." });
    }

    const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const payload = { ...req.body, password_hash };
    delete payload.password;

    const [result] = await db.execute(
      `INSERT INTO registration_requests (registration_type, status, name, email, phone, adhar_no, data) VALUES (?, 'pending', ?, ?, ?, ?, ?)`,
      ['staff', name.trim(), email.trim(), phone?.trim() || null, adhar_no?.trim() || null, JSON.stringify(payload)]
    );

    return res.status(201).json({ success: true, message: "Staff registration submitted successfully. Awaiting administration review.", id: result.insertId });
  } catch (err) {
    console.error("registerStaff error:", err);
    return res.status(500).json({ error: "Internal server error submitting registration." });
  }
};

/**
 * Admin: Get Registrations list
 */
const getRegistrations = async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const type = req.query.type || '';
    const status = req.query.status || '';
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 500);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const params = [q, q, q];
    let typeClause = "";
    if (type && ['student', 'teacher', 'staff'].includes(type)) {
      typeClause = " AND registration_type = ? ";
      params.push(type);
    }

    let statusClause = "";
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      statusClause = " AND status = ? ";
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM registration_requests WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) ${typeClause} ${statusClause}`;
    const [cntRows] = await db.query(countQuery, params);
    const total = cntRows[0]?.total || 0;

    const selectQuery = `SELECT id, registration_type, status, is_approved, approved_by, approved_at, created_at, name, email, phone, adhar_no, data FROM registration_requests WHERE (name LIKE ? OR email LIKE ? OR phone LIKE ?) ${typeClause} ${statusClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const [rows] = await db.query(selectQuery, [...params, limit, offset]);

    return res.json({ total, limit, offset, data: rows });
  } catch (err) {
    console.error("getRegistrations error:", err);
    return res.status(500).json({ error: "Internal server error fetching registrations." });
  }
};

/**
 * Admin: Approve Single Request
 */
const approveRegistration = async (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  if (!reqId) return res.status(400).json({ error: "Invalid registration ID." });

  const adminId = req.user?.id || null; // Auth middleware attaches req.user
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.execute("SELECT * FROM registration_requests WHERE id = ? FOR UPDATE", [reqId]);
    if (reqRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Registration request not found." });
    }

    const record = reqRows[0];
    if (record.status === 'approved' || record.is_approved) {
      await conn.rollback();
      return res.status(400).json({ error: "Request is already approved." });
    }

    const data = typeof record.data === 'string' ? JSON.parse(record.data) : (record.data || {});
    const { name, email, password_hash, phone, gender, adhar_no, address } = data;

    // Check if email already exists in users
    const [existingUsers] = await conn.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: `User with email ${email} already exists in production database.` });
    }

    if (record.registration_type === 'student') {
      // Setup Student Role
      const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('student', 'Student') LIMIT 1");
      const studentRoleId = rolesRows.length > 0 ? rolesRows[0].id : 1;

      // Handle custom id generation prefix
      const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key = "admission_no_prefix"');
      const admissionPrefix = settingsRows[0]?.setting_value;

      let finalAdmissionNo = data.admission_no;
      if (!finalAdmissionNo && admissionPrefix) {
        finalAdmissionNo = await generateNextId(admissionPrefix, 'students', 'admission_no');
      }

      // 1) User Entry
      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, email, gender?.toLowerCase() || 'other', password_hash, studentRoleId, phone || null, adhar_no || null, address || null]
      );
      const userId = userRes.insertId;

      // Resolve relational ids
      let gradeId = data.grade_id || data.grade;
      let classId = data.class_id || data.class || data.className;
      let ayId = data.academic_year_id || data.academic_year;

      if (gradeId && isNaN(Number(gradeId))) {
        const [rows] = await conn.execute('SELECT id FROM grades WHERE name LIKE ? LIMIT 1', [`%${gradeId}%`]);
        if (rows.length > 0) gradeId = rows[0].id;
      } else if (gradeId) { gradeId = Number(gradeId); }

      if (classId && isNaN(Number(classId))) {
        const [rows] = await conn.execute('SELECT id FROM classes WHERE name LIKE ? LIMIT 1', [`%${classId}%`]);
        if (rows.length > 0) classId = rows[0].id;
      } else if (classId) { classId = Number(classId); }

      if (ayId && isNaN(Number(ayId))) {
        const [rows] = await conn.execute('SELECT id FROM academic_years WHERE name LIKE ? LIMIT 1', [`%${ayId}%`]);
        if (rows.length > 0) ayId = rows[0].id;
      } else if (ayId) { ayId = Number(ayId); }

      // Safe fallbacks
      if (!gradeId) {
        const [rows] = await conn.execute('SELECT id FROM grades LIMIT 1');
        gradeId = rows.length > 0 ? rows[0].id : 1;
      }
      if (!classId) {
        const [rows] = await conn.execute('SELECT id FROM classes LIMIT 1');
        classId = rows.length > 0 ? rows[0].id : 1;
      }
      if (!ayId) {
        const [rows] = await conn.execute('SELECT id FROM academic_years LIMIT 1');
        ayId = rows.length > 0 ? rows[0].id : 1;
      }

      // 2) Students Entry
      await conn.execute(
        `INSERT INTO students (id, user_id, admission_no, date_of_birth, admission_date, blood_group, mother_contect, father_occupation, status, parent_contact, mothers_name, fathers_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
        [
          userId, userId, finalAdmissionNo || null,
          formatMySQLDate(data.date_of_birth),
          formatMySQLDate(data.admission_date || new Date()),
          data.blood_group || null,
          data.mother_contact || data.mother_contect || null,
          data.father_occupation || null,
          data.parent_contact || null,
          data.mothers_name || null,
          data.fathers_name || null
        ]
      );

      // 3) Academic Record Entry
      await conn.execute(
        `INSERT INTO student_academic_records (student_id, academic_year_id, grade_id, class_id, roll_no, result_status, created_at)
         VALUES (?, ?, ?, ?, ?, 'pass', NOW())`,
        [userId, ayId, gradeId, classId, data.roll_no || null]
      );

    } else if (record.registration_type === 'teacher') {
      const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('teacher', 'Teacher') LIMIT 1");
      const teacherRoleId = rolesRows.length > 0 ? rolesRows[0].id : 2;

      const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
      const employeePrefix = settingsRows[0]?.setting_value;

      let finalEmployeeCode = data.employee_code;
      if (!finalEmployeeCode && employeePrefix) {
        finalEmployeeCode = await generateNextId(employeePrefix, 'teachers', 'employee_code');
      }

      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, email, gender?.toLowerCase() || 'other', password_hash, teacherRoleId, phone || null, adhar_no || null, address || null]
      );
      const userId = userRes.insertId;

      await conn.execute(
        `INSERT INTO teachers (id, user_id, employee_code, hire_date, qualification, bio) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, userId, finalEmployeeCode || null, formatMySQLDate(data.hire_date || new Date()), data.qualification || null, data.bio || null]
      );

    } else if (record.registration_type === 'staff') {
      const { sub_role, department } = data;
      
      // Smart lookup of specific sub_role ID if available
      let staffRoleId = 4;
      if (sub_role) {
        const [specRoles] = await conn.execute("SELECT id FROM roles WHERE role_name = ? LIMIT 1", [sub_role]);
        if (specRoles.length > 0) {
          staffRoleId = specRoles[0].id;
        } else {
          const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('staff', 'Staff') LIMIT 1");
          if (rolesRows.length > 0) staffRoleId = rolesRows[0].id;
        }
      } else {
        const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('staff', 'Staff') LIMIT 1");
        if (rolesRows.length > 0) staffRoleId = rolesRows[0].id;
      }

      const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
      const employeePrefix = settingsRows[0]?.setting_value;

      let finalEmployeeCode = data.employee_code;
      if (!finalEmployeeCode && employeePrefix) {
        finalEmployeeCode = await generateNextId(employeePrefix, 'staff', 'employee_code');
      }

      const [userRes] = await conn.execute(
        `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, email, gender?.toLowerCase() || 'other', password_hash, staffRoleId, phone || null, adhar_no || null, address || null]
      );
      const userId = userRes.insertId;

      await conn.execute(
        `INSERT INTO staff (id, user_id, employee_code, department, sub_role) VALUES (?, ?, ?, ?, ?)`,
        [userId, userId, finalEmployeeCode || null, department || null, sub_role || 'General Staff']
      );
    }

    // Update request state
    await conn.execute(
      "UPDATE registration_requests SET status = 'approved', is_approved = TRUE, approved_by = ?, approved_at = NOW() WHERE id = ?",
      [adminId, reqId]
    );

    await conn.commit();
    return res.json({ success: true, message: `Registration request approved and user successfully migrated to system.` });
  } catch (err) {
    await conn.rollback();
    console.error("approveRegistration error:", err);
    return res.status(500).json({ error: "Internal server error during approval process.", details: err.message });
  } finally {
    conn.release();
  }
};

/**
 * Admin: Bulk Approve Requests
 */
const bulkApproveRegistrations = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Array of registration IDs is required." });
  }

  const results = { success: 0, failed: 0, errors: [] };
  // Reuse single approval logic via API-level loop or individual connection blocks to ensure transaction independence per item
  for (const id of ids) {
    // Construct dummy req/res objects to leverage approveRegistration function directly
    let isError = false;
    let errMsg = "";
    const dummyRes = {
      status: (code) => ({
        json: (msg) => { isError = code >= 400; errMsg = msg.error || msg.details || "Error"; return msg; }
      }),
      json: (msg) => { isError = false; return msg; }
    };
    const dummyReq = { params: { id }, user: req.user };

    await approveRegistration(dummyReq, dummyRes);
    if (isError) {
      results.failed++;
      results.errors.push({ id, error: errMsg });
    } else {
      results.success++;
    }
  }

  const message = results.failed === 0 ? "Bulk approval completed successfully!" : "Bulk approval completed with some errors.";
  return res.json({ message, results });
};

/**
 * Admin: Delete or Reject Request
 */
const deleteRegistration = async (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  if (!reqId) return res.status(400).json({ error: "Invalid registration ID." });

  const { action } = req.query; // action=reject or delete

  try {
    if (action === 'reject') {
      const [result] = await db.execute("UPDATE registration_requests SET status = 'rejected' WHERE id = ?", [reqId]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Request not found." });
      return res.json({ success: true, message: "Registration request rejected successfully." });
    } else {
      const [result] = await db.execute("DELETE FROM registration_requests WHERE id = ?", [reqId]);
      if (result.affectedRows === 0) return res.status(404).json({ error: "Request not found." });
      return res.json({ success: true, message: "Registration request deleted successfully." });
    }
  } catch (err) {
    console.error("deleteRegistration error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  initTable,
  registerStudent,
  registerTeacher,
  registerStaff,
  getRegistrations,
  approveRegistration,
  bulkApproveRegistrations,
  deleteRegistration
};
