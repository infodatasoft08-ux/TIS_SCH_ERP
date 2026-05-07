const db = require("../db");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { deleteFromCloudinary } = require("../helper/cloudinaryHelper");
const { generateNextId } = require("../utils/idGenerator");
const axios = require('axios');
require('dotenv').config();

const SALT_ROUNDS = 10;
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));


const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email & password required" });
  }

  const conn = await db.getConnection();

  try {
    const [rows] = await conn.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.Email,
      role_id: user.role_id,
      phone: user.phone,
      gender: user.gender,
      avatar_url: user.avatar_url,
    };

    /* =======================
       STUDENT LOGIN
    ======================= */
    if (user.role_id === 1) {
      // get student id
      const [srows] = await conn.query(
        "SELECT id FROM students WHERE user_id = ?",
        [user.id]
      );

      if (srows.length) {
        const studentId = srows[0].id;

        // get latest academic record
        const [ar] = await conn.query(
          `SELECT id, class_id, grade_id
           FROM student_academic_records
           WHERE student_id = ?
           ORDER BY academic_year_id DESC, id DESC
           LIMIT 1`,
          [studentId]
        );

        if (ar.length) {
          userResponse.student_id = studentId;
          userResponse.academic_id = ar[0].id;
          userResponse.class_id = ar[0].class_id;
          userResponse.grade_id = ar[0].grade_id;

          // get student details
          const [sdetails] = await conn.query(
            `SELECT * FROM students WHERE id = ?`,
            [studentId]
          );

          if (sdetails.length) {
            userResponse.student_date = sdetails[0];
          }
        }
      }
    }

    /* =======================
       TEACHER LOGIN
    ======================= */
    else if (user.role_id === 2) {
      const [classes] = await conn.query(
        `SELECT id, name
         FROM classes
         WHERE supervisor_teacher_id = ?`,
        [user.id]
      );

      userResponse.supervised_classes = classes || [];

      if (classes.length) {
        userResponse.class_id = classes[0].id; // backward compatibility
      }
    }

    /* =======================
       JWT PAYLOAD
    ======================= */
    const tokenPayload = {
      id: user.id,
      name: user.name,
      role_id: user.role_id,
      email: user.email
    };

    if (userResponse.class_id) tokenPayload.class_id = userResponse.class_id;
    if (userResponse.academic_id) tokenPayload.academic_id = userResponse.academic_id;
    if (userResponse.student_id) tokenPayload.student_id = userResponse.student_id;

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};

