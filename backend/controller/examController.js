const formatMySQLDate = require('../config/deateConverter');
const db = require('../db');

const toInt = v => (v === undefined || v === null || v === "" ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;

// Add Exam Group (Multiple subjects)
const AddExamGroup = async (req, res) => {
    const { name, class_id, grade_id, academic_year_id, note, start_date, end_date, subjects } = req.body;
    // subjects = [{ subject_id, max_marks, passing_marks }]

    if (!isNonEmptyString(name) || !grade_id || !academic_year_id) {
        return res.status(400).json({ error: 'Name, grade_id, and academic_year_id are required' });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'At least one subject is required' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // insert exam_groups
        const [egRes] = await conn.execute(
            `INSERT INTO exam_groups (name, class_id, grade_id, academic_year_id, note, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', NOW())`,
            [name.trim(), toInt(class_id) || null, toInt(grade_id), toInt(academic_year_id), note || null, start_date || null, end_date || null]
        );
        const examGroupId = egRes.insertId;

        // insert exam_group_subjects
        for (const sub of subjects) {
            await conn.execute(
                `INSERT INTO exam_group_subjects (exam_group_id, subject_id, max_marks, passing_marks) VALUES (?, ?, ?, ?)`,
                [examGroupId, toInt(sub.subject_id), toInt(sub.max_marks) || 100, toInt(sub.passing_marks) || 35]
            );
        }

        await conn.commit();
        conn.release();
        return res.status(201).json({ success: true, exam_group_id: examGroupId });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/exam/groups error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Get Exam Groups
const GetExamGroups = async (req, res) => {
    try {
        const classId = req.query.class_id ? toInt(req.query.class_id) : null;
        const status = req.query.status;
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 2000);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

        let whereClause = [];
        let params = [];

        if (classId) {
            whereClause.push('eg.class_id = ?');
            params.push(classId);
        }
        if (status) {
            whereClause.push('eg.status = ?');
            params.push(status);
        }

        let baseSql = `
            FROM exam_groups eg
            LEFT JOIN classes c ON c.id = eg.class_id
            LEFT JOIN grades g ON g.id = eg.grade_id
            LEFT JOIN academic_years ay ON ay.id = eg.academic_year_id
        `;
        if (whereClause.length > 0) baseSql += ' WHERE ' + whereClause.join(' AND ');

        const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${baseSql}`, params);
        const total = countRows[0].total;

        const dataSql = `
            SELECT eg.*, c.name AS class_name, g.name AS grade_name, ay.name AS academic_year_name
            ${baseSql}
            ORDER BY eg.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(dataSql, params);

        // Fetch subjects for these exam groups
        if (rows.length > 0) {
            const groupIds = rows.map(r => r.id);
            const [subjectRows] = await db.query(`
                SELECT egs.*, s.name AS subject_name 
                FROM exam_group_subjects egs
                JOIN subjects s ON s.id = egs.subject_id
                WHERE egs.exam_group_id IN (?)
            `, [groupIds]);

            for (const row of rows) {
                row.subjects = subjectRows.filter(s => s.exam_group_id === row.id);
            }
        }

        const formattedExams = rows.map(exam => ({
            ...exam,
            start_date: exam.start_date ? formatMySQLDate(exam.start_date) : null,
            end_date: exam.end_date ? formatMySQLDate(exam.end_date) : null
        }));

        return res.json({ total, limit, offset, exams: formattedExams });

    } catch (err) {
        console.error('GET /api/exam/groups error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Update Exam Group (Status / Details)
const UpdateExamGroup = async (req, res) => {
    const id = toInt(req.params.id);
    const { name, note, start_date, end_date, status, is_results_published } = req.body;

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (is_results_published !== undefined) { updates.push('is_results_published = ?'); params.push(is_results_published ? 1 : 0); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(id);
    try {
        await db.execute(`UPDATE exam_groups SET ${updates.join(', ')} WHERE id = ?`, params);
        return res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/exam/groups/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const DeleteExamGroup = async (req, res) => {
    const id = toInt(req.params.id);
    try {
        await db.execute('DELETE FROM exam_groups WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/exam/groups/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const UpdateExamRoutine = async (req, res) => {
    const { routine } = req.body;
    // routine: [{ id: exam_group_subject_id, exam_date, start_time, end_time }]
    if (!Array.isArray(routine)) return res.status(400).json({ error: 'Routine array is required' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        for (const item of routine) {
            await conn.execute(
                `UPDATE exam_group_subjects SET exam_date = ?, start_time = ?, end_time = ? WHERE id = ?`,
                [item.exam_date || null, item.start_time || null, item.end_time || null, item.id]
            );
        }

        await conn.commit();
        conn.release();
        return res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/exam/routine error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const AddExamGroupMarks = async (req, res) => {
    const { exam_group_id, marks } = req.body;
    // marks: [{ student_id, student_academic_id, subject_id, attendance_status, marks_obtained }]
    if (!exam_group_id || !Array.isArray(marks)) return res.status(400).json({ error: 'exam_group_id and marks array required' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Get subjects for this group
        const [subRows] = await conn.execute(`SELECT id, subject_id, passing_marks, max_marks FROM exam_group_subjects WHERE exam_group_id = ?`, [exam_group_id]);
        const subjectMap = {}; // subject_id -> { id, max_marks }
        subRows.forEach(s => subjectMap[s.subject_id] = s);

        for (const m of marks) {
            const groupSub = subjectMap[m.subject_id];
            if (!groupSub) continue;

            // Simple grade calculation based on percentage
            let grade = 'F';
            if (m.attendance_status === 'Present' && m.marks_obtained !== null) {
                const percentage = (m.marks_obtained / groupSub.max_marks) * 100;
                if (percentage >= 90) grade = 'A+';
                else if (percentage >= 80) grade = 'A';
                else if (percentage >= 70) grade = 'B';
                else if (percentage >= 60) grade = 'C';
                else if (percentage >= groupSub.passing_marks) grade = 'P';
            } else if (m.attendance_status === 'Absent') {
                grade = 'AB';
            }

            await conn.execute(`
                INSERT INTO exam_group_results (exam_group_subject_id, student_id, student_academic_id, attendance_status, marks_obtained, grade, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    attendance_status = VALUES(attendance_status),
                    marks_obtained = VALUES(marks_obtained),
                    grade = VALUES(grade),
                    recorded_at = NOW()
            `, [groupSub.id, m.student_id, m.student_academic_id, m.attendance_status, m.marks_obtained, grade]);
        }

        // Change status to Over
        await conn.execute(`UPDATE exam_groups SET status = 'Over' WHERE id = ?`, [exam_group_id]);

        await conn.commit();
        conn.release();
        return res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/exam/groups/marks error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetExamGroupResults = async (req, res) => {
    const examGroupId = toInt(req.params.id);
    try {
        const [rows] = await db.execute(`
            SELECT egr.*, s.id as subject_id, s.name as subject_name, st.id as student_id, u.name as student_name, sar.roll_no as roll_no
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN subjects s ON s.id = egs.subject_id
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            WHERE egs.exam_group_id = ?
        `, [examGroupId]);

        return res.json({ results: rows });
    } catch (err) {
        console.error('GET /api/exam/groups/:id/results error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetExamsForStudent = async (req, res) => {
    const userId = req.user.id;
    try {
        const conn = await db.getConnection();

        // 1. Get the student's ID and current academic record (class_id, grade_id)
        const [studentRows] = await conn.execute(
            `SELECT s.id as student_id, sar.id as student_academic_id, sar.class_id, sar.grade_id 
             FROM students s
             JOIN student_academic_records sar ON sar.student_id = s.id
             WHERE s.user_id = ? 
             ORDER BY sar.academic_year_id DESC LIMIT 1`,
            [userId]
        );

        if (studentRows.length === 0) {
            conn.release();
            return res.status(404).json({ error: 'Student record not found' });
        }

        const { class_id, grade_id, student_id } = studentRows[0];

        // 2. Fetch exam groups that are Published or Over for this class
        const [examRows] = await conn.execute(`
            SELECT eg.*, ay.name AS academic_year_name
            FROM exam_groups eg
            LEFT JOIN academic_years ay ON ay.id = eg.academic_year_id
            WHERE (eg.class_id = ? OR (eg.class_id IS NULL AND eg.grade_id = ?)) 
            AND eg.status IN ('Published', 'Over')
            ORDER BY eg.created_at DESC
        `, [class_id, grade_id]);

        // Fetch subjects and results for these exams
        if (examRows.length > 0) {
            const groupIds = examRows.map(r => r.id);
            const [subjectRows] = await conn.query(`
                SELECT egs.*, s.name AS subject_name,
                       egr.marks_obtained, egr.grade as result_grade, egr.attendance_status
                FROM exam_group_subjects egs
                JOIN subjects s ON s.id = egs.subject_id
                LEFT JOIN exam_group_results egr ON egr.exam_group_subject_id = egs.id AND egr.student_id = ?
                WHERE egs.exam_group_id IN (?)
            `, [student_id, groupIds]);

            for (const row of examRows) {
                row.subjects = subjectRows.filter(s => s.exam_group_id === row.id);
            }
        }

        conn.release();

        const formattedExams = examRows.map(exam => {
            const subjects = (exam.subjects || []).map(s => {
                if (!exam.is_results_published) {
                    return { ...s, marks_obtained: null, result_grade: null };
                }
                return s;
            });

            return {
                ...exam,
                subjects,
                end_date: exam.end_date ? formatMySQLDate(exam.end_date) : null
            };
        });

        return res.json({ exams: formattedExams });

    } catch (err) {
        console.error('GET /api/student/exams error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetStudentExamHistory = async (req, res) => {
    const studentId = toInt(req.params.student_id);
    try {
        const [rows] = await db.execute(`
            SELECT eg.id as exam_group_id, eg.name as exam_name, eg.is_results_published, 
                   egs.subject_id, s.name as subject_name, 
                   egr.marks_obtained, egr.grade, egr.attendance_status, 
                   egs.max_marks, eg.created_at
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN exam_groups eg ON eg.id = egs.exam_group_id
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egr.student_id = ?
            ORDER BY eg.created_at ASC
        `, [studentId]);
        
        return res.json({ history: rows });
    } catch (err) {
        console.error('GET /api/exam/student/:id/history error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetAllStudentExamSummaries = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN exam_groups eg ON eg.id = egs.exam_group_id
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            LEFT JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            LEFT JOIN grades g ON g.id = sar.grade_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
            LEFT JOIN grades eg_g ON eg_g.id = eg.grade_id
            LEFT JOIN academic_years eg_ay ON eg_ay.id = eg.academic_year_id
            LEFT JOIN subjects s ON s.id = egs.subject_id
            ORDER BY st.id, eg.start_date DESC
        `);

        // Group by student
        const studentMap = {};
        rows.forEach(row => {
            if (!studentMap[row.student_id]) {
                studentMap[row.student_id] = {
                    id: row.student_id,
                    name: row.student_name,
                    roll_no: row.roll_no,
                    grade_id: row.grade_id,
                    grade_name: row.grade_name,
                    academic_year_id: row.academic_year_id,
                    academic_year_name: row.academic_year_name,
                    exams: {} // Group exams by id to handle multiple subjects
                };
            }
            
            if (!studentMap[row.student_id].exams[row.exam_id]) {
                studentMap[row.student_id].exams[row.exam_id] = {
                    id: row.exam_id,
                    name: row.exam_name,
                    date: row.start_date,
                    is_results_published: row.is_results_published,
                    subjects: []
                };
            }
            
            studentMap[row.student_id].exams[row.exam_id].subjects.push({
                subject_name: row.subject_name,
                marks_obtained: row.marks_obtained,
                max_marks: row.max_marks,
                grade: row.grade,
                attendance_status: row.attendance_status
            });
        });

        // Convert exams object back to array
        const result = Object.values(studentMap).map(s => ({
            ...s,
            exams: Object.values(s.exams)
        }));

        return res.json({ studentSummaries: result });
    } catch (err) {
        console.error('GET /api/exam/all-student-summaries error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetSupervisedClassExamTrends = async (req, res) => {
    return res.json({ trends: [] });
}

module.exports = {
    AddExamGroup,
    GetExamGroups,
    UpdateExamGroup,
    DeleteExamGroup,
    UpdateExamRoutine,
    AddExamGroupMarks,
    GetExamGroupResults,
    GetExamsForStudent,
    GetStudentExamHistory,
    GetAllStudentExamSummaries,
    GetSupervisedClassExamTrends
};