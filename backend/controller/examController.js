const formatMySQLDate = require('../config/deateConverter');
const db = require('../db');
const pdfService = require('../services/pdfService');
const storageService = require('../services/storageService');
const path = require('path');
const { generateAdmitCardPDF, generateExamRoutinePDF } = require('../helper/pdfHelper');
const whatsappQueue = require('../queues/whatsappQueue');

const toInt = v => (v === undefined || v === null || v === "" ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;

// Add Exam Group (Multiple subjects)
const AddExamGroup = async (req, res) => {
    const { name, exam_type, custom_exam_name, class_id, grade_id, academic_year_id, note, start_date, end_date, subjects } = req.body;
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
            `INSERT INTO exam_groups (name, exam_type, custom_exam_name, class_id, grade_id, academic_year_id, note, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW())`,
            [name.trim(), exam_type || 'OTHER', custom_exam_name || null, toInt(class_id) || null, toInt(grade_id), toInt(academic_year_id), note || null, start_date || null, end_date || null]
        );
        const examGroupId = egRes.insertId;

        // insert exam_group_subjects
        for (const sub of subjects) {
            const hasTheory = sub.has_theory === undefined ? 1 : (sub.has_theory ? 1 : 0);
            const hasLab = sub.has_lab ? 1 : 0;
            const hasOral = sub.has_oral ? 1 : 0;
            
            const thMax = hasTheory ? (toInt(sub.theory_max_marks) || 0) : 0;
            const lbMax = hasLab ? (toInt(sub.lab_max_marks) || 0) : 0;
            const orMax = hasOral ? (toInt(sub.oral_max_marks) || 0) : 0;
            
            const calculatedMax = (thMax + lbMax + orMax) || toInt(sub.max_marks) || 100;

            await conn.execute(
                `INSERT INTO exam_group_subjects (exam_group_id, subject_id, max_marks, passing_marks, has_theory, has_lab, has_oral, theory_max_marks, lab_max_marks, oral_max_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    examGroupId, 
                    toInt(sub.subject_id), 
                    calculatedMax, 
                    toInt(sub.passing_marks) || 35,
                    hasTheory,
                    hasLab,
                    hasOral,
                    hasTheory ? thMax : null,
                    hasLab ? lbMax : null,
                    hasOral ? orMax : null
                ]
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
        const gradeId = req.query.grade_id ? toInt(req.query.grade_id) : null;
        const academicYearId = req.query.academic_year_id ? toInt(req.query.academic_year_id) : null;
        const status = req.query.status;
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 2000);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

        let whereClause = [];
        let params = [];

        if (classId) {
            whereClause.push('eg.class_id = ?');
            params.push(classId);
        }
        if (gradeId) {
            whereClause.push('eg.grade_id = ?');
            params.push(gradeId);
        }
        if (academicYearId) {
            whereClause.push('eg.academic_year_id = ?');
            params.push(academicYearId);
        }
        if (status) {
            whereClause.push('eg.status = ?');
            params.push(status);
        }
        if (req.query.q) {
            whereClause.push('eg.name LIKE ?');
            params.push(`%${req.query.q}%`);
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
                SELECT egs.*, s.name AS subject_name, s.subject_type 
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
    const { name, exam_type, custom_exam_name, class_id, grade_id, academic_year_id, note, start_date, end_date, status, is_results_published, subjects } = req.body;

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (exam_type !== undefined) { updates.push('exam_type = ?'); params.push(exam_type); }
    if (class_id !== undefined) { updates.push('class_id = ?'); params.push(class_id === '' || class_id === null ? null : toInt(class_id)); }
    if (grade_id !== undefined) { updates.push('grade_id = ?'); params.push(toInt(grade_id)); }
    if (academic_year_id !== undefined) { updates.push('academic_year_id = ?'); params.push(toInt(academic_year_id)); }
    if (custom_exam_name !== undefined) { updates.push('custom_exam_name = ?'); params.push(custom_exam_name); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note); }
    if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (is_results_published !== undefined) { updates.push('is_results_published = ?'); params.push(is_results_published ? 1 : 0); }

    if (updates.length === 0 && (!subjects || !Array.isArray(subjects))) return res.status(400).json({ error: 'Nothing to update' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        if (updates.length > 0) {
            const updateParams = [...params, id];
            await conn.execute(`UPDATE exam_groups SET ${updates.join(', ')} WHERE id = ?`, updateParams);
        }

        if (subjects && Array.isArray(subjects)) {
            const [existingSubjects] = await conn.execute(`SELECT id, subject_id FROM exam_group_subjects WHERE exam_group_id = ?`, [id]);
            const existingSubjectMap = {};
            for(let s of existingSubjects) {
                existingSubjectMap[s.subject_id] = s.id;
            }

            const newSubjectIds = subjects.map(s => toInt(s.subject_id));
            const subjectsToDelete = existingSubjects.filter(s => !newSubjectIds.includes(s.subject_id)).map(s => s.id);
            
            if (subjectsToDelete.length > 0) {
                await conn.execute(`DELETE FROM exam_group_subjects WHERE id IN (${subjectsToDelete.join(',')})`);
            }

            for (const sub of subjects) {
                const subId = toInt(sub.subject_id);
                const hasTheory = sub.has_theory === undefined ? 1 : (sub.has_theory ? 1 : 0);
                const hasLab = sub.has_lab ? 1 : 0;
                const hasOral = sub.has_oral ? 1 : 0;
                
                const thMax = hasTheory ? (toInt(sub.theory_max_marks) || 0) : 0;
                const lbMax = hasLab ? (toInt(sub.lab_max_marks) || 0) : 0;
                const orMax = hasOral ? (toInt(sub.oral_max_marks) || 0) : 0;
                
                const calculatedMax = (thMax + lbMax + orMax) || toInt(sub.max_marks) || 100;
                const passMarks = toInt(sub.passing_marks) || 35;

                if (existingSubjectMap[subId]) {
                    await conn.execute(
                        `UPDATE exam_group_subjects SET max_marks=?, passing_marks=?, has_theory=?, has_lab=?, has_oral=?, theory_max_marks=?, lab_max_marks=?, oral_max_marks=? WHERE id=?`,
                        [
                            calculatedMax,
                            passMarks,
                            hasTheory,
                            hasLab,
                            hasOral,
                            hasTheory ? thMax : null,
                            hasLab ? lbMax : null,
                            hasOral ? orMax : null,
                            existingSubjectMap[subId]
                        ]
                    );
                } else {
                    await conn.execute(
                        `INSERT INTO exam_group_subjects (exam_group_id, subject_id, max_marks, passing_marks, has_theory, has_lab, has_oral, theory_max_marks, lab_max_marks, oral_max_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id, 
                            subId, 
                            calculatedMax, 
                            passMarks,
                            hasTheory,
                            hasLab,
                            hasOral,
                            hasTheory ? thMax : null,
                            hasLab ? lbMax : null,
                            hasOral ? orMax : null
                        ]
                    );
                }
            }
        }

        await conn.commit();
        conn.release();
        return res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/exam/groups/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const PublishExam = async (req, res) => {
    const id = toInt(req.params.id);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Get exam details
        const [examRows] = await conn.execute(`SELECT * FROM exam_groups WHERE id = ?`, [id]);
        if (examRows.length === 0) {
            conn.release();
            return res.status(404).json({ error: 'Exam not found' });
        }
        const exam = examRows[0];
        
        if (exam.status === 'Published') {
            conn.release();
            return res.status(400).json({ error: 'Exam is already published' });
        }

        // 2. Update status
        await conn.execute(`UPDATE exam_groups SET status = 'Published' WHERE id = ?`, [id]);

        await conn.commit();
        conn.release();

        // 3. Send Notifications
        const classId = exam.class_id;
        const gradeId = exam.grade_id;
        const academicYearId = exam.academic_year_id;
        
        let className = 'All Classes';
        let gradeName = '';
        if (classId) {
            const [classRows] = await db.execute('SELECT name FROM classes WHERE id = ?', [classId]);
            if (classRows.length > 0) className = classRows[0].name;
        } else if (gradeId) {
            const [gradeRows] = await db.execute('SELECT name FROM grades WHERE id = ?', [gradeId]);
            if (gradeRows.length > 0) {
                gradeName = gradeRows[0].name;
                className = `Grade: ${gradeName}`;
            }
        }

        // Notify Students/Parents of the Class or Grade
        // if (classId) {
        //     await notificationService.sendSchoolNotification({
        //         title: 'New Exam Published',
        //         message: `The exam schedule for ${exam.name} has been published.`,
        //         type: 'exam',
        //         targetType: 'class',
        //         targetValue: classId,
        //         metadata: { exam_id: exam.id },
        //         priority: 'high',
        //         createdBy: req.user ? req.user.id : null
        //     });
        // } else if (gradeId) {
        //     // Find all classes in this grade
        //     const [classesInGrade] = await db.execute('SELECT id FROM classes WHERE grade_id = ?', [gradeId]);
        //     for (const c of classesInGrade) {
        //         await notificationService.sendSchoolNotification({
        //             title: 'New Exam Published',
        //             message: `The exam schedule for ${exam.name} has been published.`,
        //             type: 'exam',
        //             targetType: 'class',
        //             targetValue: c.id,
        //             metadata: { exam_id: exam.id },
        //             priority: 'high',
        //             createdBy: req.user ? req.user.id : null
        //         });
        //     }
        // } else {
        //     // Notify All if both are null
        //     await notificationService.sendSchoolNotification({
        //         title: 'New Exam Published',
        //         message: `The exam schedule for ${exam.name} has been published.`,
        //         type: 'exam',
        //         targetType: 'all',
        //         targetValue: null,
        //         metadata: { exam_id: exam.id },
        //         priority: 'high',
        //         createdBy: req.user ? req.user.id : null
        //     });
        // }

        // // Notify Teachers
        // await notificationService.sendSchoolNotification({
        //     title: 'New Exam Published',
        //     message: `The exam schedule for ${exam.name} (${className}) has been published.`,
        //     type: 'exam',
        //     targetType: 'role',
        //     targetValue: 'teacher',
        //     metadata: { exam_id: exam.id },
        //     priority: 'normal',
        //     createdBy: req.user ? req.user.id : null
        // });

        // WhatsApp queue
        let usersQuery = '';
        const params = [];
        if (classId) {
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
                JOIN student_academic_records sar ON sar.student_id = s.id
                WHERE sar.class_id = ? AND sar.academic_year_id = ?
            `;
            params.push(classId, academicYearId);
        } else if (gradeId) {
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
                JOIN student_academic_records sar ON sar.student_id = s.id
                WHERE sar.grade_id = ? AND sar.academic_year_id = ?
            `;
            params.push(gradeId, academicYearId);
        } else {
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
            `;
        }

        const [contacts] = await db.execute(usersQuery, params);
        
        let msg = '';
        msg += `🔔 *Exam Schedule Published!* 🔔\n\n`;
        msg += `✨ *${exam.name}* ✨\n\n`;
        if (className !== 'All Classes') {
            msg += `📚 *Class:* ${className}\n`;
        }
        if (exam.start_date) {
            msg += `📅 *Starts:* ${new Date(exam.start_date).toLocaleDateString('en-IN')}\n`;
        }
        if (exam.end_date) {
            msg += `📅 *Ends:* ${new Date(exam.end_date).toLocaleDateString('en-IN')}\n`;
        }
        msg += `\nPlease check the application for the detailed routine.\n`;
        msg += `\nBest regards,\n`;
        msg += `CMC MITHILESH COMMERCE`;

        for (const c of contacts) {
            const phone = c.parent_contact || c.student_phone;
            if (phone) {
                await whatsappQueue.add('examNotification', {
                    contact: phone,
                    jobType: 'examNotification',
                    message: {
                        fallbackText: msg
                    }
                });
            }
        }

        // Teachers Whatsapp
        const [teacherContacts] = await db.execute(`SELECT u.phone FROM users u JOIN teachers t ON t.user_id = u.id WHERE u.phone IS NOT NULL`);
        let teacherMsg = `🔔 *Exam Published (Teachers)* 🔔\n\nExam: ${exam.name}\nClass: ${className}\n`;
        if (exam.start_date) teacherMsg += `Starts: ${new Date(exam.start_date).toLocaleDateString('en-IN')}\n`;
        teacherMsg += `\nBest regards,\nCMC MITHILESH COMMERCE`;

        for (const t of teacherContacts) {
            if (t.phone) {
                await whatsappQueue.add('examNotification', {
                    contact: t.phone,
                    jobType: 'examNotification',
                    message: { fallbackText: teacherMsg }
                });
            }
        }

        return res.json({ success: true, message: 'Exam published successfully' });
    } catch (err) {
        console.error('PUT /api/exam/publish/exams/:id error', err);
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
    // marks: [{ student_id, student_academic_id, subject_id, attendance_status, theory_marks_obtained, lab_marks_obtained, oral_marks_obtained }]
    if (!exam_group_id || !Array.isArray(marks)) return res.status(400).json({ error: 'exam_group_id and marks array required' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Verify results are not published
        const [[examGroup]] = await conn.execute(`SELECT is_results_published FROM exam_groups WHERE id = ?`, [exam_group_id]);
        if (examGroup && examGroup.is_results_published) {
            conn.release();
            return res.status(400).json({ error: 'Cannot add or update marks after results are published' });
        }

        // Get subjects for this group
        const [subRows] = await conn.execute(`
            SELECT egs.id, egs.subject_id, egs.passing_marks, egs.max_marks, egs.has_theory, egs.has_lab, egs.has_oral, s.subject_type 
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ?
        `, [exam_group_id]);
        const subjectMap = {}; // subject_id -> { id, max_marks, has_theory, has_lab, has_oral, subject_type }
        subRows.forEach(s => subjectMap[s.subject_id] = s);

        for (const m of marks) {
            const groupSub = subjectMap[m.subject_id];
            if (!groupSub) continue;

            const hasTheory = groupSub.has_theory;
            const hasLab = groupSub.has_lab;
            const hasOral = groupSub.has_oral;

            let thMarks = null;
            let lbMarks = null;
            let orMarks = null;
            let totalObtained = null;

            if (m.attendance_status === 'Present') {
                thMarks = hasTheory && m.theory_marks_obtained !== undefined && m.theory_marks_obtained !== null && m.theory_marks_obtained !== '' ? parseFloat(m.theory_marks_obtained) : null;
                lbMarks = hasLab && m.lab_marks_obtained !== undefined && m.lab_marks_obtained !== null && m.lab_marks_obtained !== '' ? parseFloat(m.lab_marks_obtained) : null;
                orMarks = hasOral && m.oral_marks_obtained !== undefined && m.oral_marks_obtained !== null && m.oral_marks_obtained !== '' ? parseFloat(m.oral_marks_obtained) : null;
                
                if (thMarks === null && lbMarks === null && orMarks === null) {
                    totalObtained = null;
                } else {
                    totalObtained = (thMarks || 0) + (lbMarks || 0) + (orMarks || 0);
                }
            }

            // Simple grade calculation based on percentage (if academic) or use provided grade (if non-academic)
            let grade = 'F';
            if (groupSub.subject_type === 'co-scholastic' || groupSub.subject_type === 'skill-based') {
                grade = m.grade || null; // Accept direct grade from frontend, allow null to clear
                totalObtained = null; // No numeric marks
            } else {
                if (m.attendance_status === 'Present' && totalObtained !== null) {
                    if (totalObtained >= groupSub.passing_marks) {
                        const percentage = (totalObtained / groupSub.max_marks) * 100;
                        if (percentage >= 91) grade = 'A+';
                        else if (percentage >= 81) grade = 'A';
                        else if (percentage >= 71) grade = 'B+';
                        else if (percentage >= 61) grade = 'B';
                        else if (percentage >= 51) grade = 'C';
                        else if (percentage >= 41) grade = 'D';
                        else grade = 'P';
                    } else {
                        grade = 'F';
                    }
                } else if (m.attendance_status === 'Absent') {
                    grade = 'AB';
                } else if (m.attendance_status === 'Present' && totalObtained === null) {
                    grade = null;
                }
            }

            await conn.execute(`
                INSERT INTO exam_group_results (exam_group_subject_id, student_id, student_academic_id, attendance_status, marks_obtained, theory_marks_obtained, lab_marks_obtained, oral_marks_obtained, grade, teacher_remark, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    attendance_status = VALUES(attendance_status),
                    marks_obtained = VALUES(marks_obtained),
                    theory_marks_obtained = VALUES(theory_marks_obtained),
                    lab_marks_obtained = VALUES(lab_marks_obtained),
                    oral_marks_obtained = VALUES(oral_marks_obtained),
                    grade = VALUES(grade),
                    teacher_remark = VALUES(teacher_remark),
                    recorded_at = NOW()
            `, [groupSub.id, m.student_id, m.student_academic_id, m.attendance_status, totalObtained, thMarks, lbMarks, orMarks, grade, m.teacher_remark || null]);
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
                       egr.marks_obtained, egr.grade as result_grade, egr.attendance_status,
                       egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained
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
            SELECT eg.id as exam_group_id, eg.name as exam_name, eg.exam_type, eg.custom_exam_name, eg.is_results_published, 
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
        const limit = Math.min(parseInt(req.query.limit || '10', 10), 500);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);
        const gradeId = req.query.grade_id && req.query.grade_id !== 'all' ? toInt(req.query.grade_id) : null;
        const academicYearId = req.query.academic_year_id && req.query.academic_year_id !== 'all' ? toInt(req.query.academic_year_id) : null;
        const search = req.query.q ? `%${req.query.q}%` : null;

        let studentBaseSql = `
            FROM students st
            JOIN users u ON u.id = st.user_id
            JOIN student_academic_records sar ON sar.student_id = st.id
            JOIN (
                SELECT student_id, MAX(id) latest_id
                FROM student_academic_records
                GROUP BY student_id
            ) latest ON latest.student_id = st.id AND latest.latest_id = sar.id
            WHERE EXISTS (
                SELECT 1 FROM exam_group_results egr WHERE egr.student_id = st.id
            )
        `;

        let whereClause = [];
        let params = [];

        if (gradeId) {
            whereClause.push('sar.grade_id = ?');
            params.push(gradeId);
        }
        if (academicYearId) {
            whereClause.push('sar.academic_year_id = ?');
            params.push(academicYearId);
        }
        if (search) {
            whereClause.push(`(
                u.name LIKE ? OR 
                sar.roll_no LIKE ? OR 
                EXISTS (
                    SELECT 1 
                    FROM exam_group_results egr2 
                    JOIN exam_group_subjects egs2 ON egs2.id = egr2.exam_group_subject_id
                    JOIN exam_groups eg2 ON eg2.id = egs2.exam_group_id
                    WHERE egr2.student_id = st.id 
                    AND (eg2.name LIKE ? OR eg2.exam_type LIKE ?)
                )
            )`);
            params.push(search, search, search, search);
        }

        if (whereClause.length > 0) {
            studentBaseSql += ' AND ' + whereClause.join(' AND ');
        }

        const [countRows] = await db.execute(`SELECT COUNT(st.id) AS total ${studentBaseSql}`, params);
        const total = countRows[0].total;

        const [studentRows] = await db.execute(`SELECT st.id ${studentBaseSql} ORDER BY u.name ASC LIMIT ${limit} OFFSET ${offset}`, params);
        
        if (studentRows.length === 0) {
            return res.json({ studentSummaries: [], total, limit, offset });
        }

        const studentIds = studentRows.map(r => r.id);

        const [rows] = await db.query(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.exam_type, eg.custom_exam_name, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.theory_max_marks, egs.lab_max_marks, egs.oral_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   COALESCE(
                       (
                           SELECT CASE WHEN si.status = 'paid' THEN 1 ELSE 0 END
                           FROM student_invoices si
                           WHERE si.student_id = u.id
                           ORDER BY si.id DESC LIMIT 1
                       ),
                       1
                   ) as due_cleared
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
            WHERE st.id IN (?)
            ORDER BY u.name ASC, eg.start_date DESC
        `, [studentIds]);

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
                    due_cleared: row.due_cleared === 1,
                    exams: {} // Group exams by id to handle multiple subjects
                };
            }

            if (!studentMap[row.student_id].exams[row.exam_id]) {
                studentMap[row.student_id].exams[row.exam_id] = {
                    id: row.exam_id,
                    name: row.exam_name,
                    exam_type: row.exam_type,
                    custom_exam_name: row.custom_exam_name,
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
                attendance_status: row.attendance_status,
                has_theory: row.has_theory,
                has_lab: row.has_lab,
                has_oral: row.has_oral,
                theory_max_marks: row.theory_max_marks,
                lab_max_marks: row.lab_max_marks,
                oral_max_marks: row.oral_max_marks,
                theory_marks_obtained: row.theory_marks_obtained,
                lab_marks_obtained: row.lab_marks_obtained,
                oral_marks_obtained: row.oral_marks_obtained
            });
        });

        // Convert exams object back to array
        const result = Object.values(studentMap).map(s => ({
            ...s,
            exams: Object.values(s.exams)
        }));

        // Sort results to match student order
        const sortedResult = [];
        studentIds.forEach(sid => {
            const stu = result.find(r => r.id === sid);
            if (stu) sortedResult.push(stu);
        });

        return res.json({ studentSummaries: sortedResult, total, limit, offset });
    } catch (err) {
        console.error('GET /api/exam/all-student-summaries error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GetSupervisedClassExamTrends = async (req, res) => {
    return res.json({ trends: [] });
}


const GenerateMarksheetPDF = async (req, res) => {
    const { student_id, exam_id } = req.body;

    if (!student_id || !exam_id) {
        return res.status(400).json({ error: 'student_id and exam_id are required' });
    }

    try {
        // Fetch the specific student and exam data exactly as GetAllStudentExamSummaries does, but filtered.
        const [rows] = await db.execute(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.theory_max_marks, egs.lab_max_marks, egs.oral_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained, egr.teacher_remark
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
            WHERE st.id = ? AND eg.id = ? 
              AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
        `, [student_id, exam_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Marksheet data not found' });
        }

        const student = {
            id: rows[0].student_id,
            name: rows[0].student_name,
            roll_no: rows[0].roll_no || 'N/A',
            grade_name: rows[0].grade_name || 'N/A',
            academic_year_name: rows[0].academic_year_name || 'N/A'
        };

        const examDate = rows[0].start_date ? formatMySQLDate(rows[0].start_date) : 'N/A';
        const exam = {
            name: rows[0].exam_name,
            formattedDate: examDate,
            subjects: []
        };

        let totalMax = 0;
        let totalObtained = 0;
        let serialNo = 1;

        rows.forEach(row => {
            if (row.marks_obtained === null && row.attendance_status !== 'Absent') {
                return; // Skip subject if no marks have been recorded
            }

            exam.subjects.push({
                serial_no: serialNo++,
                subject_name: row.subject_name,
                marks_obtained: row.marks_obtained !== null && row.marks_obtained !== undefined ? Math.round(Number(row.marks_obtained)) : row.marks_obtained,
                max_marks: row.max_marks,
                grade: row.grade || '-',
                attendance_status: row.attendance_status,
                has_theory: row.has_theory,
                has_lab: row.has_lab,
                has_oral: row.has_oral,
                theory_max_marks: row.theory_max_marks,
                lab_max_marks: row.lab_max_marks,
                oral_max_marks: row.oral_max_marks,
                theory_marks_obtained: row.theory_marks_obtained !== null && row.theory_marks_obtained !== undefined ? Math.round(Number(row.theory_marks_obtained)) : row.theory_marks_obtained,
                lab_marks_obtained: row.lab_marks_obtained !== null && row.lab_marks_obtained !== undefined ? Math.round(Number(row.lab_marks_obtained)) : row.lab_marks_obtained,
                oral_marks_obtained: row.oral_marks_obtained !== null && row.oral_marks_obtained !== undefined ? Math.round(Number(row.oral_marks_obtained)) : row.oral_marks_obtained
            });
            totalMax += Number(row.max_marks || 0);
            if (row.attendance_status !== 'Absent') {
                totalObtained += Number(row.marks_obtained || 0);
            }
        });

        totalObtained = Math.round(totalObtained);

        const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
        const showTheory = exam.subjects.some(s => checkTrue(s.has_theory));
        const showLab = exam.subjects.some(s => checkTrue(s.has_lab));
        const showOral = exam.subjects.some(s => checkTrue(s.has_oral));

        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
        const currentDate = new Date().toLocaleDateString();

        let hasFailed = false;
        let dynamicTeacherRemark = null;
        rows.forEach(row => {
            if (row.grade === 'F' || row.attendance_status === 'Absent') {
                hasFailed = true;
            }
            if (row.teacher_remark) {
                dynamicTeacherRemark = row.teacher_remark;
            }
        });
        const finalResult = hasFailed ? 'Fail' : 'Pass';
        const teacherRemark = dynamicTeacherRemark || (hasFailed ? 'Need to do hardwork.' : 'Good performance. Keep it up!');

        let logoData = null;
        try {
            const logoPath = require('path').join(__dirname, '../assets/school_invoice_logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        const templateData = {
            student,
            exam: {
                ...exam,
                showTheory,
                showLab,
                showOral
            },
            totalMax,
            totalObtained,
            percentage,
            currentDate,
            finalResult,
            teacherRemark,
            logoData
        };

        const templatePath = 'uploads/templates/student_marksheet.hbs';

        // Render HBS to PDF buffer
        const pdfBuffer = await pdfService.renderHbsTemplate(templatePath, templateData, {
            width: 794,
            height: 1123
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Marksheet_${student_id}_${exam_id}.pdf`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /api/exam/generate-marksheet error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GenerateAdmitCardPDF = async (req, res) => {
    const { student_id, exam_id } = req.body;
    if (!student_id || !exam_id) {
        return res.status(400).json({ error: 'Student ID and Exam ID are required' });
    }

    try {
        // 1. Fetch student info
        const [[student]] = await db.execute(`
            SELECT st.id, u.name, sar.roll_no, g.name AS grade_name, c.name AS class_name, st.fathers_name, ay.name AS academic_year_name, u.id AS user_id
            FROM students st
            JOIN users u ON u.id = st.user_id
            LEFT JOIN student_academic_records sar ON sar.student_id = st.id
            LEFT JOIN grades g ON g.id = sar.grade_id
            LEFT JOIN classes c ON c.id = sar.class_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
            WHERE st.id = ?
            ORDER BY sar.id DESC LIMIT 1
        `, [student_id]);

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // 2. Double-check due cleared status on current invoice!
        const [[invoice]] = await db.execute(`
            SELECT status, (amount_due - amount_paid) as balance
            FROM student_invoices
            WHERE student_id = ?
            ORDER BY id DESC LIMIT 1
        `, [student.user_id]);

        // If an invoice exists and the status is NOT paid, prevent printing!
        if (invoice && invoice.status !== 'paid') {
            return res.status(403).json({ error: 'Admit Card locked: Dues must be fully cleared on the current invoice.' });
        }

        // 3. Fetch exam group info
        const [[examGroup]] = await db.execute(`
            SELECT name FROM exam_groups WHERE id = ?
        `, [exam_id]);

        if (!examGroup) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // 4. Fetch the schedule / routine for the exam group
        const [routine] = await db.execute(`
            SELECT egs.exam_date, egs.start_time, egs.end_time, s.name AS subject_name
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ? 
              AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
            ORDER BY egs.exam_date ASC, egs.start_time ASC
        `, [exam_id]);

        // 5. Generate Admit Card PDF
        const pdfBuffer = await generateAdmitCardPDF({
            student,
            exam_id,
            exam_name: examGroup.name,
            routine
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=AdmitCard_${student.name.replace(/\s+/g, '_')}_${examGroup.name.replace(/\s+/g, '_')}.pdf`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /api/exam/generate-admit-card error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const GenerateExamRoutinePDF = async (req, res) => {
    const { exam_id } = req.body;
    if (!exam_id) {
        return res.status(400).json({ error: 'Exam ID is required' });
    }

    try {
        // Fetch exam group info
        const [[examGroup]] = await db.execute(`
            SELECT eg.name, ay.name AS academic_year_name
            FROM exam_groups eg
            LEFT JOIN academic_years ay ON ay.id = eg.academic_year_id
            WHERE eg.id = ?
        `, [exam_id]);

        if (!examGroup) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Fetch the schedule / routine for the exam group
        const [routine] = await db.execute(`
            SELECT egs.exam_date, egs.start_time, egs.end_time, s.name AS subject_name
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ? 
              AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
            ORDER BY egs.exam_date ASC, egs.start_time ASC
        `, [exam_id]);

        // Generate Exam Routine PDF
        const pdfBuffer = await generateExamRoutinePDF({
            exam_name: examGroup.name,
            exam_session: examGroup.academic_year_name || 'N/A',
            routine
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ExamRoutine_${examGroup.name.replace(/\s+/g, '_')}.pdf`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /api/exam/generate-exam-routine error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const GenerateCombinedMarksheetPDF = async (req, res) => {
    const { student_id, type, academic_year_id } = req.body;
    
    if (!student_id || !type || !academic_year_id) {
        return res.status(400).json({ error: 'student_id, type, and academic_year_id are required' });
    }

    try {
        let examTypes = [];
        let reportTitle = '';
        if (type === 'UNIT_TEST_COMBINED') {
            examTypes = ['UNIT_TEST_1', 'UNIT_TEST_2'];
            reportTitle = 'Combined Unit Test Marksheet';
        } else if (type === 'FINAL_TERM_COMBINED') {
            examTypes = ['TERM_1', 'TERM_2'];
            reportTitle = 'Final Term Marksheet';
        } else {
            return res.status(400).json({ error: 'Invalid combine type' });
        }

        const [rows] = await db.execute(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.exam_type, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                   egr.teacher_remark, egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.theory_max_marks, egs.lab_max_marks, egs.oral_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   s.subject_type
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
            WHERE st.id = ? AND eg.exam_type IN (?, ?) AND eg.academic_year_id = ?
        `, [student_id, examTypes[0], examTypes[1], academic_year_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No data found for the combined marksheet' });
        }

        const student = {
            id: rows[0].student_id,
            name: rows[0].student_name,
            roll_no: rows[0].roll_no || 'N/A',
            grade_name: rows[0].grade_name || 'N/A',
            academic_year_name: rows[0].academic_year_name || 'N/A'
        };

        const subjectsMap = {};
        const examNames = {};
        let totalMax = 0;
        let totalObtained = 0;

        rows.forEach(row => {
            if (!examNames[row.exam_type]) {
                examNames[row.exam_type] = row.exam_name;
            }
            if (!subjectsMap[row.subject_name]) {
                subjectsMap[row.subject_name] = {
                    subject_name: row.subject_name,
                    exam1_marks: '-',
                    exam2_marks: '-',
                    exam1_grade: '-',
                    exam2_grade: '-',
                    exam1_max: 0,
                    exam2_max: 0,
                    exam1_theory: '-', exam1_lab: '-', exam1_oral: '-',
                    exam2_theory: '-', exam2_lab: '-', exam2_oral: '-',
                    has_theory: false,
                    has_lab: false,
                    has_oral: false,
                    total: 0,
                    max: 0,
                    hasFailedSubject: false,
                    subject_type: row.subject_type || 'academic'
                };
            }

            const sub = subjectsMap[row.subject_name];
            const isAcademic = row.subject_type === 'academic' || !row.subject_type;

            if (isAcademic) {
                sub.max += Number(row.max_marks || 0);
                totalMax += Number(row.max_marks || 0);
            }

            let obtained = 0;
            if (row.attendance_status !== 'Absent' && row.marks_obtained !== null && row.marks_obtained !== '') {
                obtained = Number(row.marks_obtained);
                if (isAcademic) {
                    totalObtained += obtained;
                }
            }

            if (isAcademic && (row.grade === 'F' || row.attendance_status === 'Absent')) {
                sub.hasFailedSubject = true;
            }

            const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
            if (checkTrue(row.has_theory)) sub.has_theory = true;
            if (checkTrue(row.has_lab)) sub.has_lab = true;
            if (checkTrue(row.has_oral)) sub.has_oral = true;

            const formatMarks = (obtained, has) => {
                if (!has) return '-';
                if (row.attendance_status === 'Absent') return 'AB';
                return `${Math.round(Number(obtained || 0))}`;
            };

            if (row.exam_type === examTypes[0]) {
                sub.exam1_marks = row.attendance_status === 'Absent' ? 'AB' : Math.round(obtained);
                sub.exam1_grade = row.grade || '-';
                sub.exam1_max = row.max_marks || 0;
                sub.exam1_theory = formatMarks(row.theory_marks_obtained, checkTrue(row.has_theory));
                sub.exam1_lab = formatMarks(row.lab_marks_obtained, checkTrue(row.has_lab));
                sub.exam1_oral = formatMarks(row.oral_marks_obtained, checkTrue(row.has_oral));
            } else if (row.exam_type === examTypes[1]) {
                sub.exam2_marks = row.attendance_status === 'Absent' ? 'AB' : Math.round(obtained);
                sub.exam2_grade = row.grade || '-';
                sub.exam2_max = row.max_marks || 0;
                sub.exam2_theory = formatMarks(row.theory_marks_obtained, checkTrue(row.has_theory));
                sub.exam2_lab = formatMarks(row.lab_marks_obtained, checkTrue(row.has_lab));
                sub.exam2_oral = formatMarks(row.oral_marks_obtained, checkTrue(row.has_oral));
            }
            sub.total += obtained;
        });

        const subjects = Object.values(subjectsMap).map((sub, idx) => {
            const isAcademic = sub.subject_type === 'academic' || !sub.subject_type;
            let grade = 'F';
            let percentage = '-';
            let yearly_avg = '-';
            let t1_pct = 0;
            let t2_pct = 0;

            if (isAcademic) {
                const percentageVal = sub.max > 0 ? (sub.total / sub.max) * 100 : 0;
                percentage = sub.max > 0 ? percentageVal.toFixed(2) : '-';
                yearly_avg = sub.max > 0 ? Math.round(percentageVal) : '-';
                
                if (percentageVal >= 90) grade = 'A+';
                else if (percentageVal >= 80) grade = 'A';
                else if (percentageVal >= 70) grade = 'B';
                else if (percentageVal >= 60) grade = 'C';
                else if (percentageVal >= 35) grade = 'P'; // assuming 35% passing
                else grade = 'F';
                
                if (sub.hasFailedSubject) grade = 'F';

                t1_pct = sub.exam1_max > 0 ? ((sub.exam1_marks === 'AB' || sub.exam1_marks === '-' ? 0 : sub.exam1_marks) / sub.exam1_max) * 100 : 0;
                t2_pct = sub.exam2_max > 0 ? ((sub.exam2_marks === 'AB' || sub.exam2_marks === '-' ? 0 : sub.exam2_marks) / sub.exam2_max) * 100 : 0;
            } else {
                if (sub.exam2_grade && sub.exam2_grade !== '-') grade = sub.exam2_grade;
                else if (sub.exam1_grade && sub.exam1_grade !== '-') grade = sub.exam1_grade;
                else grade = '-';
            }

            const overall_grade = grade;

            return {
                serial_no: idx + 1,
                ...sub,
                percentage,
                yearly_avg,
                overall_grade,
                grade,
                t1_pct,
                t2_pct
            };
        });

        const academicSubjects = subjects.filter(s => s.subject_type === 'academic' || !s.subject_type);

        // Generate SVG chart data (only for academic subjects)
        const svgWidth = 450;
        const svgHeight = 150;
        const padding = 30;
        
        let t1Points = [];
        let t2Points = [];
        let xLabels = [];
        
        if (academicSubjects.length > 0) {
            const xStep = (svgWidth - padding * 2) / Math.max(1, (academicSubjects.length - 1));
            academicSubjects.forEach((sub, idx) => {
                const x = padding + (idx * xStep);
                const y1 = svgHeight - padding - (sub.t1_pct / 100) * (svgHeight - padding * 2);
                const y2 = svgHeight - padding - (sub.t2_pct / 100) * (svgHeight - padding * 2);
                
                t1Points.push(`${x},${y1}`);
                t2Points.push(`${x},${y2}`);
                xLabels.push({ x, name: sub.subject_name.substring(0, 10) }); // truncate long names
            });
        }
        
        const chartData = {
            t1Path: t1Points.join(' '),
            t2Path: t2Points.join(' '),
            points1: t1Points.map(p => { const [x, y] = p.split(','); return {x, y}; }),
            points2: t2Points.map(p => { const [x, y] = p.split(','); return {x, y}; }),
            labels: xLabels,
            width: svgWidth,
            height: svgHeight
        };

        totalObtained = Math.round(totalObtained);
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
        const currentDate = new Date().toLocaleDateString();


        // Promotion logic
        let hasFailed = academicSubjects.some(s => s.hasFailedSubject || s.grade === 'F');
        // Passing rule based on percentage >= 35
        let isPassingTotal = percentage >= 35;
        let finalResult = 'Pass';
        if (hasFailed || !isPassingTotal) {
            finalResult = 'Fail';
        }
        
        let promotionStatus = type === 'FINAL_TERM_COMBINED' 
            ? (finalResult === 'Pass' ? 'Promoted' : 'Not Promoted') 
            : null;

        let logoData = null;
        try {
            const logoPath = require('path').join(__dirname, '../assets/school_invoice_logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        const showTheory = academicSubjects.some(s => s.has_theory);
        const showLab = academicSubjects.some(s => s.has_lab);
        const showOral = academicSubjects.some(s => s.has_oral);
        const showFinalResult = !(showTheory || showLab || showOral);
        let examColSpan = 3; // Max, Obtained, Grade
        if (showTheory) examColSpan++;
        if (showLab) examColSpan++;
        if (showOral) examColSpan++;

        const coScholastic = subjects.filter(s => s.subject_type === 'co-scholastic').map(s => ({
            name: s.subject_name,
            term1: s.exam1_grade !== '-' ? s.exam1_grade : (s.exam1_marks !== '-' ? s.exam1_marks : ''),
            term2: s.exam2_grade !== '-' ? s.exam2_grade : (s.exam2_marks !== '-' ? s.exam2_marks : '')
        }));

        const skillBased = subjects.filter(s => s.subject_type === 'skill-based').map(s => ({
            name: s.subject_name,
            term1: s.exam1_grade !== '-' ? s.exam1_grade : (s.exam1_marks !== '-' ? s.exam1_marks : ''),
            term2: s.exam2_grade !== '-' ? s.exam2_grade : (s.exam2_marks !== '-' ? s.exam2_marks : '')
        }));

        const physicalStats = {
            height: student.height || "166 cm",
            weight: student.weight || "44 kg",
            attendance: student.attendance || "196/230"
        };

        const templateData = {
            student,
            reportTitle,
            exam1Name: examNames[examTypes[0]] || examTypes[0].replace(/_/g, ' '),
            exam2Name: examNames[examTypes[1]] || examTypes[1].replace(/_/g, ' '),
            subjects: academicSubjects,
            showTheory,
            showLab,
            showOral,
            showFinalResult,
            examColSpan,
            totalMax,
            totalObtained,
            percentage,
            currentDate,
            finalResult,
            promotionStatus,
            logoData,
            chartData,
            coScholastic,
            skillBased,
            physicalStats
        };

        const templatePath = 'uploads/templates/combined-marksheet.hbs';

        const pdfBuffer = await pdfService.renderHbsTemplate(templatePath, templateData, {
            width: 794,
            height: 1123
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=CombinedMarksheet_${student_id}_${type}.pdf`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /api/exam/generate-combined-marksheet error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GenerateConsolidatedMarksheetPDF = async (req, res) => {
    const { exam_id } = req.body;
    if (!exam_id) return res.status(400).json({ error: 'exam_id is required' });

    try {
        // Fetch exam group info
        const [[examGroup]] = await db.execute(`
            SELECT eg.name as exam_name, eg.start_date,
                   c.name as class_name, g.name as grade_name, ay.name as academic_year_name
            FROM exam_groups eg
            LEFT JOIN classes c ON c.id = eg.class_id
            LEFT JOIN grades g ON g.id = eg.grade_id
            LEFT JOIN academic_years ay ON ay.id = eg.academic_year_id
            WHERE eg.id = ?
        `, [exam_id]);

        if (!examGroup) return res.status(404).json({ error: 'Exam not found' });

        const sessionName = examGroup.academic_year_name || 'N/A';
        const examName = examGroup.exam_name;
        const className = examGroup.class_name || examGroup.grade_name || 'All';

        // Fetch subjects
        const [subjects] = await db.execute(`
            SELECT egs.id as exam_group_subject_id, s.name as subject_name,
                   egs.max_marks, egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.theory_max_marks, egs.lab_max_marks, egs.oral_max_marks,
                   s.subject_type
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ?
              AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
            ORDER BY egs.id ASC
        `, [exam_id]);

        // Process subjects for columns
        const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
        
        let totalMaxAll = 0;
        const formattedSubjects = subjects.map(sub => {
            const hasTheory = checkTrue(sub.has_theory);
            const hasLab = checkTrue(sub.has_lab);
            const hasOral = checkTrue(sub.has_oral);
            
            let colSpan = 0;
            if (hasTheory) colSpan++;
            if (hasLab) colSpan++;
            if (hasOral) colSpan++;
            colSpan++; // For total of the subject
            
            totalMaxAll += Number(sub.max_marks || 0);

            return {
                id: sub.exam_group_subject_id,
                name: sub.subject_name,
                hasTheory, hasLab, hasOral,
                theoryMax: sub.theory_max_marks,
                labMax: sub.lab_max_marks,
                oralMax: sub.oral_max_marks,
                totalMax: sub.max_marks,
                colSpan
            };
        });

        // Fetch students and marks
        const [results] = await db.execute(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, st.fathers_name,
                   egr.exam_group_subject_id,
                   egr.marks_obtained, egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   egr.attendance_status, egr.grade, egr.teacher_remark
            FROM exam_group_results egr
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            LEFT JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            WHERE egs.exam_group_id = ?
            ORDER BY CAST(sar.roll_no AS UNSIGNED) ASC, u.name ASC
        `, [exam_id]);

        const studentsMap = {};
        const orderedStudentIds = [];
        results.forEach(row => {
            if (!studentsMap[row.student_id]) {
                orderedStudentIds.push(row.student_id);
                studentsMap[row.student_id] = {
                    rollNo: row.roll_no || '-',
                    name: row.student_name,
                    fatherName: row.fathers_name || '-',
                    marksMap: {},
                    grandTotal: 0,
                    hasFailed: false,
                    isAbsent: true,
                    teacherRemark: null
                };
            }
            
            if (row.attendance_status !== 'Absent') {
                studentsMap[row.student_id].isAbsent = false;
            }
            
            if (row.grade === 'F' || row.attendance_status === 'Absent') {
                studentsMap[row.student_id].hasFailed = true;
            }

            if (row.teacher_remark) {
                studentsMap[row.student_id].teacherRemark = row.teacher_remark;
            }

            studentsMap[row.student_id].marksMap[row.exam_group_subject_id] = {
                theory: row.theory_marks_obtained,
                lab: row.lab_marks_obtained,
                oral: row.oral_marks_obtained,
                total: row.marks_obtained,
                attendance_status: row.attendance_status
            };
            
            if (row.marks_obtained !== null && row.attendance_status !== 'Absent') {
                studentsMap[row.student_id].grandTotal += Number(row.marks_obtained);
            }
        });

        const formattedStudents = orderedStudentIds.map(studentId => {
            const student = studentsMap[studentId];
            const marks = formattedSubjects.map(sub => {
                const sm = student.marksMap[sub.id];
                if (!sm || sm.attendance_status === 'Absent') {
                    return {
                        theory: 'AB', lab: 'AB', oral: 'AB', total: 'AB',
                        hasTheory: sub.hasTheory, hasLab: sub.hasLab, hasOral: sub.hasOral,
                        isAbsent: true
                    };
                }
                return {
                    theory: sm.theory !== null && sm.theory !== undefined ? sm.theory : '-',
                    lab: sm.lab !== null && sm.lab !== undefined ? sm.lab : '-',
                    oral: sm.oral !== null && sm.oral !== undefined ? sm.oral : '-',
                    total: sm.total !== null && sm.total !== undefined ? sm.total : '-',
                    hasTheory: sub.hasTheory, hasLab: sub.hasLab, hasOral: sub.hasOral,
                    isAbsent: false
                };
            });
            
            const defaultRemark = student.isAbsent ? '-' : (student.hasFailed ? 'Need to do hardwork.' : 'Good performance. Keep it up!');
            
            return {
                rollNo: student.rollNo,
                name: student.name,
                fatherName: student.fatherName,
                marks,
                grandTotal: student.isAbsent ? 'AB' : student.grandTotal,
                result: student.isAbsent ? 'ABSENT' : (student.hasFailed ? 'FAIL' : 'PASS'),
                teacherRemark: student.teacherRemark || defaultRemark
            };
        });

        const templateData = {
            academicSession: sessionName,
            examName: examName,
            className: className,
            subjects: formattedSubjects,
            totalMaxAll: totalMaxAll,
            students: formattedStudents
        };

        const templatePath = 'uploads/templates/consolidated_marksheet.hbs';
        
        // Render HBS to PDF buffer
        const pdfBuffer = await pdfService.renderHbsTemplate(templatePath, templateData, {
            width: 1123,
            height: 794,
            pageRanges: '', // print all pages
            displayHeaderFooter: true,
            margin: { top: '30px', right: '0', bottom: '60px', left: '0' },
            footerTemplate: `
                <div style="font-size: 10px; color: #64748b; width: 100%; padding: 0 40px; display: flex; justify-content: space-between; font-family: 'Montserrat', sans-serif;">
                    <span>Times International School Academic Record &mdash; ${examName}</span>
                    <span>Page <span class="pageNumber"></span></span>
                </div>
            `
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Consolidated_Marksheet_${exam_id}.pdf`);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('POST /api/exam/generate-consolidated-marksheet error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const GenerateBulkMarksheetPDF = async (req, res) => {
    const { student_ids, exam_id } = req.body;

    if (!student_ids || !exam_id || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array and exam_id are required' });
    }

    try {
        const pdfBuffers = [];
        let logoData = null;
        try {
            const logoPath = require('path').join(__dirname, '../assets/school_invoice_logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        for (let student_id of student_ids) {
            const [rows] = await db.execute(`
                SELECT st.id as student_id, u.name as student_name, sar.roll_no, 
                       COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                       COALESCE(g.name, eg_g.name) as grade_name, 
                       COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                       COALESCE(ay.name, eg_ay.name) as academic_year_name,
                       eg.id as exam_id, eg.name as exam_name, eg.start_date, eg.is_results_published,
                       egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                       egs.has_theory, egs.has_lab, egs.has_oral,
                       egs.theory_max_marks, egs.lab_max_marks, egs.oral_max_marks,
                       egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained, egr.teacher_remark
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
                WHERE st.id = ? AND eg.id = ? 
                  AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
            `, [student_id, exam_id]);

            if (rows.length === 0) continue;

            const student = {
                id: rows[0].student_id,
                name: rows[0].student_name,
                roll_no: rows[0].roll_no || 'N/A',
                grade_name: rows[0].grade_name || 'N/A',
                academic_year_name: rows[0].academic_year_name || 'N/A'
            };

            const examDate = rows[0].start_date ? formatMySQLDate(rows[0].start_date) : 'N/A';
            const exam = {
                name: rows[0].exam_name,
                formattedDate: examDate,
                subjects: []
            };

            let totalMax = 0;
            let totalObtained = 0;
            let serialNo = 1;

            rows.forEach(row => {
                if (row.marks_obtained === null && row.attendance_status !== 'Absent') {
                    return;
                }

                exam.subjects.push({
                    serial_no: serialNo++,
                    subject_name: row.subject_name,
                    marks_obtained: row.marks_obtained !== null && row.marks_obtained !== undefined ? Math.round(Number(row.marks_obtained)) : row.marks_obtained,
                    max_marks: row.max_marks,
                    grade: row.grade || '-',
                    attendance_status: row.attendance_status,
                    has_theory: row.has_theory,
                    has_lab: row.has_lab,
                    has_oral: row.has_oral,
                    theory_max_marks: row.theory_max_marks,
                    lab_max_marks: row.lab_max_marks,
                    oral_max_marks: row.oral_max_marks,
                    theory_marks_obtained: row.theory_marks_obtained !== null && row.theory_marks_obtained !== undefined ? Math.round(Number(row.theory_marks_obtained)) : row.theory_marks_obtained,
                    lab_marks_obtained: row.lab_marks_obtained !== null && row.lab_marks_obtained !== undefined ? Math.round(Number(row.lab_marks_obtained)) : row.lab_marks_obtained,
                    oral_marks_obtained: row.oral_marks_obtained !== null && row.oral_marks_obtained !== undefined ? Math.round(Number(row.oral_marks_obtained)) : row.oral_marks_obtained
                });
                totalMax += Number(row.max_marks || 0);
                if (row.attendance_status !== 'Absent') {
                    totalObtained += Number(row.marks_obtained || 0);
                }
            });

            totalObtained = Math.round(totalObtained);

            const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
            const showTheory = exam.subjects.some(s => checkTrue(s.has_theory));
            const showLab = exam.subjects.some(s => checkTrue(s.has_lab));
            const showOral = exam.subjects.some(s => checkTrue(s.has_oral));

            const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
            const currentDate = new Date().toLocaleDateString();

            let hasFailed = false;
            let dynamicTeacherRemark = null;
            rows.forEach(row => {
                if (row.grade === 'F' || row.attendance_status === 'Absent') {
                    hasFailed = true;
                }
                if (row.teacher_remark) {
                    dynamicTeacherRemark = row.teacher_remark;
                }
            });
            const finalResult = hasFailed ? 'Fail' : 'Pass';
            const teacherRemark = dynamicTeacherRemark || (hasFailed ? 'Need to do hardwork.' : 'Good performance. Keep it up!');

            const templateData = {
                student,
                exam: {
                    ...exam,
                    showTheory,
                    showLab,
                    showOral
                },
                totalMax,
                totalObtained,
                percentage,
                currentDate,
                finalResult,
                teacherRemark,
                logoData
            };

            const templatePath = 'uploads/templates/student_marksheet.hbs';

            const pdfBuffer = await pdfService.renderHbsTemplate(templatePath, templateData, {
                width: 794,
                height: 1123
            });
            pdfBuffers.push(pdfBuffer);
        }

        if (pdfBuffers.length === 0) {
            return res.status(404).json({ error: 'No marksheets generated for the selected students' });
        }

        let finalPdfBuffer;
        if (pdfBuffers.length === 1) {
            finalPdfBuffer = pdfBuffers[0];
        } else {
            finalPdfBuffer = await pdfService.mergePdfs(pdfBuffers);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Bulk_Marksheets_${exam_id}.pdf`);
        return res.send(Buffer.from(finalPdfBuffer));
    } catch (err) {
        console.error('POST /api/exam/generate-bulk-marksheet error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    AddExamGroup,
    GetExamGroups,
    UpdateExamGroup,
    PublishExam,
    DeleteExamGroup,
    UpdateExamRoutine,
    AddExamGroupMarks,
    GetExamGroupResults,
    GetExamsForStudent,
    GetStudentExamHistory,
    GetAllStudentExamSummaries,
    GetSupervisedClassExamTrends,
    GenerateMarksheetPDF,
    GenerateAdmitCardPDF,
    GenerateExamRoutinePDF,
    GenerateCombinedMarksheetPDF,
    GenerateConsolidatedMarksheetPDF,
    GenerateBulkMarksheetPDF
};