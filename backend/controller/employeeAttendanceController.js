const db = require('../db');
const formatMySQLDate = require("../config/deateConverter");

const VALID_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const toInt = v => (v === undefined || v === null || v === "" ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * GET /api/employee-attendance/employees
 * Fetches all teachers and staff members for attendance tracking
 */
const GetEmployees = async (req, res) => {
  try {
    const sql = `
      SELECT u.id, u.name, u.email, u.phone, u.role_id, 
             CASE WHEN t.id IS NOT NULL THEN 'Teacher' ELSE 'Staff' END as type,
             COALESCE(t.employee_code, s.employee_code) as employee_code,
             u.avatar_url
      FROM users u
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN staff s ON s.user_id = u.id
      WHERE t.id IS NOT NULL OR s.id IS NOT NULL
      ORDER BY u.name ASC
    `;
    const [rows] = await db.execute(sql);
    return res.json({ employees: rows });
  } catch (err) {
    console.error('GetEmployees error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/employee-attendance/take
 * Bulk records attendance for employees
 */
const TakeEmployeeAttendance = async (req, res) => {
  const records = Array.isArray(req.body.records) ? req.body.records : [];
  if (records.length === 0) return res.status(400).json({ error: 'records array is required' });

  const normalized = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const user_id = toInt(r.user_id);
    const attendance_date = r.attendance_date || null;
    const status = r.status ? String(r.status).toLowerCase() : null;
    const recorded_by = r.recorded_by ? toInt(r.recorded_by) : null;

    if (!user_id) return res.status(400).json({ error: `record[${i}]: user_id is required` });
    if (!attendance_date || !isDateString(attendance_date)) return res.status(400).json({ error: `record[${i}]: attendance_date is required in YYYY-MM-DD format` });
    if (!status || !VALID_STATUSES.has(status)) return res.status(400).json({ error: `record[${i}]: invalid status` });

    normalized.push({ user_id, attendance_date, status, recorded_by });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const valuesSql = normalized.map(() => '(?, ?, ?, ?, NOW())').join(', ');
    const params = [];
    normalized.forEach(r => {
      params.push(r.user_id, r.attendance_date, r.status, r.recorded_by || null);
    });

    const sql = `
      INSERT INTO employee_attendance (user_id, attendance_date, status, recorded_by, recorded_at)
      VALUES ${valuesSql}
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        recorded_by = VALUES(recorded_by),
        recorded_at = NOW()
    `;

    const [result] = await conn.execute(sql, params);
    await conn.commit();

    return res.json({ success: true, affectedRows: result.affectedRows, message: 'Employee attendance recorded successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('TakeEmployeeAttendance error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

/**
 * GET /api/employee-attendance/summery
 * Gets attendance history for employees
 */
const GetEmployeeAttendanceSummery = async (req, res) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

    const sql = `
      SELECT ea.*, u.name as employee_name, u.email as employee_email, 
             COALESCE(t.employee_code, s.employee_code) as employee_code,
             rb.name as recorded_by_name
      FROM employee_attendance ea
      JOIN users u ON u.id = ea.user_id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN staff s ON s.user_id = u.id
      LEFT JOIN users rb ON rb.id = ea.recorded_by
      WHERE ea.attendance_date BETWEEN ? AND ?
      ORDER BY ea.attendance_date DESC, u.name ASC
    `;
    const [rows] = await db.execute(sql, [from, to]);
    
    const formatted = rows.map(r => ({
      ...r,
      attendance_date: formatMySQLDate(r.attendance_date)
    }));

    return res.json({ records: formatted });
  } catch (err) {
    console.error('GetEmployeeAttendanceSummery error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/employee-attendance/update-single
 */
const UpdateSingleEmployeeAttendance = async (req, res) => {
  const { attendance_id, status, recorded_by } = req.body;
  if (!attendance_id || !status) return res.status(400).json({ error: 'attendance_id and status are required' });

  const normalizedStatus = String(status).toLowerCase();
  if (!VALID_STATUSES.has(normalizedStatus)) return res.status(400).json({ error: 'Invalid status' });

  try {
    const [result] = await db.execute(
      `UPDATE employee_attendance SET status = ?, recorded_by = ?, recorded_at = NOW() WHERE id = ?`,
      [normalizedStatus, recorded_by || null, attendance_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Attendance record not found' });
    return res.json({ success: true, message: 'Attendance updated successfully' });
  } catch (err) {
    console.error('UpdateSingleEmployeeAttendance error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  GetEmployees,
  TakeEmployeeAttendance,
  GetEmployeeAttendanceSummery,
  UpdateSingleEmployeeAttendance
};
