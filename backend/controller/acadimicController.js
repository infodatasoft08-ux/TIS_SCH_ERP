const db = require('../db');

const toId = v => (v === "" || v === undefined || v === null ? null : v);

// Create Academic Record
exports.createAcademicRecord = async (req, res) => {
    try {
        const { student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status } = req.body;
        const [result] = await db.query(
            `INSERT INTO student_academic_records (student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                toId(student_id),
                toId(academic_year_id),
                toId(grade_id),
                toId(class_id),
                toId(roll_no),
                toId(promoted_from_grade_id),
                result_status
            ]
        );
        res.status(201).json({ message: 'Academic record created successfully', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Get Academic Records
exports.getAcademicRecords = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const q = req.query.q ? `%${req.query.q}%` : '%';
        const gradeId = req.query.grade_id && req.query.grade_id !== '' ? Number(req.query.grade_id) : null;
        const academicYearId = req.query.academic_year_id && req.query.academic_year_id !== '' ? Number(req.query.academic_year_id) : null;

        let sql = `
            SELECT sar.*, u.name as student_name, c.name as class_name, g.name as grade_name, ay.name as academic_year_name
            FROM student_academic_records sar
            LEFT JOIN users u ON sar.student_id = u.id 
            LEFT JOIN classes c ON sar.class_id = c.id 
            LEFT JOIN grades g ON sar.grade_id = g.id 
            LEFT JOIN academic_years ay ON sar.academic_year_id = ay.id
            WHERE (u.name LIKE ? OR c.name LIKE ? OR g.name LIKE ? OR ay.name LIKE ? OR sar.roll_no LIKE ? OR u.email LIKE ?)
        `;

        const params = [q, q, q, q, q, q];

        if (gradeId) {
            sql += ` AND sar.grade_id = ?`;
            params.push(gradeId);
        }
        if (academicYearId) {
            sql += ` AND sar.academic_year_id = ?`;
            params.push(academicYearId);
        }

        sql += ` ORDER BY sar.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

        const [rows] = await db.query(sql, params);
        res.status(200).json({ academic_records: rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Bulk Promote Students
exports.bulkPromote = async (req, res) => {
    const { student_ids, academic_year_id, grade_id, class_id } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array is required' });
    }
    if (!academic_year_id || !grade_id) {
        return res.status(400).json({ error: 'academic_year_id and grade_id are required' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        for (const studentId of student_ids) {
            // Get latest record for this student to check status and old grade/class
            const [recs] = await conn.execute(
                `SELECT grade_id, class_id, roll_no, result_status 
                 FROM student_academic_records 
                 WHERE student_id = ? 
                 ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
                [studentId]
            );

            if (recs.length === 0) continue; // Skip if no record found

            const current = recs[0];
            let targetGradeId = grade_id;
            let targetClassId = class_id || current.class_id;

            // If fail, remain in same class but update academic year
            if (current.result_status === 'fail') {
                targetGradeId = current.grade_id;
                targetClassId = current.class_id;
            }

            // Insert new record
            await conn.execute(
                `INSERT INTO student_academic_records 
                 (student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pass', NOW())`,
                [
                    studentId,
                    academic_year_id,
                    targetGradeId,
                    targetClassId,
                    current.roll_no, // Maintain same roll no for now
                    current.grade_id // Promoted from
                ]
            );
        }

        await conn.commit();
        res.status(200).json({ message: 'Students promoted successfully' });
    } catch (error) {
        await conn.rollback();
        console.error('Bulk promote error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    } finally {
        conn.release();
    }
};

// Update Academic Record
exports.updateAcademicRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status } = req.body;
        await db.query(
            `UPDATE student_academic_records SET student_id=?, academic_year_id=?, grade_id=?, class_id=?, roll_no=?, promoted_from_grade_id=?, result_status=? WHERE id=?`,
            [
                toId(student_id),
                toId(academic_year_id),
                toId(grade_id),
                toId(class_id),
                toId(roll_no),
                toId(promoted_from_grade_id),
                result_status,
                id
            ]
        );
        res.status(200).json({ message: 'Academic record updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Delete Academic Record
exports.deleteAcademicRecord = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM student_academic_records WHERE id = ?', [id]);
        res.status(200).json({ message: 'Academic record deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};
