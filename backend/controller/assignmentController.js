const express = require('express');
const db = require('../db');
// const { sendWhatsAppMessage } = require('../helper/whatsappHelper');

const toInt = v => (v === undefined || v === null || v === "" ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;



/**
 * POST /api/assignments
 * Body:
 * {
 *   lesson_id?,
 *   class_id?, subject_id?,   // required if lesson_id not provided
 *   title, description?,
 *   assigned_date (YYYY-MM-DD) optional,
 *   due_date (YYYY-MM-DD) optional,
 *   max_marks? (int)
 * }
 */

const AddAssignment = async (req, res) => {
    const { lesson_id, academic_year_id, class_id, subject_id, title, description, assigned_date, due_date, max_marks } = req.body;

    if (!isNonEmptyString(title)) return res.status(400).json({ error: 'title is required' });
    if (!lesson_id && !(class_id && subject_id)) return res.status(400).json({ error: 'Provide lesson_id OR class_id and subject_id' });
    if (assigned_date && !isDateString(assigned_date)) return res.status(400).json({ error: 'assigned_date must be YYYY-MM-DD' });
    if (due_date && !isDateString(due_date)) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let finalClassId = null;
        let finalSubjectId = subject_id || null;

        if (lesson_id) {
            const [lrows] = await conn.execute('SELECT id, class_id, subject_id FROM lessons WHERE id = ? FOR UPDATE', [lesson_id]);
            if (lrows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'lesson_id not found' }); }
            finalClassId = lrows[0].class_id;
            if (!finalSubjectId) finalSubjectId = lrows[0].subject_id;
        } else {
            // validate class and subject
            const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ? FOR UPDATE', [class_id]);
            if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class_id not found' }); }
            const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]);
            if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject_id not found' }); }
            finalClassId = class_id;
        }

        // Resolve teacher ID from the authenticated user's ID
        const [trows] = await conn.execute('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        const creatorTeacherId = trows.length > 0 ? trows[0].id : null;

        const [ins] = await conn.execute(
            `INSERT INTO assignments (lesson_id, academic_year_id, subject_id, title, description, assigned_date, due_date, max_marks, created_at, class_id, teacher_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [toInt(lesson_id), toInt(academic_year_id), finalSubjectId, title.trim(), description || null, assigned_date || null, due_date || null, max_marks || null, finalClassId || null, creatorTeacherId]
        );

        await conn.commit();

        conn.release();

        const [rows] = await db.execute('SELECT * FROM assignments WHERE id = ?', [ins.insertId]);
        return res.status(201).json({ assignment: rows[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/assignments error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/**
 * GET /api/assignments
 * Query: ?lesson_id&class_id&subject_id&from&to&q&limit&offset
 */
const GetAssignment = async (req, res) => {
    try {
        const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : null;
        const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;
        const classId = req.query.class_id ? Number(req.query.class_id) : null;
        const from = req.query.from || null;
        const to = req.query.to || null;
        const q = req.query.q ? `%${req.query.q}%` : '%';
        let limit = parseInt(req.query.limit || '100', 10);
        let offset = parseInt(req.query.offset || '0', 10);
        if (!Number.isFinite(limit) || limit < 1) limit = 100;
        if (!Number.isFinite(offset) || offset < 0) offset = 0;
        limit = Math.min(limit, 2000);

        const where = [];
        const params = [];

        if (lessonId) { where.push('a.lesson_id = ?'); params.push(lessonId); }
        if (subjectId) { where.push('a.subject_id = ?'); params.push(subjectId); }
        if (classId) { where.push('COALESCE(a.class_id, l.class_id) = ?'); params.push(classId); }

        if (from && to) {
            if (!isDateString(from) || !isDateString(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
            where.push('DATE(a.assigned_date) BETWEEN ? AND ?'); params.push(from, to);
        } else if (from) {
            if (!isDateString(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
            where.push('DATE(a.assigned_date) >= ?'); params.push(from);
        } else if (to) {
            if (!isDateString(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
            where.push('DATE(a.assigned_date) <= ?'); params.push(to);
        }

        where.push('(a.title LIKE ? OR a.description LIKE ?)'); params.push(q, q);

        // Filter by teacher_id if the user is a teacher (role_id === 2)
        if (req.user && req.user.role_id === 2) {
            const [trows] = await db.execute('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            if (trows.length > 0) {
                where.push('a.teacher_id = ?');
                params.push(trows[0].id);
            }
        }

        let baseSql = `
        FROM assignments a
        LEFT JOIN lessons l ON l.id = a.lesson_id
        `;
        if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

        // total
        const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
        const [countRows] = await db.execute(countSql, params);
        const total = (Array.isArray(countRows) && countRows[0]) ? Number(countRows[0].total || 0) : 0;

        const dataSql = `
            SELECT a.*, COALESCE(a.class_id, l.class_id) AS effective_class_id
            ${baseSql}
            ORDER BY a.assigned_date DESC, a.due_date DESC, a.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(dataSql, params);

        return res.json({ total, limit, offset, assignments: rows });
    } catch (err) {
        console.error('GET /api/assignments error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/assignments/:id
 */
const GetAssignmentById = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid assignment id' });

    try {
        const [arows] = await db.execute(
            `SELECT a.*, COALESCE(a.class_id, l.class_id) AS effective_class_id, l.subject_id AS lesson_subject_id
            FROM assignments a
            LEFT JOIN lessons l ON l.id = a.lesson_id
            WHERE a.id = ?`,
            [id]
        );
        if (arows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
        const assignment = arows[0];

        // include recent submissions (first 50)
        const [subs] = await db.execute(
            `SELECT s.*, u.name AS student_name, u.email AS student_email
            FROM assignment_submissions s
            JOIN students st ON st.id = s.student_id
            JOIN users u ON u.id = st.user_id
            WHERE s.assignment_id = ?
            ORDER BY s.submitted_at DESC
            LIMIT 50`,
            [id]
        );
        assignment.recent_submissions = subs;
        return res.json({ assignment });
    } catch (err) {
        console.error('GET /api/assignments/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * PUT /api/assignments/:id
 * Body: { lesson_id?, class_id?, subject_id?, title?, description?, assigned_date?, due_date?, max_marks? }
 */
const UpdateAssignment = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid assignment id' });

    const { lesson_id, academic_year_id, class_id, subject_id, title, description, assigned_date, due_date, max_marks, academic_year } = req.body;
    if (lesson_id === undefined && academic_year_id === undefined && class_id === undefined && subject_id === undefined && title === undefined && description === undefined && assigned_date === undefined && due_date === undefined && max_marks === undefined && academic_year === undefined) {
        return res.status(400).json({ error: 'At least one field is required' });
    }
    if (assigned_date !== undefined && assigned_date !== null && !isDateString(assigned_date)) return res.status(400).json({ error: 'assigned_date must be YYYY-MM-DD' });
    if (due_date !== undefined && due_date !== null && !isDateString(due_date)) return res.status(400).json({ error: 'due_date must be YYYY-MM-DD' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [exists] = await conn.execute('SELECT * FROM assignments WHERE id = ? FOR UPDATE', [id]);
        if (exists.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Assignment not found' }); }

        // validate references if provided
        if (lesson_id !== undefined && lesson_id !== null) {
            const [lrows] = await conn.execute('SELECT id, class_id, subject_id FROM lessons WHERE id = ?', [lesson_id]);
            if (lrows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'lesson_id not found' }); }
        }
        if (class_id !== undefined && class_id !== null) {
            const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
            if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class_id not found' }); }
        }
        if (subject_id !== undefined && subject_id !== null) {
            const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]);
            if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject_id not found' }); }
        }

        const updates = []; const params = [];
        if (lesson_id !== undefined) { updates.push('lesson_id = ?'); params.push(toInt(lesson_id)); }
        if (class_id !== undefined) { updates.push('class_id = ?'); params.push(toInt(class_id)); }
        if (subject_id !== undefined) { updates.push('subject_id = ?'); params.push(toInt(subject_id)); }
        if (title !== undefined) { updates.push('title = ?'); params.push(isNonEmptyString(title) ? title.trim() : null); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
        if (assigned_date !== undefined) { updates.push('assigned_date = ?'); params.push(assigned_date || null); }
        if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date || null); }
        if (max_marks !== undefined) { updates.push('max_marks = ?'); params.push(max_marks || null); }
        if (academic_year_id !== undefined) { updates.push('academic_year_id = ?'); params.push(toInt(academic_year_id)); }

        params.push(id);
        await conn.execute(`UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`, params);

        await conn.commit();
        conn.release();

        const [updated] = await db.execute('SELECT * FROM assignments WHERE id = ?', [id]);
        return res.json({ assignment: updated[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/assignments/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const DeleteAssignment = async (req, res) => {
    const assignment_id = toInt(req.params.assignment_id);
    if (!assignment_id) return res.status(400).json({ error: 'Invalid assignment id' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [exists] = await conn.execute('SELECT id FROM assignments WHERE id = ? FOR UPDATE', [assignment_id]);
        if (exists.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Assignment not found' }); }

        // delete submissions first, then assignment
        await conn.execute('DELETE FROM assignment_submissions WHERE assignment_id = ?', [assignment_id]);
        await conn.execute('DELETE FROM assignments WHERE id = ?', [assignment_id]);

        await conn.commit();
        conn.release();
        return res.json({ success: true, deleted_assignment_id: assignment_id });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('DELETE /api/assignments/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/* ===== Submissions ===== */

/**
 * POST /api/assignments/:id/submissions
 * Body:
 * { student_id, file_url?, remarks? }
 * (Alternatively accept text answer in `remarks` or file URL in `file_url`)
 *
 * This upserts a submission for student (unique per assignment+student).
 */
const SubmitAssignment = async (req, res) => {
    const assignmentId = toInt(req.params.id);
    const { student_id, file_url, remarks } = req.body;

    if (!assignmentId || !student_id) return res.status(400).json({ error: 'assignment_id and student_id are required' });
    if (!file_url && (remarks === undefined || remarks === null)) {
        return res.status(400).json({ error: 'Either file_url or remarks must be provided' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // ensure assignment exists and find its class (to validate student belongs to class if possible)
        const [arows] = await conn.execute('SELECT id, class_id, lesson_id FROM assignments WHERE id = ? FOR UPDATE', [assignmentId]);
        if (arows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Assignment not found' }); }
        const assignment = arows[0];

        // optional: ensure student exists and belongs to the assignment's class (if assignment has class_id or lesson->class)
        const [srows] = await conn.execute('SELECT id, class_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1 FOR UPDATE', [student_id]);
        if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'student_id not found' }); }
        const student = srows[0];

        // compute effective assignment class
        let effectiveClassId = assignment.class_id;
        if (!effectiveClassId && assignment.lesson_id) {
            const [lrows] = await conn.execute('SELECT class_id FROM lessons WHERE id = ?', [assignment.lesson_id]);
            effectiveClassId = (lrows[0] && lrows[0].class_id) ? lrows[0].class_id : null;
        }
        if (effectiveClassId && student.class_id && Number(student.class_id) !== Number(effectiveClassId)) {
            // Student not in that class — reject (you can change to allow if needed)
            await conn.rollback(); conn.release();
            return res.status(400).json({ error: 'Student does not belong to the class for this assignment' });
        }

        // insert or update submission (ON DUPLICATE KEY) — assumes UNIQUE(assignment_id, student_id)
        const [ins] = await conn.execute(
            `INSERT INTO assignment_submissions (assignment_id, student_id, submitted_at, file_url, marks_obtained, remarks)
            VALUES (?, ?, NOW(), ?, NULL, ?)
            ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), remarks = VALUES(remarks), submitted_at = NOW(), marks_obtained = NULL`,
            [assignmentId, student_id, file_url || null, remarks || null]
        );

        await conn.commit();
        conn.release();

        // fetch submission
        const [rows] = await db.execute('SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignmentId, student_id]);
        return res.status(201).json({ submission: rows[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/assignments/:id/submissions error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/assignments/:id/submissions
 * Query: ?limit&offset&status=graded|ungraded
 */
const GetAssignmentSubmissions = async (req, res) => {
    const assignmentId = toInt(req.params.id);
    if (!assignmentId) return res.status(400).json({ error: 'Invalid assignment id' });

    let limit = parseInt(req.query.limit || '200', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    const statusFilter = req.query.status ? String(req.query.status).toLowerCase() : null;

    try {
        const where = ['s.assignment_id = ?'];
        const params = [assignmentId];

        if (statusFilter === 'graded') where.push('s.marks_obtained IS NOT NULL');
        else if (statusFilter === 'ungraded') where.push('s.marks_obtained IS NULL');

        const baseSql = `
        FROM assignment_submissions s
        JOIN students st ON st.id = s.student_id
        JOIN users u ON u.id = st.user_id
        JOIN student_academic_records sar ON sar.student_id = s.student_id
        `;
        const whereSql = ' WHERE ' + where.join(' AND ');

        const [countRows] = await db.execute(`SELECT COUNT(*) AS total ${baseSql} ${whereSql}`, params);
        const total = (Array.isArray(countRows) && countRows[0]) ? Number(countRows[0].total || 0) : 0;

        const dataSql = `
        SELECT s.*, u.name AS student_name, u.email AS student_email, sar.roll_no
        ${baseSql}
        ${whereSql}
        ORDER BY s.submitted_at DESC
        LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(dataSql, params);

        return res.json({ total, limit, offset, submissions: rows });
    } catch (err) {
        console.error('GET /api/assignments/:id/submissions error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const GradeAssignmentSubmission = async (req, res) => {
    const submissionId = toInt(req.params.submission_id);
    const { marks_obtained, remarks } = req.body;
    if (!submissionId) return res.status(400).json({ error: 'Invalid submission id' });
    if (marks_obtained === undefined && remarks === undefined) return res.status(400).json({ error: 'At least one field required' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [srows] = await conn.execute('SELECT * FROM assignment_submissions WHERE id = ? FOR UPDATE', [submissionId]);
        if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Submission not found' }); }

        // Resolve teacher ID from the authenticated user's ID
        // In this schema, teachers.id matches users.id, but only if they are in the teachers table
        const [trows] = await conn.execute('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
        const teacherId = trows.length > 0 ? trows[0].id : null;

        const updates = []; const params = [];
        if (marks_obtained !== undefined) { updates.push('marks_obtained = ?'); params.push(marks_obtained); }
        if (remarks !== undefined) { updates.push('remarks = ?'); params.push(remarks || null); }

        // Always update the grader info
        updates.push('graded_by_teacher_id = ?');
        params.push(teacherId);

        updates.push('graded_at = NOW()');

        params.push(submissionId);
        await conn.execute(`UPDATE assignment_submissions SET ${updates.join(', ')} WHERE id = ?`, params);

        await conn.commit();
        conn.release();

        const [updated] = await db.execute('SELECT * FROM assignment_submissions WHERE id = ?', [submissionId]);
        return res.json({ submission: updated[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/assignments/grade/assignment/submissions/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * DELETE /api/assignments/submissions/:submission_id
 */

const DeleteAssignmentSubmission = async (req, res) => {
    const submissionId = toInt(req.params.submission_id);
    if (!submissionId) return res.status(400).json({ error: 'Invalid submission id' });

    try {
        const [result] = await db.execute('DELETE FROM assignment_submissions WHERE id = ?', [submissionId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Submission not found' });
        return res.json({ success: true, deleted_submission_id: submissionId });
    } catch (err) {
        console.error('DELETE /api/assignments/submissions/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/students/:id/assignments
 * List assignments and student's submission (if any) — useful for student dashboard
 * Query: ?limit&offset
 */

const GetStudentAssignments = async (req, res) => {
    const studentId = toInt(req.params.id);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    let limit = parseInt(req.query.limit || '200', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    try {
        // fetch assignments for student's class OR lesson-based assignments for their class
        // find student's class
        const [srows] = await db.execute('SELECT id, class_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1', [studentId]);
        if (srows.length === 0) return res.status(404).json({ error: 'Student not found' });
        const studentClassId = srows[0].class_id || null;
        // const academicYearId = srows[0].id || null;

        const baseSql = `
        FROM assignments a
        LEFT JOIN lessons l ON l.id = a.lesson_id
        LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
        LEFT JOIN academic_years ay ON ay.id = a.academic_year_id
        LEFT JOIN users u ON u.id = a.teacher_id
        `;
        const params = [studentId];

        // filter assignments applicable to student's class (either assignment.class_id or lesson.class_id)
        let whereSql = ' WHERE (COALESCE(a.class_id, l.class_id) = ?)';
        params.push(studentClassId);
        // params.push(academicYearId);

        const countSql = `SELECT COUNT(*) AS total ${baseSql} ${whereSql}`;
        const [countRows] = await db.execute(countSql, params);
        const total = (Array.isArray(countRows) && countRows[0]) ? Number(countRows[0].total || 0) : 0;

        const dataSql = `
        SELECT a.*, COALESCE(a.class_id, l.class_id) AS effective_class_id,
                s.id AS submission_id, s.file_url AS submission_file_url, s.marks_obtained, s.remarks AS submission_remarks, s.submitted_at, ay.name AS academic_year_name, u.name AS teacher_name
        ${baseSql}
        ${whereSql}
        ORDER BY a.assigned_date DESC, a.due_date DESC
        LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(dataSql, params);

        return res.json({ total, limit, offset, assignments: rows });
    } catch (err) {
        console.error('GET /api/students/:id/assignments error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


module.exports = {
    AddAssignment,
    GetAssignment,
    GetAssignmentById,
    UpdateAssignment,
    DeleteAssignment,
    SubmitAssignment,
    GetAssignmentSubmissions,
    GradeAssignmentSubmission,
    DeleteAssignmentSubmission,
    GetStudentAssignments
};