const googleLogin = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "email required" });
  }

  const conn = await db.getConnection();

  try {
    const [rows] = await conn.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      return res.status(400).json({ message: "No account found with this email" });
    }

    const user = rows[0];

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.Email,
      role_id: user.role_id,
      phone: user.phone,
      gender: user.gender,
      avatar_url: user.avatar_url,
    };

    if (user.role_id === 1) {
      const [srows] = await conn.query("SELECT id FROM students WHERE user_id = ?", [user.id]);
      if (srows.length) {
        const studentId = srows[0].id;
        const [ar] = await conn.query(
          `SELECT id, class_id, grade_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
          [studentId]
        );
        if (ar.length) {
          userResponse.student_id = studentId;
          userResponse.academic_id = ar[0].id;
          userResponse.class_id = ar[0].class_id;
          userResponse.grade_id = ar[0].grade_id;
          const [sdetails] = await conn.query(`SELECT * FROM students WHERE id = ?`, [studentId]);
          if (sdetails.length) {
            userResponse.student_date = sdetails[0];
          }
        }
      }
    } else if (user.role_id === 2) {
      const [classes] = await conn.query(`SELECT id, name FROM classes WHERE supervisor_teacher_id = ?`, [user.id]);
      userResponse.supervised_classes = classes || [];
      if (classes.length) {
        userResponse.class_id = classes[0].id;
      }
    }

    const tokenPayload = {
      id: user.id,
      name: user.name,
      role_id: user.role_id,
      email: user.email
    };

    if (userResponse.class_id) tokenPayload.class_id = userResponse.class_id;
    if (userResponse.academic_id) tokenPayload.academic_id = userResponse.academic_id;
    if (userResponse.student_id) tokenPayload.student_id = userResponse.student_id;

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: userResponse
    });

  } catch (err) {
    console.error("GOOGLE LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
};


const logout = async (req, res) => {
  try {
    // Token is deleted on frontend
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const otpGenerator = require('otp-generator');

// In-memory OTP store (email -> { otp, expiresAt, verified })
const otpStore = new Map();
const apiKey = process.env.BREVO_API_KEY;
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Premium OTP Email Template
 */
const getOtpHtmlTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; color: #1a202c; margin: 0; padding: 0; line-height: 1.6; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7fb; padding-bottom: 40px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; margin-top: 40px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 48px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.025em; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 16px; }
    .content { padding: 40px; text-align: center; }
    .content h2 { margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; }
    .content p { color: #475569; font-size: 16px; margin-bottom: 24px; }
    .otp-container { background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 32px; margin: 32px 0; }
    .otp-code { font-size: 42px; font-weight: 800; color: #1e40af; letter-spacing: 10px; margin: 0; font-family: 'Courier New', Courier, monospace; }
    .expiry-text { font-size: 14px; color: #64748b; margin-top: 16px; }
    .footer { padding: 32px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9; }
    .footer p { margin: 4px 0; color: #94a3b8; font-size: 13px; }
    .warning-box { margin-top: 32px; padding: 16px; background-color: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; text-align: left; }
    .warning-box p { margin: 0; font-size: 13px; color: #92400e; }
    .social-links { margin-top: 20px; }
    .social-links a { color: #3b82f6; text-decoration: none; margin: 0 10px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>NIYATI PUBLIC SCHOOL</h1>
        <p>Welcome to Niyati Public School</p>
      </div>
      <div class="content">
        <h2>Verify Your Identity</h2>
        <p>We received a request to reset your password. Please use the following one-time password (OTP) to complete the process.</p>
        
        <div class="otp-container">
          <h1 class="otp-code">${otp}</h1>
          <p class="expiry-text">Valid for 10 minutes</p>
        </div>
        
        <p>If you didn't make this request, you can safely ignore this email or contact support if you have concerns.</p>
        
        <div class="warning-box">
          <p><strong>Security Note:</strong> Never share this OTP with anyone, including our staff. We will never ask for your code over the phone or email.</p>
        </div>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} NIYATI PUBLIC SCHOOL. All rights reserved.</p>
        <p>Quality Education</p>
        <div class="social-links">
          <a href="#">Support</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

async function sendViaBrevo({ to, subject, html }) {
  const payload = {
    sender: { name: 'NIYATI PUBLIC SCHOOL', email: process.env.MY_EMAIL },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };

  try {
    const res = await axios.post(BREVO_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      timeout: 10000
    });
    return res.data;
  } catch (error) {
    console.error('Brevo API Error:', error.response ? error.response.data : error.message);
    throw error;
  }
}

const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.execute('SELECT * FROM users WHERE email = ?', [email]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now

    otpStore.set(email, { otp, expiresAt, verified: false });

    try {
      await sendViaBrevo({
        to: email,
        subject: 'Password Reset OTP - NIYATI PUBLIC SCHOOL',
        html: getOtpHtmlTemplate(otp)
      });
      res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
      console.error('Error sending OTP via Brevo:', error);
      // Fallback for development if needed, or return error
      res.status(500).json({
        success: false,
        message: 'Failed to send email OTP',
        error: error.message,
        otpDev: otp // Only if you want to keep this for dev
      });
    }
  } catch (err) {
    console.error('sendOtp error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });

  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // Mark as verified
  otpStore.set(email, { ...record, verified: true });
  res.json({ success: true, message: 'OTP verified successfully' });
};

const forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(newPassword) || newPassword.length < 6) {
    return res.status(400).json({ error: 'email and newPassword required (min 6 chars)' });
  }

  const record = otpStore.get(email);
  if (!record || !record.verified) {
    return res.status(400).json({ error: 'OTP not verified or expired' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [uRows] = await conn.execute(`SELECT id, password_hash FROM users WHERE email = ? FOR UPDATE`, [email]);
    if (uRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = uRows[0].id;
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userId]);

    // Clear the OTP record after successful reset
    otpStore.delete(email);

    await conn.commit();
    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('forgotPassword error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

// register (admin or teacher) - protected if needed; for simplicity allow open
const AddStaffUser = async (req, res) => {
  try {
    const { name, email, gender, password, phone, role_id, sub_role, hire_date, employee_code, department, bio, qualification, address, adhar_no } = req.body || {};
    const avatar_url = req.file ? req.file.path : null;

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(gender) ||
      !isNonEmptyString(password) ||
      !toInt(role_id) ||
      !isNonEmptyString(sub_role) ||
      !isNonEmptyString(phone) ||
      !isNonEmptyString(employee_code) ||
      !isNonEmptyString(department) ||
      !isNonEmptyString(adhar_no)
    ) {
      if (avatar_url) await deleteFromCloudinary(avatar_url);
      return res
        .status(400)
        .json({ error: "name, email, gender, password, phone and role_id, employee_code, department, adhar_no are required" });
    }
    if (password.length < 6) {
      if (avatar_url) await deleteFromCloudinary(avatar_url);
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }
    const [rows] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(400).json({ message: 'Email exists' });

    // Dynamic ID Generation for employee_code
    let finalEmployeeCode = employee_code;
    const [settingsRows] = await db.execute('SELECT setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
    if (settingsRows.length > 0 && settingsRows[0].setting_value) {
      finalEmployeeCode = await generateNextId(settingsRows[0].setting_value, 'staff', 'employee_code');
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [userres] = await db.execute('INSERT INTO users (name,email,gender,password_hash,phone,role_id,sub_role,avatar_url,address,adhar_no,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())', [name, email.trim(), gender, password_hash, phone, role_id, sub_role || null, avatar_url || null, address || null, adhar_no || null]);
    const userId = userres.insertId;

    // 2) create staff profile
    const [staffRes] = await db.execute(
      `INSERT INTO staff (id, user_id, employee_code, hire_date, qualification, bio, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userId, finalEmployeeCode || null, hire_date || null, qualification || null, bio || null, department || null]
    );

    // fetch created staff with user info
    const [staffRows] = await db.execute(
      `SELECT s.id AS staff_id, s.user_id, s.employee_code, DATE_FORMAT(s.hire_date, '%Y-%m-%d') AS hire_date, s.qualification, s.bio, s.department,
              u.id AS user_id, u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id
      FROM staff s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
      [staffRes.insertId]
    );
    res.json({ success: true, message: 'Staff created successfully', Staff: staffRows });
  } catch (err) {
    if (avatar_url) await deleteFromCloudinary(avatar_url);
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const GetStaffUsers = async (req, res) => {
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
    // const sql = `
    //   SELECT u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id, u.sub_role
    //   FROM users u
    //   WHERE u.name LIKE ? OR u.email LIKE ? OR u.role_id LIKE ? OR u.sub_role LIKE ?
    //   ORDER BY u.id DESC
    //   LIMIT ${limit} OFFSET ${offset}
    // `;

    const sql = `
      SELECT s.id AS staff_id, s.user_id, s.employee_code, DATE_FORMAT(s.hire_date, '%Y-%m-%d') AS hire_date, s.qualification, s.bio, s.department,
             u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_avatar_url, u.role_id, u.address AS user_address, u.adhar_no AS user_adhar_no
      FROM staff s
      JOIN users u ON u.id = s.user_id
      WHERE u.name LIKE ? OR u.email LIKE ? OR s.employee_code LIKE ? OR u.sub_role LIKE ?
      ORDER BY s.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(sql, [q, q, q, q]);
    // await conn.commit();
    return res.json({ users: rows, limit, offset });
  } catch (err) {
    // await db.rollback();
    console.error('GET /api/accountant error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



const GetStaffUserById = async (req, res) => {
  // const id = toInt(req.params.id);
  const userId = req.user.id;
  if (!userId) return res.status(400).json({ error: 'Invalid staff id' });
  // const conn = await db.getConnection();

  // 1️⃣ get staff
  const [trows] = await db.execute(
    `SELECT id FROM staff WHERE user_id = ?`,
    [userId]
  );

  if (trows.length === 0) {
    return res.status(403).json({ error: 'You are not a staff' });
  }

  const staffId = trows[0].id;

  try {
    // main teacher + user
    // const [trows] = await db.execute(
    //   `SELECT u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id, u.sub_role
    //    FROM users u WHERE u.id = ?`,
    //   [staffId]
    // );
    const [trows] = await db.execute(
      `SELECT s.id AS staff_id, s.user_id, s.employee_code, DATE_FORMAT(s.hire_date, '%Y-%m-%d') AS hire_date, s.qualification, s.bio, s.department,
              u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar_url, u.role_id, u.sub_role, u.address AS user_address, u.adhar_no AS user_adhar_no
       FROM staff s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [staffId]
    );
    if (trows.length === 0) return res.status(404).json({ error: 'Staff not found' });
    const staff = trows[0];
    // await conn.commit();
    return res.json({ staffa: staff });
  } catch (err) {
    // await conn.rollback();
    console.error('GET /api/staff/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



const UpdateStaffUser = async (req, res) => {
  const staff_id = toInt(req.params.staff_id);
  if (!staff_id) return res.status(400).json({ error: 'Invalid Staff id' });

  const { name, email, gender, password, role_id, phone, sub_role, employee_code, hire_date, bio, qualification, department, address, adhar_no } = req.body || {};
  const avatar_url = req.file ? req.file.path : undefined;

  // Check if at least one field is provided for update
  if (
    name === undefined &&
    email === undefined &&
    gender === undefined &&
    password === undefined &&
    role_id === undefined &&
    phone === undefined &&
    sub_role === undefined &&
    employee_code === undefined &&
    hire_date === undefined &&
    bio === undefined &&
    qualification === undefined &&
    department === undefined &&
    avatar_url === undefined &&
    address === undefined &&
    adhar_no === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ensure staff exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM staff WHERE id = ? FOR UPDATE`, [staff_id]);
    if (trows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Staff not found' });
    }
    const staffRow = trows[0];

    // update users table if needed
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) {
      userUpdates.push('name = ?');
      userParams.push(name.trim());
    }

    if (email !== undefined) {
      userUpdates.push('email = ?');
      userParams.push(email || null);
    }
    if (gender !== undefined) {
      userUpdates.push('gender = ?');
      userParams.push(gender || null);
    }
    if (role_id !== undefined) {
      userUpdates.push('role_id = ?');
      userParams.push(role_id || null);
    }
    if (phone !== undefined) {
      userUpdates.push('phone = ?');
      userParams.push(phone || null);
    }
    if (address !== undefined) {
      userUpdates.push('address = ?');
      userParams.push(address || null);
    }
    if (adhar_no !== undefined) {
      userUpdates.push('adhar_no = ?');
      userParams.push(adhar_no || null);
    }
    if (password !== undefined && password !== "") {
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      userUpdates.push('password_hash = ?');
      userParams.push(password_hash);
    }
    if (req.file) {
      // 🟢 Delete old avatar
      const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [staffRow.user_id]);
      if (uRows[0] && uRows[0].avatar_url) {
        await deleteFromCloudinary(uRows[0].avatar_url);
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(req.file.path);
    } else if (avatar_url !== undefined) {
      if (avatar_url === null) {
        const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [staffRow.user_id]);
        if (uRows[0] && uRows[0].avatar_url) {
          await deleteFromCloudinary(uRows[0].avatar_url);
        }
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(avatar_url || null);
    }
    if (sub_role !== undefined) {
      userUpdates.push('sub_role = ?');
      userParams.push(sub_role || null);
    }

    if (userUpdates.length > 0) {
      userParams.push(staffRow.user_id);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    // update staff table fields
    const sUpdates = [];
    const sParams = [];
    if (employee_code !== undefined) { sUpdates.push('employee_code = ?'); sParams.push(employee_code || null); }
    if (hire_date !== undefined) { sUpdates.push('hire_date = ?'); sParams.push(hire_date || null); }
    if (qualification !== undefined) { sUpdates.push('qualification = ?'); sParams.push(qualification || null); }
    if (bio !== undefined) { sUpdates.push('bio = ?'); sParams.push(bio || null); }
    if (department !== undefined) { sUpdates.push('department = ?'); sParams.push(department || null); }

    if (sUpdates.length > 0) {
      // FIXED: Changed 'id' to 'staff_id'
      sParams.push(staff_id);  // Use staff_id instead of undefined 'id'
      await conn.execute(`UPDATE staff SET ${sUpdates.join(', ')} WHERE id = ?`, sParams);
    }

    // Check if any updates were made
    if (userUpdates.length === 0 && sUpdates.length === 0) {
      await conn.commit();
      conn.release();
      return res.json({ message: 'No fields to update' });
    }

    await conn.commit();

    // return updated staff
    const [updatedRows] = await conn.execute(
      `SELECT s.id AS staff_id, s.user_id, s.employee_code, DATE_FORMAT(s.hire_date, '%Y-%m-%d') AS hire_date, s.qualification, s.bio, s.department,
          u.name AS user_name, u.email AS user_email, u.gender AS user_gender, u.phone AS user_phone, u.avatar_url AS user_image, u.role_id, u.sub_role
       FROM staff s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
      [staff_id]
    );

    return res.json({
      message: 'Staff updated successfully',
      user: updatedRows[0]
    });
  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/update/staff/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email or employee_code conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



const DeleteStaffUser = async (req, res) => {
  const staff_id = toInt(req.params.staff_id);
  if (!staff_id) return res.status(400).json({ error: 'Invalid staff id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trows] = await conn.execute(`SELECT user_id FROM staff WHERE id = ? FOR UPDATE`, [staff_id]);
    if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Staff not found' }); }
    const userId = trows[0].user_id;

    const [uRows] = await conn.execute(`SELECT avatar_url FROM users WHERE id = ? FOR UPDATE`, [userId]);
    const avatarUrl = uRows[0] ? uRows[0].avatar_url : null;

    // delete teacher row
    await conn.execute(`DELETE FROM staff WHERE id = ?`, [staff_id]);

    // delete user row (will cascade/clean up depending on your FK design)
    await conn.execute(`DELETE FROM users WHERE id = ?`, [userId]);

    // 🟢 Delete avatar from Cloudinary
    if (avatarUrl) {
      await deleteFromCloudinary(avatarUrl);
    }

    await conn.commit();
    return res.json({ success: true, message: `staff deleted successfuly`, deleted_staff_id: userId });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/staff/:id error', err);
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({ error: 'Staff cannot be deleted because referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}

const UpdateStaffPassword = async (req, res) => {
  const id = toInt(req.params.id);
  const { current_password, new_password } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid staff id' });
  if (!isNonEmptyString(new_password) || new_password.length < 6) return res.status(400).json({ error: 'new_password required (min 6 chars)' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [trows] = await conn.execute(`SELECT user_id FROM staff WHERE id = ? FOR UPDATE`, [id]);
    if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Staff not found' }); }
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


const UpdateAdminUser = async (req, res) => {
  const admin_id = toInt(req.params.admin_id);
  if (!admin_id) return res.status(400).json({ error: 'Invalid admin id' });

  const { name, email, gender, phone, address, adhar_no } = req.body || {};
  const avatar_url = req.file ? req.file.path : undefined;

  // Check if at least one field is provided for update
  if (
    name === undefined &&
    email === undefined &&
    gender === undefined &&
    phone === undefined &&
    avatar_url === undefined &&
    address === undefined &&
    adhar_no === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ensure admin exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM users WHERE id = ? FOR UPDATE`, [admin_id]);
    if (trows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Admin not found' });
    }
    const adminRow = trows[0];

    // update users table if needed
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) {
      userUpdates.push('name = ?');
      userParams.push(name.trim());
    }

    if (email !== undefined) {
      userUpdates.push('email = ?');
      userParams.push(email || null);
    }
    if (gender !== undefined) {
      userUpdates.push('gender = ?');
      userParams.push(gender || null);
    }
    if (phone !== undefined) {
      userUpdates.push('phone = ?');
      userParams.push(phone === '' || phone === 'null' ? null : phone);
    }
    if (address !== undefined) {
      userUpdates.push('address = ?');
      userParams.push(address || null);
    }
    if (adhar_no !== undefined) {
      userUpdates.push('adhar_no = ?');
      userParams.push(adhar_no || null);
    }

    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (adminRow.avatar_url) {
        await deleteFromCloudinary(adminRow.avatar_url);
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(req.file.path);
    }

    if (userUpdates.length > 0) {
      userParams.push(admin_id);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    await conn.commit();

    // return updated admin with field names matching frontend/login
    const [updatedRows] = await conn.execute(
      `SELECT u.id, u.name, u.email, u.gender, u.phone, u.avatar_url, u.role_id, u.address AS user_address, u.adhar_no AS user_adhar_no
       FROM users u WHERE u.id = ?`,
      [admin_id]
    );

    return res.json({
      message: 'Admin updated successfully',
      user: updatedRows[0]
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('UpdateAdminUser Error:', err);
    if (req.file) await deleteFromCloudinary(req.file.path);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
};

const UpdateAdminPassword = async (req, res) => {
  const admin_id = toInt(req.params.admin_id);
  if (!admin_id) return res.status(400).json({ error: 'Invalid admin id' });

  const password = req.body.new_password;
  const current_password = req.body.current_password;

  if (!password || !current_password) return res.status(400).json({ error: 'Password is required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ensure admin exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM users WHERE id = ? FOR UPDATE`, [admin_id]);
    if (trows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Admin not found' });
    }
    const adminRow = trows[0];

    // update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedPassword, admin_id]);

    await conn.commit();
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const UpdateSuperAdminUser = async (req, res) => {
  const superadmin_id = toInt(req.params.superadmin_id);
  if (!superadmin_id) return res.status(400).json({ error: 'Invalid superadmin id' });

  const { name, email, gender, phone, address, adhar_no } = req.body || {};
  const avatar_url = req.file ? req.file.path : undefined;

  // Check if at least one field is provided for update
  if (
    name === undefined &&
    email === undefined &&
    gender === undefined &&
    phone === undefined &&
    avatar_url === undefined &&
    address === undefined &&
    adhar_no === undefined
  ) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ensure admin exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM users WHERE id = ? FOR UPDATE`, [superadmin_id]);
    if (trows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Superadmin not found' });
    }
    const adminRow = trows[0];

    // update users table if needed
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) {
      userUpdates.push('name = ?');
      userParams.push(name.trim());
    }

    if (email !== undefined) {
      userUpdates.push('email = ?');
      userParams.push(email || null);
    }
    if (gender !== undefined) {
      userUpdates.push('gender = ?');
      userParams.push(gender || null);
    }
    if (phone !== undefined) {
      userUpdates.push('phone = ?');
      userParams.push(phone === '' || phone === 'null' ? null : phone);
    }
    if (address !== undefined) {
      userUpdates.push('address = ?');
      userParams.push(address || null);
    }
    if (adhar_no !== undefined) {
      userUpdates.push('adhar_no = ?');
      userParams.push(adhar_no || null);
    }

    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (adminRow.avatar_url) {
        await deleteFromCloudinary(adminRow.avatar_url);
      }
      userUpdates.push('avatar_url = ?');
      userParams.push(req.file.path);
    }

    if (userUpdates.length > 0) {
      userParams.push(admin_id);
      await conn.execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
    }

    await conn.commit();

    // return updated admin with field names matching frontend/login
    const [updatedRows] = await conn.execute(
      `SELECT u.id, u.name, u.email, u.gender, u.phone, u.avatar_url, u.role_id, u.address AS user_address, u.adhar_no AS user_adhar_no
       FROM users u WHERE u.id = ?`,
      [admin_id]
    );

    return res.json({
      message: 'Superadmin updated successfully',
      user: updatedRows[0]
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('UpdateSuperAdminUser Error:', err);
    if (req.file) await deleteFromCloudinary(req.file.path);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (conn) conn.release();
  }
};

const updateSuperAdminPassword = async (req, res) => {
  const superadmin_id = toInt(req.params.superadmin_id);
  if (!superadmin_id) return res.status(400).json({ error: 'Invalid superadmin id' });

  const password = req.body.new_password;
  const current_password = req.body.current_password;

  if (!password || !current_password) return res.status(400).json({ error: 'Password is required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ensure superadmin exists and lock rows
    const [trows] = await conn.execute(`SELECT * FROM users WHERE id = ? FOR UPDATE`, [superadmin_id]);
    if (trows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Superadmin not found' });
    }
    const superadminRow = trow[0];

    // update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await conn.execute(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedPassword, superadmin_id]);

    await conn.commit();
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    await conn.rollback();
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const getContactAdminHtmlTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; color: #1a202c; margin: 0; padding: 0; line-height: 1.6; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7fb; padding-bottom: 40px; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 40px; }
    .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .info-row { margin-bottom: 20px; }
    .info-label { display: block; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
    .info-value { display: block; font-size: 16px; color: #0f172a; font-weight: 500; }
    .message-box { display: block; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; font-size: 15px; color: #334155; white-space: pre-wrap; margin-top: 8px; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>New Contact from ${data.firstName} ${data.lastName}</h1>
      </div>
      <div class="content">
        <div class="info-card">
          <div class="info-row">
            <div class="info-label">Name</div>
            <div class="info-value">${data.firstName} ${data.lastName}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Email</div>
            <div class="info-value"><a href="mailto:${data.email}">${data.email}</a></div>
          </div>
          <div class="info-row">
            <div class="info-label">Phone</div>
            <div class="info-value">${data.phone || 'N/A'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">Message</div>
            <div class="message-box">${data.message}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

const getContactUserHtmlTemplate = (name) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Contacting Us</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fb; color: #1a202c; margin: 0; padding: 0; line-height: 1.6; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7fb; padding-bottom: 40px; }
    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 20px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 40px; text-align: center; }
    .content h2 { margin: 0 0 16px; color: #1e293b; font-size: 22px; font-weight: 600; }
    .content p { color: #475569; font-size: 16px; margin-bottom: 24px; }
    .footer { padding: 32px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9; }
    .footer p { margin: 4px 0; color: #94a3b8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>NIYATI PUBLIC SCHOOL</h1>
      </div>
      <div class="content">
        <h2>Thank You, ${name}!</h2>
        <p>We have successfully received your message.</p>
        <p>Our administrative team is reviewing your inquiry and will get back to you as soon as possible.</p>
        <p>If you have any urgent concerns, please feel free to reach out to us at our contact number.</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} NIYATI PUBLIC SCHOOL. All rights reserved.</p>
        <p>Quality Education Management Solutions</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: 'First Name, Last Name, Email, and Message are required' });
    }

    // 1. Send Email to Admin
    const adminEmail = process.env.MY_EMAIL; // fallback if not set
    await sendViaBrevo({
      to: adminEmail,
      subject: `New Contact Request from ${firstName} ${lastName}`,
      html: getContactAdminHtmlTemplate({ firstName, lastName, email, phone, message })
    });

    // 2. Send Thank You Email to User
    await sendViaBrevo({
      to: email,
      subject: 'Thank You for Contacting NIYATI PUBLIC SCHOOL',
      html: getContactUserHtmlTemplate(firstName)
    });

    return res.json({ success: true, message: 'Message sent successfully. We will get back to you soon!' });
  } catch (error) {
    console.error('submitContactForm Error:', error);
    return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
};



const getAdmissionAdminHtmlTemplate = ({ firstName, lastName, email, phone, className, message }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Admission Inquiry</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
      color: #333;
    }
    .content h2 {
      color: #2563eb;
      margin-top: 0;
      font-size: 20px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .info-table td {
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .info-table td:first-child {
      font-weight: bold;
      color: #555;
      width: 30%;
    }
    .message-box {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin-top: 15px;
      border-left: 4px solid #2563eb;
    }
    .footer {
      background-color: #f4f4f4;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>NIYATI PUBLIC SCHOOL</h1>
    </div>
    <div class="content">
      <h2>New Admission Inquiry</h2>
      <p>A new admission inquiry has been submitted through the website. Please review the details below:</p>
      
      <table class="info-table">
        <tr>
          <td>Student Name</td>
          <td>${firstName} ${lastName}</td>
        </tr>
        <tr>
          <td>Email Address</td>
          <td>${email}</td>
        </tr>
        <tr>
          <td>Phone Number</td>
          <td>${phone || 'Not provided'}</td>
        </tr>
        <tr>
          <td>Class of Interest</td>
          <td>${className || 'Not specified'}</td>
        </tr>
      </table>
      
      <div class="message-box">
        <strong>Message:</strong>
        <p>${message}</p>
      </div>
      
      <p>Please contact the parent at the earliest convenience to discuss the admission process.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NIYATI PUBLIC SCHOOL. All rights reserved.</p>
      <p>Quality Education Management Solutions</p>
    </div>
  </div>
</body>
</html>
`;

const getAdmissionUserHtmlTemplate = (name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Inquiry</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
      color: #333;
      text-align: center;
    }
    .content h2 {
      color: #2563eb;
      margin-top: 0;
      font-size: 20px;
    }
    .message-box {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      border-left: 4px solid #2563eb;
    }
    .footer {
      background-color: #f4f4f4;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>NIYATI PUBLIC SCHOOL</h1>
    </div>
    <div class="content">
      <h2>Thank You, ${name}!</h2>
      <p>We have successfully received your admission inquiry.</p>
      <p>Our administrative team is reviewing your message and will get back to you as soon as possible.</p>
      <div class="message-box">
        <p>We appreciate your interest in NIYATI PUBLIC SCHOOL and look forward to assisting you with the admission process.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} NIYATI PUBLIC SCHOOL. All rights reserved.</p>
      <p>Quality Education Management Solutions</p>
    </div>
  </div>
</body>
</html>
`;

const submitAdmissionForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, class: className, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: 'First Name, Last Name, Email, and Message are required' });
    }

    // 1. Send Email to Admin
    const adminEmail = process.env.MY_EMAIL; // fallback if not set
    await sendViaBrevo({
      to: adminEmail,
      subject: `New Admission Inquiry from ${firstName} ${lastName}`,
      html: getAdmissionAdminHtmlTemplate({ firstName, lastName, email, phone, className, message })
    });

    // 2. Send Thank You Email to User
    await sendViaBrevo({
      to: email,
      subject: 'Thank You for Your Admission Inquiry - NIYATI PUBLIC SCHOOL',
      html: getAdmissionUserHtmlTemplate(firstName)
    });

    return res.json({ success: true, message: 'Admission inquiry sent successfully. We will get back to you soon!' });
  } catch (error) {
    console.error('submitAdmissionForm Error:', error);
    return res.status(500).json({ error: 'Failed to send admission inquiry. Please try again later.' });
  }
};


module.exports = {
  login,
  googleLogin,
  logout,
  forgotPassword,
  sendOtp,
  verifyOtp,
  submitContactForm,
  submitAdmissionForm,
  AddStaffUser,
  GetStaffUsers,
  GetStaffUserById,
  UpdateStaffUser,
  DeleteStaffUser,
  UpdateAdminUser,
  UpdateAdminPassword,
  UpdateStaffPassword,
  UpdateSuperAdminUser,
  updateSuperAdminPassword
};