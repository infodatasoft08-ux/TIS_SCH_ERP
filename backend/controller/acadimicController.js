const db = require('../db');

const toId = v => (v === "" || v === undefined || v === null ? null : v);

// Create Academic Record (Single Promotion / Upsert)
exports.createAcademicRecord = async (req, res) => {
    try {
        const { student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status } = req.body;

        if (!student_id || !grade_id) {
            return res.status(400).json({ error: 'student_id and grade_id are required' });
        }

        let targetAyId = toId(academic_year_id);
        if (!targetAyId) {
            const [activeAy] = await db.execute("SELECT id FROM academic_years WHERE status = 'active' ORDER BY id DESC LIMIT 1");
            if (activeAy.length > 0) targetAyId = activeAy[0].id;
        } else {
            const [ayCheck] = await db.execute("SELECT status FROM academic_years WHERE id = ?", [targetAyId]);
            if (ayCheck.length > 0 && ayCheck[0].status === 'inactive') {
                return res.status(400).json({ error: 'Selected target academic year is inactive. Please select an active academic year for promotion.' });
            }
        }

        if (!targetAyId) {
            return res.status(400).json({ error: 'No active academic year found for promotion' });
        }

        const [result] = await db.query(
            `INSERT INTO student_academic_records 
             (student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                grade_id = VALUES(grade_id),
                class_id = VALUES(class_id),
                roll_no = VALUES(roll_no),
                promoted_from_grade_id = VALUES(promoted_from_grade_id),
                result_status = VALUES(result_status)`,
            [
                toId(student_id),
                targetAyId,
                toId(grade_id),
                toId(class_id),
                toId(roll_no),
                toId(promoted_from_grade_id),
                result_status || 'pass'
            ]
        );

        return res.status(201).json({ message: 'Academic record processed successfully', id: result.insertId });
    } catch (error) {
        console.error('createAcademicRecord error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Get Academic Records (Historical session querying support)
exports.getAcademicRecords = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const q = req.query.q ? `%${req.query.q}%` : '%';
        const gradeId = req.query.grade_id && req.query.grade_id !== '' ? Number(req.query.grade_id) : null;
        const academicYearId = req.query.academic_year_id && req.query.academic_year_id !== '' ? Number(req.query.academic_year_id) : null;
        const studentId = req.query.student_id && req.query.student_id !== '' ? Number(req.query.student_id) : null;

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

        if (studentId) {
            sql += ` AND sar.student_id = ?`;
            params.push(studentId);
        }
        if (gradeId) {
            sql += ` AND sar.grade_id = ?`;
            params.push(gradeId);
        }
        if (academicYearId) {
            sql += ` AND sar.academic_year_id = ?`;
            params.push(academicYearId);
        }

        sql += ` ORDER BY sar.academic_year_id DESC, sar.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

        const [rows] = await db.query(sql, params);
        return res.status(200).json({ academic_records: rows });
    } catch (error) {
        console.error('getAcademicRecords error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Bulk Promote Students (Transaction-based UPSERT)
exports.bulkPromote = async (req, res) => {
    const { student_ids, academic_year_id, grade_id, class_id } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array is required' });
    }
    if (!grade_id) {
        return res.status(400).json({ error: 'grade_id is required' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let targetAyId = toId(academic_year_id);
        if (!targetAyId) {
            const [activeAy] = await conn.execute("SELECT id FROM academic_years WHERE status = 'active' ORDER BY id DESC LIMIT 1");
            if (activeAy.length > 0) targetAyId = activeAy[0].id;
        } else {
            const [ayCheck] = await conn.execute("SELECT status FROM academic_years WHERE id = ?", [targetAyId]);
            if (ayCheck.length > 0 && ayCheck[0].status === 'inactive') {
                await conn.rollback();
                conn.release();
                return res.status(400).json({ error: 'Selected target academic year is inactive. Please select an active academic year for promotion.' });
            }
        }

        // 1) Validate section (class_id) for target grade
        let resolvedClassId = class_id || null;
        if (resolvedClassId) {
            const [validClass] = await conn.query(
                'SELECT id FROM classes WHERE id = ? AND grade_id = ? LIMIT 1',
                [resolvedClassId, grade_id]
            );
            if (validClass.length === 0) resolvedClassId = null;
        }

        // Fallback to first section belonging to target grade
        if (!resolvedClassId) {
            const [firstClass] = await conn.query(
                'SELECT id FROM classes WHERE grade_id = ? ORDER BY id ASC LIMIT 1',
                [grade_id]
            );
            if (firstClass.length > 0) resolvedClassId = firstClass[0].id;
        }

        let promotedCount = 0;
        for (const studentId of student_ids) {
            // Fetch latest academic record for student
            const [recs] = await conn.execute(
                `SELECT grade_id, class_id, roll_no, result_status 
                 FROM student_academic_records 
                 WHERE student_id = ? 
                 ORDER BY academic_year_id DESC, id DESC LIMIT 1`,
                [studentId]
            );

            let currentGradeId = grade_id;
            let currentClassId = resolvedClassId;
            let currentRollNo = null;
            let promotedFromGradeId = null;

            if (recs.length > 0) {
                const current = recs[0];
                currentRollNo = current.roll_no;
                promotedFromGradeId = current.grade_id;

                // Failed students repeat the grade & section in the new session
                if (current.result_status === 'fail') {
                    currentGradeId = current.grade_id;
                    currentClassId = current.class_id;
                }
            }

            // Upsert academic record for the new session
            await conn.execute(
                `INSERT INTO student_academic_records 
                 (student_id, academic_year_id, grade_id, class_id, roll_no, promoted_from_grade_id, result_status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, 'pass', NOW())
                 ON DUPLICATE KEY UPDATE
                    grade_id = VALUES(grade_id),
                    class_id = VALUES(class_id),
                    roll_no = VALUES(roll_no),
                    promoted_from_grade_id = VALUES(promoted_from_grade_id),
                    result_status = VALUES(result_status)`,
                [
                    studentId,
                    targetAyId,
                    currentGradeId,
                    currentClassId,
                    currentRollNo,
                    promotedFromGradeId
                ]
            );
            promotedCount++;
        }

        await conn.commit();
        return res.status(200).json({ message: 'Students promoted successfully', promotedCount });
    } catch (error) {
        await conn.rollback();
        console.error('Bulk promote error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
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
        return res.status(200).json({ message: 'Academic record updated successfully' });
    } catch (error) {
        console.error('updateAcademicRecord error:', error);
        return res.status(500).json({ error: 'Server error', details: error.message });
    }
};

// Delete Academic Record
// exports.deleteAcademicRecord = async (req, res) => {
//     const conn = await db.getConnection();
//     try {
//         const { id } = req.params;
//         await conn.beginTransaction();

//         // 1. Get the student_id from the academic record
//         const [acRows] = await conn.query('SELECT student_id FROM student_academic_records WHERE id = ? FOR UPDATE', [id]);
//         if (acRows.length === 0) {
//             await conn.rollback();
//             conn.release();
//             return res.status(404).json({ error: 'Academic record not found' });
//         }
//         const studentId = acRows[0].student_id;

//         // 2. Get the user_id from the student record
//         const [stRows] = await conn.query('SELECT user_id FROM students WHERE id = ? FOR UPDATE', [studentId]);
//         let userId = null;
//         if (stRows.length > 0) {
//             userId = stRows[0].user_id;
//         }

//         // 3. Delete parent_children links if any
//         await conn.query('DELETE FROM parent_children WHERE student_id = ?', [studentId]);

//         // 4. Delete all academic records for this student
//         await conn.query('DELETE FROM student_academic_records WHERE student_id = ?', [studentId]);

//         // 5. Delete the student record
//         await conn.query('DELETE FROM students WHERE id = ?', [studentId]);

//         // 6. Delete the user record
//         if (userId) {
//             await conn.query('DELETE FROM users WHERE id = ?', [userId]);
//         }

//         await conn.commit();
//         return res.status(200).json({ message: 'Academic record and associated student deleted successfully' });
//     } catch (error) {
//         if (conn) await conn.rollback();
//         console.error('Error deleting academic record:', error);
//         return res.status(500).json({ error: 'Server error', details: error.message });
//     } finally {
//         if (conn) conn.release();
//     }
// };

exports.deleteAcademicRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM student_academic_records WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Academic record not found' });
        }
        res.status(200).json({ message: 'Academic session record deleted successfully' });
    } catch (error) {
        console.error('Error deleting academic record:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
};
