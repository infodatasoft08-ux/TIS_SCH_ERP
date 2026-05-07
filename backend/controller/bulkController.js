const db = require("../db");
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { generateNextId } = require("../utils/idGenerator");
const formatMySQLDate = require("../config/deateConverter");

const SALT_ROUNDS = 10;

/**
 * Bulk add students from Excel
 */
const BulkAddStudents = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Excel file is required" });

    const conn = await db.getConnection();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) return res.status(400).json({ error: "Excel sheet is empty" });

        const results = { success: 0, failed: 0, errors: [] };

        // Fetch meta-data maps
        const [grRows] = await conn.execute("SELECT id, name FROM grades");
        const [clRows] = await conn.execute("SELECT id, name FROM classes");
        const [ayRows] = await conn.execute("SELECT id, name FROM academic_years");
        const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key IN ("admission_no_prefix")');

        const grMap = {}; grRows.forEach(r => grMap[r.name.toLowerCase()] = r.id);
        const clMap = {}; clRows.forEach(r => clMap[r.name.toLowerCase()] = r.id);
        const ayMap = {}; ayRows.forEach(r => ayMap[r.name.toLowerCase()] = r.id);
        const admissionPrefix = settingsRows.find(s => s.setting_key === "admission_no_prefix")?.setting_value;

        const role_id = 1; // Based on studentController.js logic (user.role_id === 1 for student)
        // Wait, studentController.js AddStudent gets role_id from req.body. Let's use 1 if that's what auth uses.
        // Actually, let's check roles again. I'll use a hardcoded 3 if I can't confirm, but I'll try to find student role.
        const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('student', 'Student') LIMIT 1");
        const studentRoleId = rolesRows.length > 0 ? rolesRows[0].id : 1;

        for (const row of data) {
            try {
                await conn.beginTransaction();

                const { name, email, password, phone, gender, admission_no, grade, class: className, academic_year, address, admission_date, date_of_birth, roll_no, adhar_no, blood_group, fathers_name, mothers_name, father_occupation, mother_contect, parent_contact } = row;

                if (!name || !email || !password || !grade || !className || !academic_year) {
                    throw new Error(`Missing required fields: name, email, password, grade, class, academic_year`);
                }

                // Map Names to IDs
                const gradeId = grMap[grade.toString().toLowerCase()];
                const classId = clMap[className.toString().toLowerCase()];
                const ayId = ayMap[academic_year.toString().toLowerCase()];

                if (!gradeId) throw new Error(`Grade "${grade}" not found`);
                if (!classId) throw new Error(`Class "${className}" not found`);
                if (!ayId) throw new Error(`Academic Year "${academic_year}" not found`);

                const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);

                // Auto-generate Admission No if missing
                let finalAdmissionNo = admission_no;
                if (!finalAdmissionNo && admissionPrefix) {
                    finalAdmissionNo = await generateNextId(admissionPrefix, 'students', 'admission_no');
                }

                // 1) Create entry in Users table
                const [userRes] = await conn.execute(
                    `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [name, email, gender?.toLowerCase() || 'other', password_hash, studentRoleId, phone || null, adhar_no || null, address || null]
                );
                const userId = userRes.insertId;

                // 2) Create entry in Students table (without academic_year_id)
                await conn.execute(
                    `INSERT INTO students (id, user_id, admission_no, date_of_birth, admission_date, blood_group, mother_contect, father_occupation, status, parent_contact, mothers_name, fathers_name, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NOW())`,
                    [userId, userId, finalAdmissionNo || null, formatMySQLDate(date_of_birth), formatMySQLDate(admission_date), blood_group || null, mother_contect || null, father_occupation || null, parent_contact || null, mothers_name || null, fathers_name || null]
                );

                // 3) Create entry in Student Academic Records table
                await conn.execute(
                    `INSERT INTO student_academic_records (student_id, academic_year_id, grade_id, class_id, roll_no, result_status, created_at)
                     VALUES (?, ?, ?, ?, ?, 'pass', NOW())`,
                    [userId, ayId, gradeId, classId, roll_no || null]
                );

                await conn.commit();
                results.success++;
            } catch (err) {
                await conn.rollback();
                results.failed++;
                results.errors.push({ email: row.email || 'Unknown', error: err.message });
            }
        }

        const message =
            results.failed === 0 ? "Bulk Student upload completed successfully!" :
                results.success === 0 ? "Bulk Student upload failed completely" :
                    "Bulk Student upload completed with some errors";

        res.json({ message, results });
    } catch (err) {
        console.error("BulkAddStudents Error:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        conn.release();
    }
};

/**
 * Bulk add teachers from Excel
 */
const BulkAddTeachers = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Excel file is required" });

    const conn = await db.getConnection();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ error: "Excel sheet is empty" });

        const results = { success: 0, failed: 0, errors: [] };

        const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
        const employeePrefix = settingsRows[0]?.setting_value;

        const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('teacher', 'Teacher') LIMIT 1");
        const teacherRoleId = rolesRows.length > 0 ? rolesRows[0].id : 2;

        for (const row of data) {
            try {
                await conn.beginTransaction();
                const { name, email, password, phone, gender, employee_code, hire_date, qualification, address, adhar_no, bio } = row;

                if (!name || !email || !password) {
                    throw new Error(`Missing required fields: name, email, password`);
                }

                const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);

                // Auto-generate Employee Code if missing
                let finalEmployeeCode = employee_code;
                if (!finalEmployeeCode && employeePrefix) {
                    finalEmployeeCode = await generateNextId(employeePrefix, 'teachers', 'employee_code');
                }

                const [userRes] = await conn.execute(
                    `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [name, email, gender?.toLowerCase() || 'other', password_hash, teacherRoleId, phone || null, adhar_no || null, address || null]
                );
                const userId = userRes.insertId;

                await conn.execute(
                    `INSERT INTO teachers (id, user_id, employee_code, hire_date, qualification, bio)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [userId, userId, finalEmployeeCode || null, formatMySQLDate(hire_date), qualification || null, bio || null]
                );

                await conn.commit();
                results.success++;
            } catch (err) {
                await conn.rollback();
                results.failed++;
                results.errors.push({ email: row.email || 'Unknown', error: err.message });
            }
        }
        const message =
            results.failed === 0 ? "Bulk Teacher upload completed successfully!" :
                results.success === 0 ? "Bulk Teacher upload failed completely" :
                    "Bulk Teacher upload completed with some errors";

        res.json({ message, results });
    } catch (err) {
        console.error("BulkAddTeachers Error:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        conn.release();
    }
};

/**
 * Bulk add staff from Excel
 */
const BulkAddStaff = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Excel file is required" });

    const conn = await db.getConnection();
    try {
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (data.length === 0) return res.status(400).json({ error: "Excel sheet is empty" });

        const results = { success: 0, failed: 0, errors: [] };

        const [settingsRows] = await conn.execute('SELECT setting_key, setting_value FROM school_settings WHERE setting_key = "employee_code_prefix"');
        const employeePrefix = settingsRows[0]?.setting_value;

        const [rolesRows] = await conn.execute("SELECT id FROM roles WHERE role_name IN ('staff', 'Staff') LIMIT 1");
        const staffRoleId = rolesRows.length > 0 ? rolesRows[0].id : 4;

        for (const row of data) {
            try {
                await conn.beginTransaction();
                const { name, email, password, phone, gender, employee_code, department, sub_role, address, adhar_no } = row;

                if (!name || !email || !password || !sub_role) {
                    throw new Error(`Missing required fields: name, email, password, sub_role`);
                }

                const password_hash = await bcrypt.hash(String(password), SALT_ROUNDS);

                // Auto-generate Employee Code if missing
                let finalEmployeeCode = employee_code;
                if (!finalEmployeeCode && employeePrefix) {
                    finalEmployeeCode = await generateNextId(employeePrefix, 'staff', 'employee_code');
                }

                const [userRes] = await conn.execute(
                    `INSERT INTO users (name, email, gender, password_hash, role_id, phone, adhar_no, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [name, email, gender?.toLowerCase() || 'other', password_hash, staffRoleId, phone || null, adhar_no || null, address || null]
                );
                const userId = userRes.insertId;

                await conn.execute(
                    `INSERT INTO staff (id, user_id, employee_code, department, sub_role)
                     VALUES (?, ?, ?, ?, ?)`,
                    [userId, userId, finalEmployeeCode || null, department || null, sub_role]
                );

                await conn.commit();
                results.success++;
            } catch (err) {
                await conn.rollback();
                results.failed++;
                results.errors.push({ email: row.email || 'Unknown', error: err.message });
            }
        }
        const message =
            results.failed === 0 ? "Bulk Staff upload completed successfully!" :
                results.success === 0 ? "Bulk Staff upload failed completely" :
                    "Bulk Staff upload completed with some errors";

        res.json({ message, results });
    } catch (err) {
        console.error("BulkAddStaff Error:", err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        conn.release();
    }
};

module.exports = {
    BulkAddStudents,
    BulkAddTeachers,
    BulkAddStaff
};
