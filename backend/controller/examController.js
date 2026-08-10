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
    const { name, exam_type, custom_exam_name, class_id, class_ids, grade_id, academic_year_id, note, start_date, end_date, subjects } = req.body;
    // subjects = [{ subject_id, max_marks, passing_marks }]

    if (!isNonEmptyString(name) || !grade_id || !academic_year_id) {
        return res.status(400).json({ error: 'Name, grade_id, and academic_year_id are required' });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'At least one subject is required' });
    }

    let targetClassIds = [];
    if (class_ids && Array.isArray(class_ids) && class_ids.length > 0) {
        targetClassIds = class_ids;
    } else if (class_id) {
        targetClassIds = [class_id];
    } else {
        return res.status(400).json({ error: 'Section is required' });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const createdExamGroupIds = [];

        const sectionIdsJson = JSON.stringify(targetClassIds.map(id => parseInt(id, 10)));

        const [egRes] = await conn.execute(
            `INSERT INTO exam_groups (name, exam_type, custom_exam_name, class_id, grade_id, academic_year_id, note, start_date, end_date, status, created_at, section_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW(), ?)`,
            [name.trim(), exam_type || 'OTHER', custom_exam_name || null, null, toInt(grade_id), toInt(academic_year_id), note || null, start_date || null, end_date || null, sectionIdsJson]
        );
        const examGroupId = egRes.insertId;
        createdExamGroupIds.push(examGroupId);

        // insert exam_group_subjects
        for (const sub of subjects) {
            // const hasTheory = sub.has_theory === undefined ? 1 : (sub.has_theory ? 1 : 0);
            const hasTheory = sub.has_theory ? 1 : 0;
            const hasLab = sub.has_lab ? 1 : 0;
            const hasOral = sub.has_oral ? 1 : 0;
            const hasWritten = sub.has_written ? 1 : 0;
            const hasReading = sub.has_reading ? 1 : 0;
            const hasWritingComp = sub.has_writing_comp ? 1 : 0;
            const hasDictation = sub.has_dictation ? 1 : 0;
            const hasRecitation = sub.has_recitation ? 1 : 0;
            const hasIaPr = sub.has_ia_pr ? 1 : 0;

            const thMax = hasTheory ? (toInt(sub.theory_max_marks) || 0) : 0;
            const lbMax = hasLab ? (toInt(sub.lab_max_marks) || 0) : 0;
            const orMax = hasOral ? (toInt(sub.oral_max_marks) || 0) : 0;
            const wrMax = hasWritten ? (toInt(sub.written_max_marks) || 0) : 0;
            const rdMax = hasReading ? (toInt(sub.reading_max_marks) || 0) : 0;
            const wcMax = hasWritingComp ? (toInt(sub.writing_comp_max_marks) || 0) : 0;
            const dcMax = hasDictation ? (toInt(sub.dictation_max_marks) || 0) : 0;
            const rcMax = hasRecitation ? (toInt(sub.recitation_max_marks) || 0) : 0;
            const iaMax = hasIaPr ? (toInt(sub.ia_pr_max_marks) || 0) : 0;

            const calculatedMax = (thMax + lbMax + orMax + wrMax + rdMax + wcMax + dcMax + rcMax + iaMax) || toInt(sub.max_marks) || 100;

            await conn.execute(
                `INSERT INTO exam_group_subjects 
                (exam_group_id, subject_id, max_marks, passing_marks, has_theory, has_lab, has_oral,
                 theory_max_marks, lab_max_marks, oral_max_marks,
                 has_written, has_reading, has_writing_comp, has_dictation, has_recitation, has_ia_pr,
                 written_max_marks, reading_max_marks, writing_comp_max_marks, dictation_max_marks, recitation_max_marks, ia_pr_max_marks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    examGroupId, toInt(sub.subject_id), calculatedMax, toInt(sub.passing_marks) || 35,
                    hasTheory, hasLab, hasOral,
                    hasTheory ? thMax : null, hasLab ? lbMax : null, hasOral ? orMax : null,
                    hasWritten, hasReading, hasWritingComp, hasDictation, hasRecitation, hasIaPr,
                    hasWritten ? wrMax : null, hasReading ? rdMax : null, hasWritingComp ? wcMax : null,
                    hasDictation ? dcMax : null, hasRecitation ? rcMax : null, hasIaPr ? iaMax : null
                ]
            );
        }

        await conn.commit();
        conn.release();
        return res.status(201).json({ success: true, exam_group_ids: createdExamGroupIds });
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
        const examType = req.query.exam_type;
        const limit = Math.min(parseInt(req.query.limit || '100', 10), 2000);
        const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

        let whereClause = [];
        let params = [];

        if (classId) {
            whereClause.push('(eg.class_id = ? OR JSON_CONTAINS(COALESCE(eg.section_ids, "[]"), CAST(? AS CHAR)))');
            params.push(classId, classId);
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
        if (examType) {
            whereClause.push('eg.exam_type = ?');
            params.push(examType);
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
                // const rawSubs = subjectRows.filter(s => s.exam_group_id === row.id);
                // const subMap = new Map();
                // for (const s of rawSubs) {
                //     const key = s.subject_id || s.subject_name;
                //     if (!subMap.has(key)) {
                //         subMap.set(key, { ...s });
                //     } else {
                //         const existing = subMap.get(key);
                //         existing.written_max_marks = existing.written_max_marks || s.written_max_marks;
                //         existing.reading_max_marks = existing.reading_max_marks || s.reading_max_marks;
                //         existing.writing_comp_max_marks = existing.writing_comp_max_marks || s.writing_comp_max_marks;
                //         existing.dictation_max_marks = existing.dictation_max_marks || s.dictation_max_marks;
                //         existing.recitation_max_marks = existing.recitation_max_marks || s.recitation_max_marks;
                //         existing.oral_max_marks = existing.oral_max_marks || s.oral_max_marks;
                //         existing.theory_max_marks = existing.theory_max_marks || s.theory_max_marks;
                //         existing.lab_max_marks = existing.lab_max_marks || s.lab_max_marks;
                //         existing.ia_pr_max_marks = existing.ia_pr_max_marks || s.ia_pr_max_marks;
                //     }
                // }
                // row.subjects = Array.from(subMap.values());

                row.subjects = subjectRows.filter(s => s.exam_group_id === row.id).map(s => {
                    const components = [];
                    const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
                    if (checkTrue(s.has_written)) components.push({ component_id: 1, name: 'Written', max_marks: s.written_max_marks });
                    if (checkTrue(s.has_reading)) components.push({ component_id: 2, name: 'Reading', max_marks: s.reading_max_marks });
                    if (checkTrue(s.has_writing_comp)) components.push({ component_id: 3, name: 'Writing (Comp.)', max_marks: s.writing_comp_max_marks });
                    if (checkTrue(s.has_dictation)) components.push({ component_id: 4, name: 'Dictation', max_marks: s.dictation_max_marks });
                    if (checkTrue(s.has_recitation)) components.push({ component_id: 5, name: 'Recitation', max_marks: s.recitation_max_marks });
                    if (checkTrue(s.has_theory)) components.push({ component_id: 6, name: 'Theory', max_marks: s.theory_max_marks });
                    if (checkTrue(s.has_lab)) components.push({ component_id: 7, name: 'Lab/Practical', max_marks: s.lab_max_marks });
                    if (checkTrue(s.has_oral)) components.push({ component_id: 8, name: 'Oral', max_marks: s.oral_max_marks });
                    if (checkTrue(s.has_ia_pr)) components.push({ component_id: 9, name: 'I.A./PR', max_marks: s.ia_pr_max_marks });
                    return { ...s, components };
                });
            }
        }

        const [allClasses] = await db.query('SELECT id, name FROM classes');
        const classMap = {};
        allClasses.forEach(c => classMap[c.id] = c.name);

        const formattedExams = rows.map(exam => {
            let sectionNames = [];
            let sectionIds = [];

            if (exam.section_ids && Array.isArray(exam.section_ids) && exam.section_ids.length > 0) {
                sectionIds = exam.section_ids;
                sectionNames = exam.section_ids.map(id => classMap[id]).filter(Boolean);
            } else if (exam.class_id) {
                sectionIds = [exam.class_id];
                sectionNames = [exam.class_name || classMap[exam.class_id]];
            }

            return {
                ...exam,
                section_ids: sectionIds,
                section_names: sectionNames.join(', '),
                start_date: exam.start_date ? formatMySQLDate(exam.start_date) : null,
                end_date: exam.end_date ? formatMySQLDate(exam.end_date) : null
            }
        });

        return res.json({ total, limit, offset, exams: formattedExams });

    } catch (err) {
        console.error('GET /api/exam/groups error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Update Exam Group (Status / Details)
// const UpdateExamGroup = async (req, res) => {
//     const id = toInt(req.params.id);
//     const { name, exam_type, custom_exam_name, class_id, class_ids, grade_id, academic_year_id, note, start_date, end_date, status, is_results_published, subjects } = req.body;

//     const updates = []; const params = [];
//     if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
//     if (exam_type !== undefined) { updates.push('exam_type = ?'); params.push(exam_type); }
//     if (class_id !== undefined && !class_ids) { updates.push('class_id = ?'); params.push(class_id === '' || class_id === null ? null : toInt(class_id)); }
//     if (class_ids !== undefined && Array.isArray(class_ids)) {
//         updates.push('section_ids = ?'); 
//         params.push(JSON.stringify(class_ids.map(c => parseInt(c, 10))));
//         updates.push('class_id = ?');
//         params.push(null);
//     }
//     if (grade_id !== undefined) { updates.push('grade_id = ?'); params.push(toInt(grade_id)); }
//     if (academic_year_id !== undefined) { updates.push('academic_year_id = ?'); params.push(toInt(academic_year_id)); }
//     if (custom_exam_name !== undefined) { updates.push('custom_exam_name = ?'); params.push(custom_exam_name); }
//     if (note !== undefined) { updates.push('note = ?'); params.push(note); }
//     if (start_date !== undefined) { updates.push('start_date = ?'); params.push(start_date || null); }
//     if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date || null); }
//     if (status !== undefined) { updates.push('status = ?'); params.push(status); }
//     if (is_results_published !== undefined) { updates.push('is_results_published = ?'); params.push(is_results_published ? 1 : 0); }

//     if (updates.length === 0 && (!subjects || !Array.isArray(subjects))) return res.status(400).json({ error: 'Nothing to update' });

//     const conn = await db.getConnection();
//     try {
//         await conn.beginTransaction();

//         if (updates.length > 0) {
//             const updateParams = [...params, id];
//             await conn.execute(`UPDATE exam_groups SET ${updates.join(', ')} WHERE id = ?`, updateParams);
//         }

//         if (subjects && Array.isArray(subjects)) {
//             const [existingSubjects] = await conn.execute(`SELECT id, subject_id FROM exam_group_subjects WHERE exam_group_id = ?`, [id]);
//             const existingSubjectMap = {};
//             for(let s of existingSubjects) {
//                 existingSubjectMap[s.subject_id] = s.id;
//             }

//             const newSubjectIds = subjects.map(s => toInt(s.subject_id));
//             const subjectsToDelete = existingSubjects.filter(s => !newSubjectIds.includes(s.subject_id)).map(s => s.id);

//             if (subjectsToDelete.length > 0) {
//                 await conn.execute(`DELETE FROM exam_group_subjects WHERE id IN (${subjectsToDelete.join(',')})`);
//             }

//             for (const sub of subjects) {
//                 const subId = toInt(sub.subject_id);
//                 const hasTheory = sub.has_theory === undefined ? 1 : (sub.has_theory ? 1 : 0);
//                 const hasLab = sub.has_lab ? 1 : 0;
//                 const hasOral = sub.has_oral ? 1 : 0;

//                 const thMax = hasTheory ? (toInt(sub.theory_max_marks) || 0) : 0;
//                 const lbMax = hasLab ? (toInt(sub.lab_max_marks) || 0) : 0;
//                 const orMax = hasOral ? (toInt(sub.oral_max_marks) || 0) : 0;

//                 const calculatedMax = (thMax + lbMax + orMax) || toInt(sub.max_marks) || 100;
//                 const passMarks = toInt(sub.passing_marks) || 35;

//                 if (existingSubjectMap[subId]) {
//                     await conn.execute(
//                         `UPDATE exam_group_subjects SET max_marks=?, passing_marks=?, has_theory=?, has_lab=?, has_oral=?, theory_max_marks=?, lab_max_marks=?, oral_max_marks=? WHERE id=?`,
//                         [
//                             calculatedMax,
//                             passMarks,
//                             hasTheory,
//                             hasLab,
//                             hasOral,
//                             hasTheory ? thMax : null,
//                             hasLab ? lbMax : null,
//                             hasOral ? orMax : null,
//                             existingSubjectMap[subId]
//                         ]
//                     );
//                 } else {
//                     await conn.execute(
//                         `INSERT INTO exam_group_subjects (exam_group_id, subject_id, max_marks, passing_marks, has_theory, has_lab, has_oral, theory_max_marks, lab_max_marks, oral_max_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//                         [
//                             id, 
//                             subId, 
//                             calculatedMax, 
//                             passMarks,
//                             hasTheory,
//                             hasLab,
//                             hasOral,
//                             hasTheory ? thMax : null,
//                             hasLab ? lbMax : null,
//                             hasOral ? orMax : null
//                         ]
//                     );
//                 }
//             }
//         }

//         await conn.commit();
//         conn.release();
//         return res.json({ success: true });
//     } catch (err) {
//         await conn.rollback();
//         conn.release();
//         console.error('PUT /api/exam/groups/:id error', err);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }


const UpdateExamGroup = async (req, res) => {
    const id = toInt(req.params.id);
    const { name, exam_type, custom_exam_name, class_id, class_ids, grade_id, academic_year_id, note, start_date, end_date, status, is_results_published, subjects } = req.body;

    const updates = []; const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (exam_type !== undefined) { updates.push('exam_type = ?'); params.push(exam_type); }
    if (class_id !== undefined && !class_ids) { updates.push('class_id = ?'); params.push(class_id === '' || class_id === null ? null : toInt(class_id)); }
    if (class_ids !== undefined && Array.isArray(class_ids)) {
        updates.push('section_ids = ?');
        params.push(JSON.stringify(class_ids.map(c => parseInt(c, 10))));
        updates.push('class_id = ?');
        params.push(null);
    }
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

        let shouldNotifyResult = false;
        let examInfo = null;

        if (is_results_published === true || is_results_published === 1 || is_results_published === 'true') {
            const [rows] = await conn.execute(`
                SELECT eg.is_results_published, eg.name, eg.exam_type, eg.start_date, eg.end_date, eg.class_id, eg.section_ids, eg.grade_id, eg.academic_year_id, c.name as class_name 
                FROM exam_groups eg
                LEFT JOIN classes c ON c.id = eg.class_id
                WHERE eg.id = ?
            `, [id]);
            if (rows.length > 0) {
                const examRecord = rows[0];
                if (!examRecord.is_results_published) {

                    // Verify if all target students have marks
                    let countSql = `
                        SELECT COUNT(st.id) as count 
                        FROM students st 
                        JOIN student_academic_records sar ON sar.student_id = st.id 
                        JOIN (
                            SELECT student_id, MAX(id) latest_id
                            FROM student_academic_records
                            GROUP BY student_id
                        ) latest ON latest.student_id = st.id AND latest.latest_id = sar.id
                        WHERE sar.academic_year_id = ?`;
                    const countParams = [examRecord.academic_year_id];

                    let sectionIds = [];
                    if (examRecord.section_ids && Array.isArray(examRecord.section_ids) && examRecord.section_ids.length > 0) {
                        sectionIds = examRecord.section_ids;
                    } else if (examRecord.class_id) {
                        sectionIds = [examRecord.class_id];
                    }

                    if (sectionIds.length > 0) {
                        const placeholders = sectionIds.map(() => '?').join(',');
                        countSql += ` AND sar.class_id IN (${placeholders})`;
                        countParams.push(...sectionIds);
                    } else if (examRecord.grade_id) {
                        countSql += ' AND sar.grade_id = ?';
                        countParams.push(examRecord.grade_id);
                    }

                    const [targetStudents] = await conn.execute(countSql, countParams);
                    const targetStudentsCount = targetStudents[0].count;

                    const [subjectsCountRows] = await conn.execute('SELECT COUNT(DISTINCT subject_id) as count FROM exam_group_subjects WHERE exam_group_id = ?', [id]);
                    const subjectsCount = subjectsCountRows[0].count;

                    const expectedMarksCount = targetStudentsCount * subjectsCount;

                    const [actualMarksCount] = await conn.execute(`
                        SELECT COUNT(DISTINCT CONCAT(egr.student_id, '-', egs.subject_id)) as count 
                        FROM exam_group_results egr
                        JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
                        WHERE egs.exam_group_id = ?
                    `, [id]);

                    if (targetStudentsCount > 0 && subjectsCount > 0 && actualMarksCount[0].count < expectedMarksCount) {
                        await conn.rollback();
                        conn.release();
                        return res.status(400).json({ error: 'add marks to all student before publish result' });
                    }

                    shouldNotifyResult = true;
                    examInfo = examRecord;
                }
            }
        }

        if (updates.length > 0) {
            const updateParams = [...params, id];
            await conn.execute(`UPDATE exam_groups SET ${updates.join(', ')} WHERE id = ?`, updateParams);
        }

        if (subjects && Array.isArray(subjects)) {
            const [existingSubjects] = await conn.execute(`SELECT id, subject_id FROM exam_group_subjects WHERE exam_group_id = ?`, [id]);
            const existingSubjectMap = {};
            for (let s of existingSubjects) {
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
                const hasWritten = sub.has_written ? 1 : 0;
                const hasReading = sub.has_reading ? 1 : 0;
                const hasWritingComp = sub.has_writing_comp ? 1 : 0;
                const hasDictation = sub.has_dictation ? 1 : 0;
                const hasRecitation = sub.has_recitation ? 1 : 0;
                const hasIaPr = sub.has_ia_pr ? 1 : 0;

                const thMax = hasTheory ? (toInt(sub.theory_max_marks) || 0) : 0;
                const lbMax = hasLab ? (toInt(sub.lab_max_marks) || 0) : 0;
                const orMax = hasOral ? (toInt(sub.oral_max_marks) || 0) : 0;
                const wrMax = hasWritten ? (toInt(sub.written_max_marks) || 0) : 0;
                const rdMax = hasReading ? (toInt(sub.reading_max_marks) || 0) : 0;
                const wcMax = hasWritingComp ? (toInt(sub.writing_comp_max_marks) || 0) : 0;
                const dcMax = hasDictation ? (toInt(sub.dictation_max_marks) || 0) : 0;
                const rcMax = hasRecitation ? (toInt(sub.recitation_max_marks) || 0) : 0;
                const iaMax = hasIaPr ? (toInt(sub.ia_pr_max_marks) || 0) : 0;

                const calculatedMax = (thMax + lbMax + orMax + wrMax + rdMax + wcMax + dcMax + rcMax + iaMax) || toInt(sub.max_marks) || 100;
                const passMarks = toInt(sub.passing_marks) || 35;

                if (existingSubjectMap[subId]) {
                    await conn.execute(
                        `UPDATE exam_group_subjects SET max_marks=?, passing_marks=?,
                         has_theory=?, has_lab=?, has_oral=?, theory_max_marks=?, lab_max_marks=?, oral_max_marks=?,
                         has_written=?, has_reading=?, has_writing_comp=?, has_dictation=?, has_recitation=?, has_ia_pr=?,
                         written_max_marks=?, reading_max_marks=?, writing_comp_max_marks=?, dictation_max_marks=?, recitation_max_marks=?, ia_pr_max_marks=?
                         WHERE id=?`,
                        [
                            calculatedMax, passMarks,
                            hasTheory, hasLab, hasOral,
                            hasTheory ? thMax : null, hasLab ? lbMax : null, hasOral ? orMax : null,
                            hasWritten, hasReading, hasWritingComp, hasDictation, hasRecitation, hasIaPr,
                            hasWritten ? wrMax : null, hasReading ? rdMax : null, hasWritingComp ? wcMax : null,
                            hasDictation ? dcMax : null, hasRecitation ? rcMax : null, hasIaPr ? iaMax : null,
                            existingSubjectMap[subId]
                        ]
                    );
                } else {
                    await conn.execute(
                        `INSERT INTO exam_group_subjects 
                        (exam_group_id, subject_id, max_marks, passing_marks, has_theory, has_lab, has_oral,
                         theory_max_marks, lab_max_marks, oral_max_marks,
                         has_written, has_reading, has_writing_comp, has_dictation, has_recitation, has_ia_pr,
                         written_max_marks, reading_max_marks, writing_comp_max_marks, dictation_max_marks, recitation_max_marks, ia_pr_max_marks)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            id, subId, calculatedMax, passMarks,
                            hasTheory, hasLab, hasOral,
                            hasTheory ? thMax : null, hasLab ? lbMax : null, hasOral ? orMax : null,
                            hasWritten, hasReading, hasWritingComp, hasDictation, hasRecitation, hasIaPr,
                            hasWritten ? wrMax : null, hasReading ? rdMax : null, hasWritingComp ? wcMax : null,
                            hasDictation ? dcMax : null, hasRecitation ? rcMax : null, hasIaPr ? iaMax : null
                        ]
                    );
                }
            }
        }

        await conn.commit();
        conn.release();

        if (shouldNotifyResult) {
            try {
                const [subRows] = await db.execute(`
                    SELECT s.name 
                    FROM exam_group_subjects egs
                    JOIN subjects s ON s.id = egs.subject_id
                    WHERE egs.exam_group_id = ?
                `, [id]);
                const subjectsList = subRows.map(r => r.name);

                let sectionIds = [];
                if (examInfo.section_ids && Array.isArray(examInfo.section_ids) && examInfo.section_ids.length > 0) {
                    sectionIds = examInfo.section_ids;
                } else if (examInfo.class_id) {
                    sectionIds = [examInfo.class_id];
                }

                let className = 'All Classes';
                let gradeName = examInfo.grade_name || '';
                if (sectionIds.length > 0) {
                    const placeholders = sectionIds.map(() => '?').join(',');
                    const [classRows] = await db.execute(`SELECT name FROM classes WHERE id IN (${placeholders})`, sectionIds);
                    if (classRows.length > 0) className = classRows.map(c => c.name).join(', ');
                } else if (examInfo.grade_id) {
                    const [gradeRows] = await db.execute('SELECT name FROM grades WHERE id = ?', [examInfo.grade_id]);
                    if (gradeRows.length > 0) {
                        gradeName = gradeRows[0].name;
                        className = `Grade: ${gradeName}`;
                    }
                }

                const payload = {
                    exam_id: id,
                    exam_name: examInfo.name,
                    exam_type: examInfo.exam_type,
                    class_name: className,
                    grade_name: gradeName,
                    custom_exam_name: examInfo.custom_exam_name,
                    subjects: subjectsList,
                    start_date: examInfo.start_date,
                    end_date: examInfo.end_date
                };

                const formattedStartDate = examInfo.start_date ? new Date(examInfo.start_date).toLocaleDateString('en-GB') : '';
                const formattedEndDate = examInfo.end_date ? new Date(examInfo.end_date).toLocaleDateString('en-GB') : '';
                const msgBody = `Results for ${examInfo.name}${examInfo.custom_exam_name ? ' - ' + examInfo.custom_exam_name : ''} have been published for class ${gradeName ? gradeName + ' ' : ''}section ${className} start from ${formattedStartDate} to ${formattedEndDate}.`;

                // if (sectionIds.length > 0) {
                //     for (const sid of sectionIds) {
                //         await notificationService.sendSchoolNotification({
                //             title: 'Exam Results Published',
                //             message: msgBody,
                //             type: 'exam_result',
                //             targetType: 'class',
                //             targetValue: sid,
                //             metadata: payload,
                //             deepLink: '/school/exam/exams_student',
                //             priority: 'high',
                //             createdBy: req.user ? req.user.id : null
                //         });
                //     }
                // } else if (examInfo.grade_id) {
                //     const [classesInGrade] = await db.execute('SELECT id FROM classes WHERE grade_id = ?', [examInfo.grade_id]);
                //     for (const c of classesInGrade) {
                //         await notificationService.sendSchoolNotification({
                //             title: 'Exam Results Published',
                //             message: msgBody,
                //             type: 'exam_result',
                //             targetType: 'class',
                //             targetValue: c.id,
                //             metadata: payload,
                //             deepLink: '/school/exam/exams_student',
                //             priority: 'high',
                //             createdBy: req.user ? req.user.id : null
                //         });
                //     }
                // } else {
                //     await notificationService.sendSchoolNotification({
                //         title: 'Exam Results Published',
                //         message: msgBody,
                //         type: 'exam_result',
                //         targetType: 'all',
                //         targetValue: null,
                //         metadata: payload,
                //         deepLink: '/school/exam/exams_student',
                //         priority: 'high',
                //         createdBy: req.user ? req.user.id : null
                //     });
                // }

                // Notify Teachers via Socket
                // await notificationService.sendSchoolNotification({
                //     title: 'Exam Results Published (Teachers)',
                //     message: msgBody,
                //     type: 'exam_result',
                //     targetType: 'role',
                //     targetValue: 'teacher',
                //     metadata: payload,
                //     deepLink: '/school/exam/exams_student',
                //     priority: 'normal',
                //     createdBy: req.user ? req.user.id : null
                // });

                // WhatsApp queue
                let usersQuery = '';
                const usersParams = [];
                if (sectionIds.length > 0) {
                    const placeholders = sectionIds.map(() => '?').join(',');
                    usersQuery = `
                        SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                        FROM users u
                        JOIN students s ON s.user_id = u.id
                        JOIN student_academic_records sar ON sar.student_id = s.id
                        WHERE sar.class_id IN (${placeholders}) AND sar.academic_year_id = ?
                    `;
                    usersParams.push(...sectionIds, examInfo.academic_year_id);
                } else if (examInfo.grade_id) {
                    usersQuery = `
                        SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                        FROM users u
                        JOIN students s ON s.user_id = u.id
                        JOIN student_academic_records sar ON sar.student_id = s.id
                        WHERE sar.grade_id = ? AND sar.academic_year_id = ?
                    `;
                    usersParams.push(examInfo.grade_id, examInfo.academic_year_id);
                } else {
                    usersQuery = `
                        SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                        FROM users u
                        JOIN students s ON s.user_id = u.id
                    `;
                }

                const [contacts] = await db.execute(usersQuery, usersParams);

                let whatsappMsg = '';
                whatsappMsg += `🔔 *Exam Results Published!* 🔔\n\n`;
                whatsappMsg += `✨ *${examInfo.name}* ✨\n\n`;
                whatsappMsg += `*${examInfo.exam_type}*\n\n`;
                if (examInfo.custom_exam_name) {
                    whatsappMsg += `*${examInfo.custom_exam_name}*\n\n`;
                }
                if (className !== 'All Classes') {
                    whatsappMsg += `📚 *Class:* ${className}\n`;
                }
                if (examInfo.start_date) {
                    whatsappMsg += `📅 *Starts:* ${new Date(examInfo.start_date).toLocaleDateString('en-IN')}\n`;
                }
                if (examInfo.end_date) {
                    whatsappMsg += `📅 *Ends:* ${new Date(examInfo.end_date).toLocaleDateString('en-IN')}\n`;
                }
                whatsappMsg += `\nPlease check the application for the detailed results.\n`;
                whatsappMsg += `\nBest regards,\n`;
                whatsappMsg += `TIMES INTERNATIONAL SCHOOL`;

                const processedPhones = new Set();

                for (const c of contacts) {
                    const phonesToNotify = [c.parent_contact, c.student_phone].filter(Boolean);

                    for (const phone of phonesToNotify) {
                        if (!processedPhones.has(phone)) {
                            processedPhones.add(phone);
                            await whatsappQueue.add('examNotification', {
                                contact: phone,
                                jobType: 'examNotification',
                                message: {
                                    fallbackText: whatsappMsg
                                }
                            });
                        }
                    }
                }

                // Teachers Whatsapp
                const [teacherContacts] = await db.execute(`SELECT u.phone FROM users u JOIN teachers t ON t.user_id = u.id WHERE u.phone IS NOT NULL`);
                let teacherMsg = `🔔 *Exam Results Published (Teachers)* 🔔\n\nExam: ${examInfo.name}\nClass: ${className}\n`;
                if (examInfo.start_date) teacherMsg += `Starts: ${new Date(examInfo.start_date).toLocaleDateString('en-IN')}\n`;
                teacherMsg += `\nBest regards,\nTIMES INTERNATIONAL SCHOOL`;

                for (const t of teacherContacts) {
                    if (t.phone && !processedPhones.has(t.phone)) {
                        processedPhones.add(t.phone);
                        await whatsappQueue.add('examNotification', {
                            contact: t.phone,
                            jobType: 'examNotification',
                            message: { fallbackText: teacherMsg }
                        });
                    }
                }
            } catch (notifyErr) {
                console.error('Failed to send result publish notification:', notifyErr);
            }
        }
        return res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/exam/groups/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// const PublishExam = async (req, res) => {
//     const id = toInt(req.params.id);

//     const conn = await db.getConnection();
//     try {
//         await conn.beginTransaction();

//         // 1. Get exam details
//         const [examRows] = await conn.execute(`SELECT * FROM exam_groups WHERE id = ?`, [id]);
//         if (examRows.length === 0) {
//             conn.release();
//             return res.status(404).json({ error: 'Exam not found' });
//         }
//         const exam = examRows[0];

//         if (exam.status === 'Published') {
//             conn.release();
//             return res.status(400).json({ error: 'Exam is already published' });
//         }

//         // 2. Update status
//         await conn.execute(`UPDATE exam_groups SET status = 'Published' WHERE id = ?`, [id]);

//         await conn.commit();
//         conn.release();

//         // 3. Send Notifications
//         const classId = exam.class_id;
//         const gradeId = exam.grade_id;
//         const academicYearId = exam.academic_year_id;

//         let sectionIds = [];
//         if (exam.section_ids && Array.isArray(exam.section_ids) && exam.section_ids.length > 0) {
//             sectionIds = exam.section_ids;
//         } else if (exam.class_id) {
//             sectionIds = [exam.class_id];
//         }

//         let className = 'All Classes';
//         let gradeName = '';
//         if (sectionIds.length > 0) {
//             const placeholders = sectionIds.map(() => '?').join(',');
//             const [classRows] = await db.execute(`SELECT name FROM classes WHERE id IN (${placeholders})`, sectionIds);
//             if (classRows.length > 0) className = classRows.map(c => c.name).join(', ');
//         } else if (gradeId) {
//             const [gradeRows] = await db.execute('SELECT name FROM grades WHERE id = ?', [gradeId]);
//             if (gradeRows.length > 0) {
//                 gradeName = gradeRows[0].name;
//                 className = `Grade: ${gradeName}`;
//             }
//         }

//         // Notify Students/Parents of the Class or Grade
//         // if (classId) {
//         //     await notificationService.sendSchoolNotification({
//         //         title: 'New Exam Published',
//         //         message: `The exam schedule for ${exam.name} has been published.`,
//         //         type: 'exam',
//         //         targetType: 'class',
//         //         targetValue: classId,
//         //         metadata: { exam_id: exam.id },
//         //         priority: 'high',
//         //         createdBy: req.user ? req.user.id : null
//         //     });
//         // } else if (gradeId) {
//         //     // Find all classes in this grade
//         //     const [classesInGrade] = await db.execute('SELECT id FROM classes WHERE grade_id = ?', [gradeId]);
//         //     for (const c of classesInGrade) {
//         //         await notificationService.sendSchoolNotification({
//         //             title: 'New Exam Published',
//         //             message: `The exam schedule for ${exam.name} has been published.`,
//         //             type: 'exam',
//         //             targetType: 'class',
//         //             targetValue: c.id,
//         //             metadata: { exam_id: exam.id },
//         //             priority: 'high',
//         //             createdBy: req.user ? req.user.id : null
//         //         });
//         //     }
//         // } else {
//         //     // Notify All if both are null
//         //     await notificationService.sendSchoolNotification({
//         //         title: 'New Exam Published',
//         //         message: `The exam schedule for ${exam.name} has been published.`,
//         //         type: 'exam',
//         //         targetType: 'all',
//         //         targetValue: null,
//         //         metadata: { exam_id: exam.id },
//         //         priority: 'high',
//         //         createdBy: req.user ? req.user.id : null
//         //     });
//         // }

//         // // Notify Teachers
//         // await notificationService.sendSchoolNotification({
//         //     title: 'New Exam Published',
//         //     message: `The exam schedule for ${exam.name} (${className}) has been published.`,
//         //     type: 'exam',
//         //     targetType: 'role',
//         //     targetValue: 'teacher',
//         //     metadata: { exam_id: exam.id },
//         //     priority: 'normal',
//         //     createdBy: req.user ? req.user.id : null
//         // });

//         // WhatsApp queue
//         let usersQuery = '';
//         const usersParams = [];
//         if (sectionIds.length > 0) {
//             const placeholders = sectionIds.map(() => '?').join(',');
//             usersQuery = `
//                 SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
//                 FROM users u
//                 JOIN students s ON s.user_id = u.id
//                 JOIN student_academic_records sar ON sar.student_id = s.id
//                 WHERE sar.class_id IN (${placeholders}) AND sar.academic_year_id = ?
//             `;
//             usersParams.push(...sectionIds, academicYearId);
//         } else if (gradeId) {
//             usersQuery = `
//                 SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
//                 FROM users u
//                 JOIN students s ON s.user_id = u.id
//                 JOIN student_academic_records sar ON sar.student_id = s.id
//                 WHERE sar.grade_id = ? AND sar.academic_year_id = ?
//             `;
//             params.push(gradeId, academicYearId);
//         } else {
//             usersQuery = `
//                 SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
//                 FROM users u
//                 JOIN students s ON s.user_id = u.id
//             `;
//         }

//         const [contacts] = await db.execute(usersQuery, usersParams);

//         let msg = '';
//         msg += `🔔 *Exam Schedule Published!* 🔔\n\n`;
//         msg += `✨ *${exam.name}* ✨\n\n`;
//         msg += `*${exam.exam_type}*\n\n`;
//         if (exam.custom_exam_name) {
//             msg += `*${exam.custom_exam_name}*\n\n`;
//         }
//         if (className !== 'All Classes') {
//             msg += `📚 *Class:* ${className}\n`;
//         }
//         if (exam.start_date) {
//             msg += `📅 *Starts:* ${new Date(exam.start_date).toLocaleDateString('en-IN')}\n`;
//         }
//         if (exam.end_date) {
//             msg += `📅 *Ends:* ${new Date(exam.end_date).toLocaleDateString('en-IN')}\n`;
//         }
//         msg += `\nPlease check the application for the detailed routine.\n`;
//         msg += `\nBest regards,\n`;
//         msg += `TIMES INTERNATIONAL SCHOOL`;


//         const processedPhones = new Set();

//         for (const c of contacts) {
//             const phonesToNotify = [c.parent_contact, c.student_phone].filter(Boolean);

//             for (const phone of phonesToNotify) {
//                 if (!processedPhones.has(phone)) {
//                     processedPhones.add(phone);
//                     await whatsappQueue.add('examNotification', {
//                         contact: phone,
//                         jobType: 'examNotification',
//                         message: {
//                             fallbackText: msg
//                         }
//                     });
//                 }
//             }
//         }

//         // Teachers Whatsapp
//         const [teacherContacts] = await db.execute(`SELECT u.phone FROM users u JOIN teachers t ON t.user_id = u.id WHERE u.phone IS NOT NULL`);
//         let teacherMsg = `🔔 *Exam Published (Teachers)* 🔔\n\nExam: ${exam.name}\nClass: ${className}\n`;
//         if (exam.start_date) teacherMsg += `Starts: ${new Date(exam.start_date).toLocaleDateString('en-IN')}\n`;
//         teacherMsg += `\nBest regards,\nTIMES INTERNATIONAL SCHOOL`;

//         for (const t of teacherContacts) {
//             if (t.phone && !processedPhones.has(t.phone)) {
//                 processedPhones.add(t.phone);
//                 await whatsappQueue.add('examNotification', {
//                     contact: t.phone,
//                     jobType: 'examNotification',
//                     message: { fallbackText: teacherMsg }
//                 });
//             }
//         }

//         return res.json({ success: true, message: 'Exam published successfully' });
//     } catch (err) {
//         console.error('PUT /api/exam/publish/exams/:id error', err);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }


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

        let sectionIds = [];
        if (exam.section_ids && Array.isArray(exam.section_ids) && exam.section_ids.length > 0) {
            sectionIds = exam.section_ids;
        } else if (exam.class_id) {
            sectionIds = [exam.class_id];
        }

        let className = 'All Classes';
        let gradeName = '';
        if (sectionIds.length > 0) {
            const placeholders = sectionIds.map(() => '?').join(',');
            const [classRows] = await db.execute(`SELECT name FROM classes WHERE id IN (${placeholders})`, sectionIds);
            if (classRows.length > 0) className = classRows.map(c => c.name).join(', ');
        } else if (gradeId) {
            const [gradeRows] = await db.execute('SELECT name FROM grades WHERE id = ?', [gradeId]);
            if (gradeRows.length > 0) {
                gradeName = gradeRows[0].name;
                className = `Grade: ${gradeName}`;
            }
        }

        // Fetch subjects for metadata
        const [subRows] = await db.execute(`
            SELECT s.name 
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ?
        `, [id]);
        const subjectsList = subRows.map(r => r.name);

        const payload = {
            exam_id: exam.id,
            exam_name: exam.name,
            exam_type: exam.exam_type,
            custom_exam_name: exam.custom_exam_name,
            class_name: className,
            subjects: subjectsList,
            start_date: exam.start_date,
            end_date: exam.end_date
        };

        // Notify Students/Parents of the Class or Grade
        const formattedStartDate = exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-GB') : '';
        const formattedEndDate = exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-GB') : '';
        const msgBody = `The exam schedule for ${exam.name} has been published for class ${gradeName ? gradeName + ' ' : ''}section ${className} starts from ${formattedStartDate} to ${formattedEndDate}.`;

        // if (sectionIds.length > 0) {
        //     for (const sid of sectionIds) {
        //         await notificationService.sendSchoolNotification({
        //             title: 'New Exam Published',
        //             message: msgBody,
        //             type: 'exam',
        //             targetType: 'class',
        //             targetValue: sid,
        //             metadata: payload,
        //             deepLink: '/school/exam/exams_student',
        //             priority: 'high',
        //             createdBy: req.user ? req.user.id : null
        //         });
        //     }
        // } else if (gradeId) {
        //     // Find all classes in this grade
        //     const [classesInGrade] = await db.execute('SELECT id FROM classes WHERE grade_id = ?', [gradeId]);
        //     for (const c of classesInGrade) {
        //         await notificationService.sendSchoolNotification({
        //             title: 'New Exam Published',
        //             message: msgBody,
        //             type: 'exam',
        //             targetType: 'class',
        //             targetValue: c.id,
        //             metadata: payload,
        //             deepLink: '/school/exam/exams_student',
        //             priority: 'high',
        //             createdBy: req.user ? req.user.id : null
        //         });
        //     }
        // } else {
        //     // Notify All if both are null
        //     await notificationService.sendSchoolNotification({
        //         title: 'New Exam Published',
        //         message: msgBody,
        //         type: 'exam',
        //         targetType: 'all',
        //         targetValue: null,
        //         metadata: payload,
        //         deepLink: '/school/exam/exams_student',
        //         priority: 'high',
        //         createdBy: req.user ? req.user.id : null
        //     });
        // }

        // // Notify Teachers
        // await notificationService.sendSchoolNotification({
        //     title: 'New Exam Published',
        //     message: msgBody,
        //     type: 'exam',
        //     targetType: 'role',
        //     targetValue: 'teacher',
        //     metadata: payload,
        //     deepLink: '/school/exam/create_exam',
        //     priority: 'normal',
        //     createdBy: req.user ? req.user.id : null
        // });

        // WhatsApp queue
        let usersQuery = '';
        const usersParams = [];
        if (sectionIds.length > 0) {
            const placeholders = sectionIds.map(() => '?').join(',');
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
                JOIN student_academic_records sar ON sar.student_id = s.id
                WHERE sar.class_id IN (${placeholders}) AND sar.academic_year_id = ?
            `;
            usersParams.push(...sectionIds, academicYearId);
        } else if (gradeId) {
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
                JOIN student_academic_records sar ON sar.student_id = s.id
                WHERE sar.grade_id = ? AND sar.academic_year_id = ?
            `;
            usersParams.push(gradeId, academicYearId);
        } else {
            usersQuery = `
                SELECT u.phone as student_phone, s.parent_contact, s.mother_contect
                FROM users u
                JOIN students s ON s.user_id = u.id
            `;
        }

        const [contacts] = await db.execute(usersQuery, usersParams);

        let msg = '';
        msg += `🔔 *Exam Schedule Published!* 🔔\n\n`;
        msg += `✨ *${exam.name}* ✨\n\n`;
        msg += `*${exam.exam_type}*\n\n`;
        if (exam.custom_exam_name) {
            msg += `*${exam.custom_exam_name}*\n\n`;
        }
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
        msg += `TIMES INTERNATIONAL SCHOOL`;


        const processedPhones = new Set();

        for (const c of contacts) {
            const phonesToNotify = [c.parent_contact, c.student_phone].filter(Boolean);

            for (const phone of phonesToNotify) {
                if (!processedPhones.has(phone)) {
                    processedPhones.add(phone);
                    await whatsappQueue.add('examNotification', {
                        contact: phone,
                        jobType: 'examNotification',
                        message: {
                            fallbackText: msg
                        }
                    });
                }
            }
        }

        // Teachers Whatsapp
        const [teacherContacts] = await db.execute(`SELECT u.phone FROM users u JOIN teachers t ON t.user_id = u.id WHERE u.phone IS NOT NULL`);
        let teacherMsg = `🔔 *Exam Published (Teachers)* 🔔\n\nExam: ${exam.name}\nClass: ${className}\n`;
        if (exam.start_date) teacherMsg += `Starts: ${new Date(exam.start_date).toLocaleDateString('en-IN')}\n`;
        teacherMsg += `\nBest regards,\nTIMES INTERNATIONAL SCHOOL`;

        for (const t of teacherContacts) {
            if (t.phone && !processedPhones.has(t.phone)) {
                processedPhones.add(t.phone);
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
    const { routine, deleted_ids } = req.body;
    if (!Array.isArray(routine)) return res.status(400).json({ error: 'Routine array is required' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Delete removed split rows if any
        if (Array.isArray(deleted_ids) && deleted_ids.length > 0) {
            const validIds = deleted_ids.filter(id => typeof id === 'number' || (typeof id === 'string' && !id.startsWith('new_')));
            if (validIds.length > 0) {
                const placeholders = validIds.map(() => '?').join(',');
                await conn.execute(`DELETE FROM exam_group_subjects WHERE id IN (${placeholders})`, validIds);
            }
        }

        // 2. Insert or update routine items
        for (const item of routine) {
            const isExistingId = typeof item.id === 'number' || (typeof item.id === 'string' && !item.id.startsWith('new_'));
            if (isExistingId) {
                await conn.execute(
                    `UPDATE exam_group_subjects SET exam_date = ?, start_time = ?, end_time = ?, sitting = ?, exam_category = ? WHERE id = ?`,
                    [item.exam_date || null, item.start_time || null, item.end_time || null, item.sitting || null, item.exam_category || 'Written', item.id]
                );
            } else if (item.original_id) {
                // Insert split row copying max_marks, passing_marks and all sub-flags from original_id
                await conn.execute(
                    `INSERT INTO exam_group_subjects (
                        exam_group_id, subject_id, max_marks, passing_marks, 
                        has_theory, has_lab, has_oral, has_written, has_reading, has_writing_comp, has_dictation, has_recitation, has_ia_pr,
                        theory_max_marks, lab_max_marks, oral_max_marks, written_max_marks, reading_max_marks, writing_comp_max_marks, dictation_max_marks, recitation_max_marks, ia_pr_max_marks,
                        exam_date, start_time, end_time, sitting, exam_category
                    )
                    SELECT 
                        exam_group_id, subject_id, max_marks, passing_marks, 
                        has_theory, has_lab, has_oral, has_written, has_reading, has_writing_comp, has_dictation, has_recitation, has_ia_pr,
                        theory_max_marks, lab_max_marks, oral_max_marks, written_max_marks, reading_max_marks, writing_comp_max_marks, dictation_max_marks, recitation_max_marks, ia_pr_max_marks,
                        ?, ?, ?, ?, ?
                    FROM exam_group_subjects WHERE id = ?`,
                    [item.exam_date || null, item.start_time || null, item.end_time || null, item.sitting || null, item.exam_category || 'Written', item.original_id]
                );
            }
        }

        await conn.commit();
        conn.release();
        return res.json({ success: true });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/exam/update/routine error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

const AddExamGroupMarks = async (req, res) => {
    const { exam_group_id, marks, total_working_days, ptm_date } = req.body;
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
            SELECT egs.id, egs.subject_id, egs.passing_marks, egs.max_marks,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.has_written, egs.has_reading, egs.has_writing_comp,
                   egs.has_dictation, egs.has_recitation, egs.has_ia_pr,
                   s.subject_type 
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ?
        `, [exam_group_id]);
        const subjectMap = {};
        subRows.forEach(s => subjectMap[s.subject_id] = s);

        for (const m of marks) {
            const groupSub = subjectMap[m.subject_id];
            if (!groupSub) continue;

            const hasTheory = groupSub.has_theory;
            const hasLab = groupSub.has_lab;
            const hasOral = groupSub.has_oral;
            const hasWritten = groupSub.has_written;
            const hasReading = groupSub.has_reading;
            const hasWritingComp = groupSub.has_writing_comp;
            const hasDictation = groupSub.has_dictation;
            const hasRecitation = groupSub.has_recitation;
            const hasIaPr = groupSub.has_ia_pr;

            const parseM = (flag, val) => val !== undefined && val !== null && val !== '' ? parseFloat(val) : null;

            let thMarks = null, lbMarks = null, orMarks = null;
            let wrMarks = null, rdMarks = null, wcMarks = null, dcMarks = null, rcMarks = null, iaMarks = null;
            let totalObtained = null;

            const getCompMark = (compId) => {
                if (m.components && Array.isArray(m.components)) {
                    const c = m.components.find(x => x.component_id === compId);
                    if (c && c.marks_obtained !== undefined && c.marks_obtained !== null && c.marks_obtained !== '') {
                        return c.marks_obtained;
                    }
                }
                return null;
            }

            if (m.attendance_status === 'Present') {
                thMarks = parseM(hasTheory, m.theory_marks_obtained ?? getCompMark(6));
                lbMarks = parseM(hasLab, m.lab_marks_obtained ?? getCompMark(7));
                orMarks = parseM(hasOral, m.oral_marks_obtained ?? getCompMark(8));
                wrMarks = parseM(hasWritten, m.written_marks_obtained ?? getCompMark(1));
                rdMarks = parseM(hasReading, m.reading_marks_obtained ?? getCompMark(2));
                wcMarks = parseM(hasWritingComp, m.writing_comp_marks_obtained ?? getCompMark(3));
                dcMarks = parseM(hasDictation, m.dictation_marks_obtained ?? getCompMark(4));
                rcMarks = parseM(hasRecitation, m.recitation_marks_obtained ?? getCompMark(5));
                iaMarks = parseM(hasIaPr, m.ia_pr_marks_obtained ?? getCompMark(9));

                const allNull = [thMarks, lbMarks, orMarks, wrMarks, rdMarks, wcMarks, dcMarks, rcMarks, iaMarks].every(v => v === null);
                if (allNull) {
                    totalObtained = null;
                } else {
                    totalObtained = (thMarks || 0) + (lbMarks || 0) + (orMarks || 0)
                        + (wrMarks || 0) + (rdMarks || 0) + (wcMarks || 0)
                        + (dcMarks || 0) + (rcMarks || 0) + (iaMarks || 0);
                }
            }

            // Grade calculation
            let grade = 'F';
            if (groupSub.subject_type === 'co-scholastic' || groupSub.subject_type === 'skill-based') {
                grade = m.grade || null;
                totalObtained = null;
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
                INSERT INTO exam_group_results 
                (exam_group_subject_id, student_id, student_academic_id, attendance_status, marks_obtained,
                 theory_marks_obtained, lab_marks_obtained, oral_marks_obtained,
                 written_marks_obtained, reading_marks_obtained, writing_comp_marks_obtained,
                 dictation_marks_obtained, recitation_marks_obtained, ia_pr_marks_obtained,
                 grade, teacher_remark, principal_remark, next_class, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    attendance_status = VALUES(attendance_status),
                    marks_obtained = VALUES(marks_obtained),
                    theory_marks_obtained = VALUES(theory_marks_obtained),
                    lab_marks_obtained = VALUES(lab_marks_obtained),
                    oral_marks_obtained = VALUES(oral_marks_obtained),
                    written_marks_obtained = VALUES(written_marks_obtained),
                    reading_marks_obtained = VALUES(reading_marks_obtained),
                    writing_comp_marks_obtained = VALUES(writing_comp_marks_obtained),
                    dictation_marks_obtained = VALUES(dictation_marks_obtained),
                    recitation_marks_obtained = VALUES(recitation_marks_obtained),
                    ia_pr_marks_obtained = VALUES(ia_pr_marks_obtained),
                    grade = VALUES(grade),
                    teacher_remark = VALUES(teacher_remark),
                    principal_remark = VALUES(principal_remark),
                    next_class = VALUES(next_class),
                    recorded_at = NOW()
            `, [
                groupSub.id, m.student_id, m.student_academic_id, m.attendance_status, totalObtained,
                thMarks, lbMarks, orMarks,
                wrMarks, rdMarks, wcMarks, dcMarks, rcMarks, iaMarks,
                grade, m.teacher_remark || null, m.principal_remark || null, m.next_class || null
            ]);
        }

        if (total_working_days !== undefined || ptm_date !== undefined) {
            await conn.execute(
                `UPDATE exam_groups SET total_working_days = COALESCE(?, total_working_days), ptm_date = COALESCE(?, ptm_date) WHERE id = ?`,
                [toInt(total_working_days), ptm_date || null, exam_group_id]
            );
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
            SELECT egr.*, s.id as subject_id, s.name as subject_name, st.id as student_id, u.name as student_name, sar.roll_no as roll_no, egr.principal_remark
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN subjects s ON s.id = egs.subject_id
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            WHERE egs.exam_group_id = ?
        `, [examGroupId]);

        for (const row of rows) {
            const components = [];
            if (row.written_marks_obtained !== null) components.push({ component_id: 1, marks_obtained: row.written_marks_obtained });
            if (row.reading_marks_obtained !== null) components.push({ component_id: 2, marks_obtained: row.reading_marks_obtained });
            if (row.writing_comp_marks_obtained !== null) components.push({ component_id: 3, marks_obtained: row.writing_comp_marks_obtained });
            if (row.dictation_marks_obtained !== null) components.push({ component_id: 4, marks_obtained: row.dictation_marks_obtained });
            if (row.recitation_marks_obtained !== null) components.push({ component_id: 5, marks_obtained: row.recitation_marks_obtained });
            if (row.theory_marks_obtained !== null) components.push({ component_id: 6, marks_obtained: row.theory_marks_obtained });
            if (row.lab_marks_obtained !== null) components.push({ component_id: 7, marks_obtained: row.lab_marks_obtained });
            if (row.oral_marks_obtained !== null) components.push({ component_id: 8, marks_obtained: row.oral_marks_obtained });
            if (row.ia_pr_marks_obtained !== null) components.push({ component_id: 9, marks_obtained: row.ia_pr_marks_obtained });
            row.components = components;
        }

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
            `SELECT s.id as student_id, sar.id as student_academic_id, sar.class_id, sar.grade_id, g.name as class_name, c.name as section_name, sar.roll_no as roll_no
             FROM students s
             JOIN student_academic_records sar ON sar.student_id = s.id
             JOIN classes c ON c.id = sar.class_id
             JOIN grades g ON g.id = c.grade_id
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
            SELECT eg.*, ay.name AS academic_year_name, g.name as class_name, c.name as section_name, sar.roll_no as roll_no
            FROM exam_groups eg
            JOIN students s ON s.user_id = ?
            LEFT JOIN academic_years ay ON ay.id = eg.academic_year_id
            LEFT JOIN student_academic_records sar ON sar.student_id = s.id
            JOIN classes c ON c.id = sar.class_id
            JOIN grades g ON g.id = c.grade_id
            WHERE (eg.class_id = ? OR JSON_CONTAINS(COALESCE(eg.section_ids, "[]"), CAST(? AS CHAR)) OR (eg.class_id IS NULL AND eg.section_ids IS NULL AND eg.grade_id = ?)) 
            AND eg.status IN ('Published', 'Over')
            ORDER BY eg.created_at DESC
        `, [student_id, class_id, class_id, grade_id]);

        // Fetch subjects and results for these exams
        if (examRows.length > 0) {
            const groupIds = examRows.map(r => r.id);
            const [subjectRows] = await conn.query(`
                SELECT egs.*, s.name AS subject_name, s.subject_type,
                       COALESCE(egs.theory_max_marks, egs_orig.theory_max_marks) as theory_max_marks,
                       COALESCE(egs.lab_max_marks, egs_orig.lab_max_marks) as lab_max_marks,
                       COALESCE(egs.oral_max_marks, egs_orig.oral_max_marks) as oral_max_marks,
                       COALESCE(egs.written_max_marks, egs_orig.written_max_marks) as written_max_marks,
                       COALESCE(egs.reading_max_marks, egs_orig.reading_max_marks) as reading_max_marks,
                       COALESCE(egs.writing_comp_max_marks, egs_orig.writing_comp_max_marks) as writing_comp_max_marks,
                       COALESCE(egs.dictation_max_marks, egs_orig.dictation_max_marks) as dictation_max_marks,
                       COALESCE(egs.recitation_max_marks, egs_orig.recitation_max_marks) as recitation_max_marks,
                       COALESCE(egs.ia_pr_max_marks, egs_orig.ia_pr_max_marks) as ia_pr_max_marks,
                       egr.marks_obtained, egr.grade as result_grade, egr.attendance_status,
                       egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                       egr.written_marks_obtained, egr.reading_marks_obtained, egr.writing_comp_marks_obtained,
                       egr.dictation_marks_obtained, egr.recitation_marks_obtained, egr.ia_pr_marks_obtained
                FROM exam_group_subjects egs
                JOIN subjects s ON s.id = egs.subject_id
                LEFT JOIN exam_group_results egr ON egr.exam_group_subject_id = egs.id AND egr.student_id = ?
                LEFT JOIN (
                    SELECT exam_group_id, subject_id, 
                           MAX(theory_max_marks) as theory_max_marks,
                           MAX(lab_max_marks) as lab_max_marks,
                           MAX(oral_max_marks) as oral_max_marks,
                           MAX(written_max_marks) as written_max_marks,
                           MAX(reading_max_marks) as reading_max_marks,
                           MAX(writing_comp_max_marks) as writing_comp_max_marks,
                           MAX(dictation_max_marks) as dictation_max_marks,
                           MAX(recitation_max_marks) as recitation_max_marks,
                           MAX(ia_pr_max_marks) as ia_pr_max_marks
                    FROM exam_group_subjects
                    GROUP BY exam_group_id, subject_id
                ) egs_orig ON egs_orig.exam_group_id = egs.exam_group_id AND egs_orig.subject_id = egs.subject_id
                WHERE egs.exam_group_id IN (?)
            `, [student_id, groupIds]);

            for (const row of examRows) {
                const rawSubs = subjectRows.filter(s => s.exam_group_id === row.id);
                const subMap = new Map();
                for (const s of rawSubs) {
                    const key = s.subject_id || s.subject_name;
                    if (!subMap.has(key)) {
                        subMap.set(key, { ...s });
                    } else {
                        const existing = subMap.get(key);
                        if (existing.marks_obtained === null || existing.marks_obtained === undefined) {
                            existing.marks_obtained = s.marks_obtained;
                            existing.result_grade = s.result_grade;
                            existing.attendance_status = s.attendance_status;
                        }
                        const pick = (a, b) => (a !== null && a !== undefined && a !== '' && a !== '-') ? a : b;
                        existing.written_marks_obtained = pick(existing.written_marks_obtained, s.written_marks_obtained);
                        existing.reading_marks_obtained = pick(existing.reading_marks_obtained, s.reading_marks_obtained);
                        existing.writing_comp_marks_obtained = pick(existing.writing_comp_marks_obtained, s.writing_comp_marks_obtained);
                        existing.dictation_marks_obtained = pick(existing.dictation_marks_obtained, s.dictation_marks_obtained);
                        existing.recitation_marks_obtained = pick(existing.recitation_marks_obtained, s.recitation_marks_obtained);
                        existing.oral_marks_obtained = pick(existing.oral_marks_obtained, s.oral_marks_obtained);
                        existing.theory_marks_obtained = pick(existing.theory_marks_obtained, s.theory_marks_obtained);
                        existing.lab_marks_obtained = pick(existing.lab_marks_obtained, s.lab_marks_obtained);
                        existing.ia_pr_marks_obtained = pick(existing.ia_pr_marks_obtained, s.ia_pr_marks_obtained);

                        existing.written_max_marks = existing.written_max_marks || s.written_max_marks;
                        existing.reading_max_marks = existing.reading_max_marks || s.reading_max_marks;
                        existing.writing_comp_max_marks = existing.writing_comp_max_marks || s.writing_comp_max_marks;
                        existing.dictation_max_marks = existing.dictation_max_marks || s.dictation_max_marks;
                        existing.recitation_max_marks = existing.recitation_max_marks || s.recitation_max_marks;
                        existing.oral_max_marks = existing.oral_max_marks || s.oral_max_marks;
                        existing.theory_max_marks = existing.theory_max_marks || s.theory_max_marks;
                        existing.lab_max_marks = existing.lab_max_marks || s.lab_max_marks;
                        existing.ia_pr_max_marks = existing.ia_pr_max_marks || s.ia_pr_max_marks;
                    }
                }
                row.subjects = Array.from(subMap.values());
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

        const examType = req.query.exam_type && req.query.exam_type !== 'all' ? req.query.exam_type : null;

        let studentBaseSql = `
            FROM students st
            JOIN users u ON u.id = st.user_id
            JOIN student_academic_records sar ON sar.student_id = st.id
            JOIN (
                SELECT student_id, MAX(id) latest_id
                FROM student_academic_records
                GROUP BY student_id
            ) latest ON latest.student_id = st.id AND latest.latest_id = sar.id
            WHERE (
                EXISTS (SELECT 1 FROM exam_group_results egr WHERE egr.student_id = st.id)
                OR EXISTS (
                    SELECT 1 FROM exam_groups eg 
                    WHERE (eg.class_id = sar.class_id OR eg.grade_id = sar.grade_id OR JSON_CONTAINS(COALESCE(eg.section_ids, "[]"), CAST(sar.class_id AS CHAR)))
                    AND (sar.academic_year_id = eg.academic_year_id OR eg.academic_year_id IS NULL)
                )
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
        if (examType) {
            whereClause.push(`(
                EXISTS (
                    SELECT 1 FROM exam_groups eg_t 
                    WHERE (eg_t.class_id = sar.class_id OR eg_t.grade_id = sar.grade_id OR JSON_CONTAINS(COALESCE(eg_t.section_ids, "[]"), CAST(sar.class_id AS CHAR)))
                    AND (sar.academic_year_id = eg_t.academic_year_id OR eg_t.academic_year_id IS NULL)
                    AND eg_t.exam_type = ?
                )
            )`);
            params.push(examType);
        }
        if (search) {
            whereClause.push(`(
                u.name LIKE ? OR 
                sar.roll_no LIKE ? OR 
                EXISTS (
                    SELECT 1 
                    FROM exam_groups eg2
                    WHERE (eg2.class_id = sar.class_id OR eg2.grade_id = sar.grade_id OR JSON_CONTAINS(COALESCE(eg2.section_ids, "[]"), CAST(sar.class_id AS CHAR)))
                    AND (eg2.name LIKE ? OR eg2.exam_type LIKE ?)
                )
            )`);
            params.push(search, search, search, search);
        }

        if (whereClause.length > 0) {
            studentBaseSql += ' AND ' + whereClause.join(' AND ');
        }

        const [countRows] = await db.execute(`SELECT COUNT(DISTINCT st.id) AS total ${studentBaseSql}`, params);
        const total = countRows[0].total;

        const [studentRows] = await db.execute(`SELECT DISTINCT st.id, u.name ${studentBaseSql} ORDER BY u.name ASC LIMIT ${limit} OFFSET ${offset}`, params);

        if (studentRows.length === 0) {
            return res.json({ studentSummaries: [], total, limit, offset });
        }

        const studentIds = studentRows.map(r => r.id);

        const [rows] = await db.query(`
            SELECT st.id as student_id, u.name as student_name, sar.roll_no, u.avatar_url,
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.exam_type, eg.custom_exam_name, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name, s.subject_type, s.id as subject_id,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.has_written, egs.has_reading, egs.has_writing_comp,
                   egs.has_dictation, egs.has_recitation, egs.has_ia_pr,
                   COALESCE(egs.theory_max_marks, egs_orig.theory_max_marks) as theory_max_marks,
                   COALESCE(egs.lab_max_marks, egs_orig.lab_max_marks) as lab_max_marks,
                   COALESCE(egs.oral_max_marks, egs_orig.oral_max_marks) as oral_max_marks,
                   COALESCE(egs.written_max_marks, egs_orig.written_max_marks) as written_max_marks,
                   COALESCE(egs.reading_max_marks, egs_orig.reading_max_marks) as reading_max_marks,
                   COALESCE(egs.writing_comp_max_marks, egs_orig.writing_comp_max_marks) as writing_comp_max_marks,
                   COALESCE(egs.dictation_max_marks, egs_orig.dictation_max_marks) as dictation_max_marks,
                   COALESCE(egs.recitation_max_marks, egs_orig.recitation_max_marks) as recitation_max_marks,
                   COALESCE(egs.ia_pr_max_marks, egs_orig.ia_pr_max_marks) as ia_pr_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   egr.written_marks_obtained, egr.reading_marks_obtained, egr.writing_comp_marks_obtained,
                   egr.dictation_marks_obtained, egr.recitation_marks_obtained, egr.ia_pr_marks_obtained,
                   COALESCE(
                       (
                           SELECT CASE WHEN si.status = 'paid' THEN 1 ELSE 0 END
                           FROM student_invoices si
                           WHERE si.student_id = u.id
                           ORDER BY si.id DESC LIMIT 1
                       ),
                       1
                   ) as due_cleared
            FROM students st
            JOIN users u ON u.id = st.user_id
            JOIN student_academic_records sar ON sar.student_id = st.id
            JOIN (
                SELECT student_id, MAX(id) latest_id
                FROM student_academic_records
                GROUP BY student_id
            ) latest ON latest.student_id = st.id AND latest.latest_id = sar.id
            LEFT JOIN grades g ON g.id = sar.grade_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
            JOIN exam_groups eg ON (eg.class_id = sar.class_id OR eg.grade_id = sar.grade_id OR JSON_CONTAINS(COALESCE(eg.section_ids, "[]"), CAST(sar.class_id AS CHAR))) AND (sar.academic_year_id = eg.academic_year_id OR eg.academic_year_id IS NULL)
            LEFT JOIN grades eg_g ON eg_g.id = eg.grade_id
            LEFT JOIN academic_years eg_ay ON eg_ay.id = eg.academic_year_id
            LEFT JOIN exam_group_subjects egs ON egs.exam_group_id = eg.id
            LEFT JOIN subjects s ON s.id = egs.subject_id
            LEFT JOIN (
                SELECT exam_group_id, subject_id, 
                       MAX(theory_max_marks) as theory_max_marks,
                       MAX(lab_max_marks) as lab_max_marks,
                       MAX(oral_max_marks) as oral_max_marks,
                       MAX(written_max_marks) as written_max_marks,
                       MAX(reading_max_marks) as reading_max_marks,
                       MAX(writing_comp_max_marks) as writing_comp_max_marks,
                       MAX(dictation_max_marks) as dictation_max_marks,
                       MAX(recitation_max_marks) as recitation_max_marks,
                       MAX(ia_pr_max_marks) as ia_pr_max_marks
                FROM exam_group_subjects
                GROUP BY exam_group_id, subject_id
            ) egs_orig ON egs_orig.exam_group_id = egs.exam_group_id AND egs_orig.subject_id = egs.subject_id
            LEFT JOIN exam_group_results egr ON egr.exam_group_subject_id = egs.id AND egr.student_id = st.id
            WHERE st.id IN (?)
            ${examType ? "AND eg.exam_type = ?" : ""}
            ORDER BY u.name ASC, eg.start_date DESC
        `, examType ? [studentIds, examType] : [studentIds]);

        // Group by student
        const studentMap = {};
        rows.forEach(row => {
            if (!studentMap[row.student_id]) {
                studentMap[row.student_id] = {
                    id: row.student_id,
                    avatar_url: row.avatar_url,
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

            if (row.exam_id && !studentMap[row.student_id].exams[row.exam_id]) {
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

            if (row.exam_id && row.subject_name) {
                studentMap[row.student_id].exams[row.exam_id].subjects.push({
                    subject_id: row.subject_id,
                    subject_name: row.subject_name,
                    subject_type: row.subject_type,
                    marks_obtained: row.marks_obtained,
                    max_marks: row.max_marks,
                    grade: row.grade,
                    attendance_status: row.attendance_status,
                    has_theory: row.has_theory,
                    has_lab: row.has_lab,
                    has_oral: row.has_oral,
                    has_written: row.has_written,
                    has_reading: row.has_reading,
                    has_writing_comp: row.has_writing_comp,
                    has_dictation: row.has_dictation,
                    has_recitation: row.has_recitation,
                    has_ia_pr: row.has_ia_pr,
                    theory_max_marks: row.theory_max_marks,
                    lab_max_marks: row.lab_max_marks,
                    oral_max_marks: row.oral_max_marks,
                    written_max_marks: row.written_max_marks,
                    reading_max_marks: row.reading_max_marks,
                    writing_comp_max_marks: row.writing_comp_max_marks,
                    dictation_max_marks: row.dictation_max_marks,
                    recitation_max_marks: row.recitation_max_marks,
                    ia_pr_max_marks: row.ia_pr_max_marks,
                    theory_marks_obtained: row.theory_marks_obtained,
                    lab_marks_obtained: row.lab_marks_obtained,
                    oral_marks_obtained: row.oral_marks_obtained,
                    written_marks_obtained: row.written_marks_obtained,
                    reading_marks_obtained: row.reading_marks_obtained,
                    writing_comp_marks_obtained: row.writing_comp_marks_obtained,
                    dictation_marks_obtained: row.dictation_marks_obtained,
                    recitation_marks_obtained: row.recitation_marks_obtained,
                    ia_pr_marks_obtained: row.ia_pr_marks_obtained
                });
            }
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
        const [rows] = await db.execute(`
            SELECT st.id as student_id, u.name as student_name, u.avatar_url, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.exam_type, eg.start_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.has_written, egs.has_reading, egs.has_writing_comp,
                   egs.has_dictation, egs.has_recitation, egs.has_ia_pr,
                   COALESCE(egs.theory_max_marks, egs_orig.theory_max_marks) as theory_max_marks,
                   COALESCE(egs.lab_max_marks, egs_orig.lab_max_marks) as lab_max_marks,
                   COALESCE(egs.oral_max_marks, egs_orig.oral_max_marks) as oral_max_marks,
                   COALESCE(egs.written_max_marks, egs_orig.written_max_marks) as written_max_marks,
                   COALESCE(egs.reading_max_marks, egs_orig.reading_max_marks) as reading_max_marks,
                   COALESCE(egs.writing_comp_max_marks, egs_orig.writing_comp_max_marks) as writing_comp_max_marks,
                   COALESCE(egs.dictation_max_marks, egs_orig.dictation_max_marks) as dictation_max_marks,
                   COALESCE(egs.recitation_max_marks, egs_orig.recitation_max_marks) as recitation_max_marks,
                   COALESCE(egs.ia_pr_max_marks, egs_orig.ia_pr_max_marks) as ia_pr_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   egr.written_marks_obtained, egr.reading_marks_obtained, egr.writing_comp_marks_obtained,
                   egr.dictation_marks_obtained, egr.recitation_marks_obtained, egr.ia_pr_marks_obtained,
                   egr.teacher_remark, egr.principal_remark, egr.next_class, eg.total_working_days, eg.ptm_date, s.subject_type, st.fathers_name, st.mothers_name, st.date_of_birth as dob,
                   st.admission_no, st.blood_group, u.gender, u.address, c.name as section_name
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN exam_groups eg ON eg.id = egs.exam_group_id
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            LEFT JOIN (
                SELECT exam_group_id, subject_id, 
                       MAX(theory_max_marks) as theory_max_marks,
                       MAX(lab_max_marks) as lab_max_marks,
                       MAX(oral_max_marks) as oral_max_marks,
                       MAX(written_max_marks) as written_max_marks,
                       MAX(reading_max_marks) as reading_max_marks,
                       MAX(writing_comp_max_marks) as writing_comp_max_marks,
                       MAX(dictation_max_marks) as dictation_max_marks,
                       MAX(recitation_max_marks) as recitation_max_marks,
                       MAX(ia_pr_max_marks) as ia_pr_max_marks
                FROM exam_group_subjects
                GROUP BY exam_group_id, subject_id
            ) egs_orig ON egs_orig.exam_group_id = egs.exam_group_id AND egs_orig.subject_id = egs.subject_id
            LEFT JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            LEFT JOIN grades g ON g.id = sar.grade_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
            LEFT JOIN grades eg_g ON eg_g.id = eg.grade_id
            LEFT JOIN academic_years eg_ay ON eg_ay.id = eg.academic_year_id
            LEFT JOIN subjects s ON s.id = egs.subject_id
            LEFT JOIN classes c ON c.id = sar.class_id
            WHERE st.id = ? AND eg.id = ?
        `, [student_id, exam_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Marksheet data not found' });
        }

        const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);
        const formatMarks = (obtained, has, attendance) => {
            if (attendance === 'Absent') return '-';
            if (!checkTrue(has)) return '-';
            if (obtained !== null && obtained !== undefined && obtained !== '') {
                return `${Math.round(Number(obtained))}`;
            }
            // if (checkTrue(has)) return '0';
            // return '-';
            return '0';
        };
        const calculateGrade = (pct) => {
            const val = Number(pct) || 0;
            if (val >= 91) return 'A+';
            if (val >= 81) return 'A';
            if (val >= 71) return 'B+';
            if (val >= 61) return 'B';
            if (val >= 51) return 'C+';
            if (val >= 41) return 'C';
            if (val >= 33) return 'D';
            return 'F';
        };

        let className = rows[0].grade_name || rows[0].class_name || 'N/A';
        let rawSec = rows[0].section_name || '';
        let sectionName = rawSec;

        if (sectionName.includes('-')) {
            const parts = sectionName.split('-');
            sectionName = parts[parts.length - 1].trim();
        } else if (sectionName.toLowerCase().trim() === className.toLowerCase().trim()) {
            sectionName = '';
        }

        let classSectionDisplay = className;
        if (sectionName && sectionName.toLowerCase() !== className.toLowerCase()) {
            classSectionDisplay = `${className} - ${sectionName}`;
        }

        const student = {
            id: rows[0].student_id,
            name: rows[0].student_name,
            avatar_url: rows[0].avatar_url,
            roll_no: rows[0].roll_no || 'N/A',
            class: classSectionDisplay,
            class_name: className,
            grade_name: classSectionDisplay,
            section: sectionName,
            class_section: classSectionDisplay,
            admission_no: rows[0].admission_no || '',
            gender: rows[0].gender || '',
            blood_group: rows[0].blood_group || '',
            address: rows[0].address || '',
            academic_year_name: rows[0].academic_year_name || 'N/A',
            fathers_name: rows[0].fathers_name || '',
            mothers_name: rows[0].mothers_name || '',
            father_name: rows[0].fathers_name || '',
            mother_name: rows[0].mothers_name || '',
            dob: rows[0].dob ? new Date(rows[0].dob).toLocaleDateString('en-IN') : ''
        };

        let totalMax = 0;
        let totalObtained = 0;
        let hasFailed = false;
        let dynamicTeacherRemark = null;
        let dynamicPrincipalRemark = null;

        const academicRows = rows.filter(r => r.subject_type === 'academic' || !r.subject_type);
        const coScholasticRows = rows.filter(r => r.subject_type === 'co-scholastic');
        const skillBasedRows = rows.filter(r => r.subject_type === 'skill-based');

        const subjects = academicRows.map((row, idx) => {
            if (row.grade === 'F' || row.attendance_status === 'Absent') hasFailed = true;
            if (row.teacher_remark) dynamicTeacherRemark = row.teacher_remark;
            if (row.principal_remark) dynamicPrincipalRemark = row.principal_remark;

            const obtained = (row.attendance_status !== 'Absent' && row.marks_obtained !== null) ? Number(row.marks_obtained) : 0;
            totalMax += Number(row.max_marks || 0);
            if (row.attendance_status !== 'Absent') totalObtained += obtained;

            const subMax = Number(row.max_marks || 0);
            const percentageVal = subMax > 0 ? (obtained / subMax) * 100 : 0;

            // Count total active components for this subject row
            const compFlags = [row.has_written, row.has_reading, row.has_writing_comp, row.has_dictation, row.has_recitation, row.has_ia_pr, row.has_oral, row.has_lab, row.has_theory];
            const activeFlagsCount = compFlags.filter(f => checkTrue(f)).length;

            const components = [];
            const addComp = (name, flag, mmKey, t1Val, t2Val) => {
                const flagActive = checkTrue(row[flag]);
                const t1Has = t1Val !== null && t1Val !== undefined && t1Val !== '' && t1Val !== '-';
                const t2Has = t2Val !== null && t2Val !== undefined && t2Val !== '' && t2Val !== '-';
                if (flagActive || t1Has || t2Has) {
                    const rawMM = row[mmKey];
                    let mmVal = (rawMM !== null && rawMM !== undefined && rawMM !== '' && Number(rawMM) > 0)
                        ? Math.round(Number(rawMM))
                        : (activeFlagsCount <= 1 && subMax > 0 ? Math.round(subMax) : '-');

                    components.push({
                        name,
                        mm: mmVal,
                        term1: t1Val,
                        term2: t2Val
                    });
                }
            };

            addComp('Written', 'has_written', 'written_max_marks', formatMarks(row.written_marks_obtained, row.has_written, row.attendance_status), '-');
            addComp('Reading', 'has_reading', 'reading_max_marks', formatMarks(row.reading_marks_obtained, row.has_reading, row.attendance_status), '-');
            addComp('Writing', 'has_writing_comp', 'writing_comp_max_marks', formatMarks(row.writing_comp_marks_obtained, row.has_writing_comp, row.attendance_status), '-');
            addComp('Dictation', 'has_dictation', 'dictation_max_marks', formatMarks(row.dictation_marks_obtained, row.has_dictation, row.attendance_status), '-');
            addComp('Recitation', 'has_recitation', 'recitation_max_marks', formatMarks(row.recitation_marks_obtained, row.has_recitation, row.attendance_status), '-');
            addComp('I.A./PR', 'has_ia_pr', 'ia_pr_max_marks', formatMarks(row.ia_pr_marks_obtained, row.has_ia_pr, row.attendance_status), '-');
            addComp('Oral', 'has_oral', 'oral_max_marks', formatMarks(row.oral_marks_obtained, row.has_oral, row.attendance_status), '-');
            addComp('Lab', 'has_lab', 'lab_max_marks', formatMarks(row.lab_marks_obtained, row.has_lab, row.attendance_status), '-');
            addComp('Theory', 'has_theory', 'theory_max_marks', formatMarks(row.theory_marks_obtained, row.has_theory, row.attendance_status), '-');

            return {
                serial_no: idx + 1,
                subject_name: row.subject_name,
                max: subMax,
                components,
                compRowSpan: components.length + 1,
                exam1_marks: row.attendance_status === 'Absent' ? '-' : Math.round(obtained),
                exam1_grade: row.grade || '-',
                exam1_theory: formatMarks(row.theory_marks_obtained, row.has_theory, row.attendance_status),
                exam1_lab: formatMarks(row.lab_marks_obtained, row.has_lab, row.attendance_status),
                exam1_oral: formatMarks(row.oral_marks_obtained, row.has_oral, row.attendance_status),
                exam1_written: formatMarks(row.written_marks_obtained, row.has_written, row.attendance_status),
                exam1_reading: formatMarks(row.reading_marks_obtained, row.has_reading, row.attendance_status),
                exam1_writing_comp: formatMarks(row.writing_comp_marks_obtained, row.has_writing_comp, row.attendance_status),
                exam1_dictation: formatMarks(row.dictation_marks_obtained, row.has_dictation, row.attendance_status),
                exam1_recitation: formatMarks(row.recitation_marks_obtained, row.has_recitation, row.attendance_status),
                exam1_ia_pr: formatMarks(row.ia_pr_marks_obtained, row.has_ia_pr, row.attendance_status),
                exam2_marks: '-', exam2_grade: '-', exam2_theory: '-', exam2_lab: '-', exam2_oral: '-',
                exam2_written: '-', exam2_reading: '-', exam2_writing_comp: '-', exam2_dictation: '-', exam2_recitation: '-', exam2_ia_pr: '-',
                total: Math.round(obtained),
                yearly_avg: subMax > 0 ? Math.round(percentageVal) : '-',
                overall_grade: row.grade || '-',
                grade: row.grade || '-'
            };
        });

        totalObtained = Math.round(totalObtained);
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
        const currentDate = new Date().toLocaleDateString();
        const finalResult = hasFailed ? 'Fail' : 'Pass';
        const teacherRemark = dynamicTeacherRemark || (hasFailed ? 'Need to do hardwork.' : 'Good performance. Keep it up!');
        const principalRemark = dynamicPrincipalRemark || '';

        const showTheory = academicRows.some(s => checkTrue(s.has_theory));
        const showLab = academicRows.some(s => checkTrue(s.has_lab));
        const showOral = academicRows.some(s => checkTrue(s.has_oral));
        const showWritten = academicRows.some(s => checkTrue(s.has_written));
        const showReading = academicRows.some(s => checkTrue(s.has_reading));
        const showWritingComp = academicRows.some(s => checkTrue(s.has_writing_comp));
        const showDictation = academicRows.some(s => checkTrue(s.has_dictation));
        const showRecitation = academicRows.some(s => checkTrue(s.has_recitation));
        const showIaPr = academicRows.some(s => checkTrue(s.has_ia_pr));

        const maxTheory = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_theory) && s.theory_max_marks ? parseInt(s.theory_max_marks) : null), null) || '';
        const maxLab = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_lab) && s.lab_max_marks ? parseInt(s.lab_max_marks) : null), null) || '';
        const maxOral = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_oral) && s.oral_max_marks ? parseInt(s.oral_max_marks) : null), null) || '';
        const maxWritten = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_written) && s.written_max_marks ? parseInt(s.written_max_marks) : null), null) || '';
        const maxReading = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_reading) && s.reading_max_marks ? parseInt(s.reading_max_marks) : null), null) || '';
        const maxWritingComp = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_writing_comp) && s.writing_comp_max_marks ? parseInt(s.writing_comp_max_marks) : null), null) || '';
        const maxDictation = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_dictation) && s.dictation_max_marks ? parseInt(s.dictation_max_marks) : null), null) || '';
        const maxRecitation = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_recitation) && s.recitation_max_marks ? parseInt(s.recitation_max_marks) : null), null) || '';
        const maxIaPr = academicRows.reduce((acc, s) => acc || (checkTrue(s.has_ia_pr) && s.ia_pr_max_marks ? parseInt(s.ia_pr_max_marks) : null), null) || '';

        const baseNewFields = [showTheory, showWritten, showReading, showWritingComp, showDictation, showRecitation, showIaPr, showOral, showLab].filter(Boolean).length;
        const exam1ColSpan = baseNewFields + 1;
        const exam2ColSpan = baseNewFields + 1;
        const examColSpan = exam1ColSpan;

        const dynamicColumns = [];
        if (showWritten) dynamicColumns.push({ id: 'written', name: 'Written', max: maxWritten });
        if (showReading) dynamicColumns.push({ id: 'reading', name: 'Reading', max: maxReading });
        if (showWritingComp) dynamicColumns.push({ id: 'writing_comp', name: 'Writing', max: maxWritingComp });
        if (showDictation) dynamicColumns.push({ id: 'dictation', name: 'Dictation', max: maxDictation });
        if (showRecitation) dynamicColumns.push({ id: 'recitation', name: 'Recitation', max: maxRecitation });
        if (showTheory) dynamicColumns.push({ id: 'theory', name: 'Theory', max: maxTheory });
        if (showLab) dynamicColumns.push({ id: 'lab', name: 'Lab', max: maxLab });
        if (showOral) dynamicColumns.push({ id: 'oral', name: 'Oral', max: maxOral });
        if (showIaPr) dynamicColumns.push({ id: 'ia_pr', name: 'I.A./PR', max: maxIaPr });

        subjects.forEach(sub => {
            sub.exam1_dynamicMarks = dynamicColumns.map(col => {
                let val = '-';
                if (col.id === 'theory') val = sub.exam1_theory;
                else if (col.id === 'written') val = sub.exam1_written;
                else if (col.id === 'reading') val = sub.exam1_reading;
                else if (col.id === 'writing_comp') val = sub.exam1_writing_comp;
                else if (col.id === 'dictation') val = sub.exam1_dictation;
                else if (col.id === 'recitation') val = sub.exam1_recitation;
                else if (col.id === 'ia_pr') val = sub.exam1_ia_pr;
                else if (col.id === 'oral') val = sub.exam1_oral;
                else if (col.id === 'lab') val = sub.exam1_lab;
                return { value: val };
            });
        });

        let logoData = null;
        try {
            const logoPath = require('path').join(__dirname, '../assets/Times_Internation_School_logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        const coScholastic = coScholasticRows.map(s => ({
            name: s.subject_name,
            term1: s.grade || '-',
            term2: '-'
        }));

        const skillBased = skillBasedRows.map(s => ({
            name: s.subject_name,
            term1: s.grade || '-',
            term2: '-'
        }));

        const getNextGrade = (currentGradeName, customNextClass) => {
            if (customNextClass && String(customNextClass).trim()) return String(customNextClass).trim();
            if (!currentGradeName) return 'Next Class';
            const g = String(currentGradeName).trim().toLowerCase();
            if (g.includes('play')) return 'Nursery';
            if (g.includes('nursery')) return 'LKG';
            if (g.includes('lkg')) return 'UKG';
            if (g.includes('ukg') || g.includes('prep') || g.includes('kg')) return 'I';
            if (g.includes('class - i') || g.includes('class i') || g.includes('grade 1') || g.includes('class 1') || g === 'i' || g === '1') return 'II';
            if (g.includes('class - ii') || g.includes('class ii') || g.includes('grade 2') || g.includes('class 2') || g === 'ii' || g === '2') return 'III';
            if (g.includes('class - iii') || g.includes('class iii') || g.includes('grade 3') || g.includes('class 3') || g === 'iii' || g === '3') return 'IV';
            if (g.includes('class - iv') || g.includes('class iv') || g.includes('grade 4') || g.includes('class 4') || g === 'iv' || g === '4') return 'V';
            if (g.includes('class - v') || g.includes('class v') || g.includes('grade 5') || g.includes('class 5') || g === 'v' || g === '5') return 'VI';
            if (g.includes('class - vi') || g.includes('class vi') || g.includes('grade 6') || g.includes('class 6') || g === 'vi' || g === '6') return 'VII';
            if (g.includes('class - vii') || g.includes('class vii') || g.includes('grade 7') || g.includes('class 7') || g === 'vii' || g === '7') return 'VIII';
            if (g.includes('class - viii') || g.includes('class viii') || g.includes('grade 8') || g.includes('class 8') || g === 'viii' || g === '8') return 'IX';
            if (g.includes('class - ix') || g.includes('class ix') || g.includes('grade 9') || g.includes('class 9') || g === 'ix' || g === '9') return 'X';
            if (g.includes('class - x') || g.includes('class x') || g.includes('grade 10') || g.includes('class 10') || g === 'x' || g === '10') return 'XI';
            if (g.includes('class - xi') || g.includes('class xi') || g.includes('grade 11') || g.includes('class 11') || g === 'xi' || g === '11') return 'XII';
            return 'Next Class';
        };

        let attendedCount = 0;
        try {
            const [attRows] = await db.execute(`
                SELECT COUNT(DISTINCT attendance_date) as attended_days
                FROM attendance
                WHERE student_id = ? AND status IN ('Present', 'Late', 'present', 'late')
            `, [student_id]);
            attendedCount = attRows[0]?.attended_days || 0;
        } catch (e) { }

        const workingDays = rows[0].total_working_days || 102;
        const nextGrade = getNextGrade(rows[0].grade_name, rows[0].next_class);

        const attendanceStats = {
            hasTerm1: true,
            term1Working: workingDays,
            term1Attended: attendedCount,
            term1Absent: Math.max(0, workingDays - attendedCount),
            term1Percentage: workingDays ? Math.round((attendedCount / workingDays) * 100) : 0,
            hasTerm2: false,
            totalWorking: workingDays,
            totalAttended: attendedCount,
            totalAbsent: Math.max(0, workingDays - attendedCount),
            totalPercentage: workingDays ? Math.round((attendedCount / workingDays) * 100) : 0
        };

        const physicalStats = {
            term1Working: workingDays,
            term1Attended: attendedCount,
            attendance: `${attendedCount}/${workingDays}`,
            sports: '', behaviour: '', cleanliness: ''
        };

        const ptmStats = {
            term1Date: rows[0].ptm_date ? new Date(rows[0].ptm_date).toLocaleDateString('en-IN') : '',
            term2Date: ''
        };

        let school = {};
        try {
            const schoolPath = require('path').join(__dirname, '../school-info.json');
            school = JSON.parse(require('fs').readFileSync(schoolPath, 'utf8'));
        } catch (e) {
            console.log('No school-info.json found');
        }

        const grandGrade = calculateGrade(Number(percentage));

        const templateData = {
            school,
            student,
            reportTitle: rows[0].exam_name,
            exam1Name: rows[0].exam_name,
            exam2Name: 'Term II',
            subjects,
            showTheory, showLab, showOral,
            showWritten, showReading, showWritingComp,
            showDictation, showRecitation, showIaPr,
            maxTheory, maxLab, maxOral,
            maxWritten, maxReading, maxWritingComp,
            maxDictation, maxRecitation, maxIaPr,
            baseNewFields,
            exam1ColSpan, exam2ColSpan, examColSpan,
            totalMax, totalObtained, percentage,
            grandGrade,
            currentDate, finalResult, promotionStatus: null,
            nextGrade, ptmStats,
            logoData, coScholastic, skillBased, physicalStats, attendanceStats,
            teacherRemark, principalRemark,
            dynamicColumns
        };

        const templatePath = 'uploads/templates/senior_final_exam.hbs';

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
};

const GenerateAdmitCardPDF = async (req, res) => {
    const { student_id, exam_id } = req.body;
    if (!student_id || !exam_id) {
        return res.status(400).json({ error: 'Student ID and Exam ID are required' });
    }

    try {
        // 1. Fetch student info
        const [[student]] = await db.execute(`
            SELECT st.id, u.name, u.avatar_url, sar.roll_no, g.name AS grade_name, c.name AS class_name, st.fathers_name, st.mothers_name, ay.name AS academic_year_name, u.id AS user_id
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
            SELECT egs.exam_date, egs.start_time, egs.end_time, egs.sitting, egs.exam_category,
                   egs.has_oral, egs.has_written, egs.has_reading, egs.has_writing_comp, egs.has_dictation, egs.has_recitation,
                   s.name AS subject_name
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

const GenerateBulkAdmitCardPDF = async (req, res) => {
    const { student_ids, exam_id } = req.body;
    if (!student_ids || !exam_id || !Array.isArray(student_ids) || student_ids.length === 0) {
        return res.status(400).json({ error: 'student_ids array and exam_id are required' });
    }

    try {
        const pdfBuffers = [];

        // 3. Fetch exam group info
        const [[examGroup]] = await db.execute(`
            SELECT name FROM exam_groups WHERE id = ?
        `, [exam_id]);

        if (!examGroup) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // 4. Fetch the schedule / routine for the exam group
        const [routine] = await db.execute(`
            SELECT egs.exam_date, egs.start_time, egs.end_time, egs.sitting, egs.exam_category,
                   egs.has_oral, egs.has_written, egs.has_reading, egs.has_writing_comp, egs.has_dictation, egs.has_recitation,
                   s.name AS subject_name
            FROM exam_group_subjects egs
            JOIN subjects s ON s.id = egs.subject_id
            WHERE egs.exam_group_id = ? 
              AND (s.subject_type IS NULL OR s.subject_type NOT IN ('co-scholastic', 'skill-based'))
            ORDER BY egs.exam_date ASC, egs.start_time ASC
        `, [exam_id]);

        for (let student_id of student_ids) {
            // 1. Fetch student info
            const [[student]] = await db.execute(`
                SELECT st.id, u.name, u.avatar_url, sar.roll_no, g.name AS grade_name, c.name AS class_name, st.fathers_name, st.mothers_name, ay.name AS academic_year_name, u.id AS user_id
                FROM students st
                JOIN users u ON u.id = st.user_id
                LEFT JOIN student_academic_records sar ON sar.student_id = st.id
                LEFT JOIN grades g ON g.id = sar.grade_id
                LEFT JOIN classes c ON c.id = sar.class_id
                LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
                WHERE st.id = ?
                ORDER BY sar.id DESC LIMIT 1
            `, [student_id]);

            if (!student) continue;

            // 2. Double-check due cleared status on current invoice!
            const [[invoice]] = await db.execute(`
                SELECT status, (amount_due - amount_paid) as balance
                FROM student_invoices
                WHERE student_id = ?
                ORDER BY id DESC LIMIT 1
            `, [student.user_id]);

            // If an invoice exists and the status is NOT paid, prevent printing!
            if (invoice && invoice.status !== 'paid') {
                continue;
            }

            // 5. Generate Admit Card PDF
            const pdfBuffer = await generateAdmitCardPDF({
                student,
                exam_id,
                exam_name: examGroup.name,
                routine
            });

            pdfBuffers.push(pdfBuffer);
        }

        if (pdfBuffers.length === 0) {
            return res.status(404).json({ error: 'No admit cards generated (perhaps dues are pending or students not found)' });
        }

        let finalPdfBuffer;
        if (pdfBuffers.length === 1) {
            finalPdfBuffer = pdfBuffers[0];
        } else {
            finalPdfBuffer = await pdfService.mergePdfs(pdfBuffers);
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Bulk_AdmitCards_${examGroup.name.replace(/\\s+/g, '_')}.pdf`);
        return res.send(Buffer.from(finalPdfBuffer));
    } catch (err) {
        console.error('POST /api/exam/generate-bulk-admit-card error', err);
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
            SELECT st.id as student_id, u.name as student_name, u.avatar_url, sar.roll_no, 
                   COALESCE(sar.grade_id, eg.grade_id) as grade_id, 
                   COALESCE(g.name, eg_g.name) as grade_name, 
                   COALESCE(sar.academic_year_id, eg.academic_year_id) as academic_year_id, 
                   COALESCE(ay.name, eg_ay.name) as academic_year_name,
                   eg.id as exam_id, eg.name as exam_name, eg.exam_type, eg.start_date, eg.end_date, eg.is_results_published,
                   egr.marks_obtained, egr.grade, egr.attendance_status, egs.max_marks, s.name as subject_name,
                   egr.teacher_remark, egr.principal_remark,
                   egs.has_theory, egs.has_lab, egs.has_oral,
                   egs.has_written, egs.has_reading, egs.has_writing_comp,
                   egs.has_dictation, egs.has_recitation, egs.has_ia_pr,
                   COALESCE(egs.theory_max_marks, egs_orig.theory_max_marks) as theory_max_marks,
                   COALESCE(egs.lab_max_marks, egs_orig.lab_max_marks) as lab_max_marks,
                   COALESCE(egs.oral_max_marks, egs_orig.oral_max_marks) as oral_max_marks,
                   COALESCE(egs.written_max_marks, egs_orig.written_max_marks) as written_max_marks,
                   COALESCE(egs.reading_max_marks, egs_orig.reading_max_marks) as reading_max_marks,
                   COALESCE(egs.writing_comp_max_marks, egs_orig.writing_comp_max_marks) as writing_comp_max_marks,
                   COALESCE(egs.dictation_max_marks, egs_orig.dictation_max_marks) as dictation_max_marks,
                   COALESCE(egs.recitation_max_marks, egs_orig.recitation_max_marks) as recitation_max_marks,
                   COALESCE(egs.ia_pr_max_marks, egs_orig.ia_pr_max_marks) as ia_pr_max_marks,
                   egr.theory_marks_obtained, egr.lab_marks_obtained, egr.oral_marks_obtained,
                   egr.written_marks_obtained, egr.reading_marks_obtained, egr.writing_comp_marks_obtained,
                   egr.dictation_marks_obtained, egr.recitation_marks_obtained, egr.ia_pr_marks_obtained,
                   egr.next_class, eg.total_working_days, eg.ptm_date, s.subject_type, st.fathers_name, st.mothers_name, st.date_of_birth as dob,
                   st.admission_no, st.blood_group, u.gender, u.address, c.name as section_name
            FROM exam_group_results egr
            JOIN exam_group_subjects egs ON egs.id = egr.exam_group_subject_id
            JOIN exam_groups eg ON eg.id = egs.exam_group_id
            JOIN students st ON st.id = egr.student_id
            JOIN users u ON u.id = st.user_id
            LEFT JOIN (
                SELECT exam_group_id, subject_id, 
                       MAX(theory_max_marks) as theory_max_marks,
                       MAX(lab_max_marks) as lab_max_marks,
                       MAX(oral_max_marks) as oral_max_marks,
                       MAX(written_max_marks) as written_max_marks,
                       MAX(reading_max_marks) as reading_max_marks,
                       MAX(writing_comp_max_marks) as writing_comp_max_marks,
                       MAX(dictation_max_marks) as dictation_max_marks,
                       MAX(recitation_max_marks) as recitation_max_marks,
                       MAX(ia_pr_max_marks) as ia_pr_max_marks
                FROM exam_group_subjects
                GROUP BY exam_group_id, subject_id
            ) egs_orig ON egs_orig.exam_group_id = egs.exam_group_id AND egs_orig.subject_id = egs.subject_id
            LEFT JOIN student_academic_records sar ON sar.id = egr.student_academic_id
            LEFT JOIN grades g ON g.id = sar.grade_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
            LEFT JOIN grades eg_g ON eg_g.id = eg.grade_id
            LEFT JOIN academic_years eg_ay ON eg_ay.id = eg.academic_year_id
            LEFT JOIN subjects s ON s.id = egs.subject_id
            LEFT JOIN classes c ON c.id = sar.class_id
            WHERE st.id = ? AND eg.exam_type IN (?, ?) AND eg.academic_year_id = ?
        `, [student_id, examTypes[0], examTypes[1], academic_year_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No data found for the combined marksheet' });
        }

        const calculateGrade = (pct) => {
            const val = Number(pct) || 0;
            if (val >= 91) return 'A+';
            if (val >= 81) return 'A';
            if (val >= 71) return 'B+';
            if (val >= 61) return 'B';
            if (val >= 51) return 'C+';
            if (val >= 41) return 'C';
            if (val >= 33) return 'D';
            return 'F';
        };

        let className = rows[0].grade_name || rows[0].class_name || 'N/A';
        let rawSec = rows[0].section_name || '';
        let sectionName = rawSec;

        if (sectionName.includes('-')) {
            const parts = sectionName.split('-');
            sectionName = parts[parts.length - 1].trim();
        } else if (sectionName.toLowerCase().trim() === className.toLowerCase().trim()) {
            sectionName = '';
        }

        let classSectionDisplay = className;
        if (sectionName && sectionName.toLowerCase() !== className.toLowerCase()) {
            classSectionDisplay = `${className} - ${sectionName}`;
        }

        const student = {
            id: rows[0].student_id,
            name: rows[0].student_name,
            avatar_url: rows[0].avatar_url,
            roll_no: rows[0].roll_no || 'N/A',
            class: classSectionDisplay,
            class_name: className,
            grade_name: classSectionDisplay,
            section: sectionName,
            class_section: classSectionDisplay,
            admission_no: rows[0].admission_no || '',
            gender: rows[0].gender || '',
            blood_group: rows[0].blood_group || '',
            address: rows[0].address || '',
            academic_year_name: rows[0].academic_year_name || 'N/A',
            fathers_name: rows[0].fathers_name || '',
            mothers_name: rows[0].mothers_name || '',
            father_name: rows[0].fathers_name || '',
            mother_name: rows[0].mothers_name || '',
            dob: rows[0].dob ? new Date(rows[0].dob).toLocaleDateString('en-IN') : ''
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
                    exam1_marks: '-', exam2_marks: '-',
                    exam1_grade: '-', exam2_grade: '-',
                    exam1_max: 0, exam2_max: 0,
                    exam1_theory: '-', exam1_lab: '-', exam1_oral: '-',
                    exam1_written: '-', exam1_reading: '-', exam1_writing_comp: '-',
                    exam1_dictation: '-', exam1_recitation: '-', exam1_ia_pr: '-',
                    exam2_theory: '-', exam2_lab: '-', exam2_oral: '-',
                    exam2_written: '-', exam2_reading: '-', exam2_writing_comp: '-',
                    exam2_dictation: '-', exam2_recitation: '-', exam2_ia_pr: '-',
                    has_theory: false, has_lab: false, has_oral: false,
                    has_written: false, has_reading: false, has_writing_comp: false,
                    has_dictation: false, has_recitation: false, has_ia_pr: false,
                    total: 0, max: 0,
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
            if (checkTrue(row.has_theory) || row.theory_marks_obtained !== null) { sub.has_theory = true; if (row.theory_max_marks) sub.theory_max_marks = row.theory_max_marks; }
            if (checkTrue(row.has_lab) || row.lab_marks_obtained !== null) { sub.has_lab = true; if (row.lab_max_marks) sub.lab_max_marks = row.lab_max_marks; }
            if (checkTrue(row.has_oral) || row.oral_marks_obtained !== null) { sub.has_oral = true; if (row.oral_max_marks) sub.oral_max_marks = row.oral_max_marks; }
            if (checkTrue(row.has_written) || row.written_marks_obtained !== null) { sub.has_written = true; if (row.written_max_marks) sub.written_max_marks = row.written_max_marks; }
            if (checkTrue(row.has_reading) || row.reading_marks_obtained !== null) { sub.has_reading = true; if (row.reading_max_marks) sub.reading_max_marks = row.reading_max_marks; }
            if (checkTrue(row.has_writing_comp) || row.writing_comp_marks_obtained !== null) { sub.has_writing_comp = true; if (row.writing_comp_max_marks) sub.writing_comp_max_marks = row.writing_comp_max_marks; }
            if (checkTrue(row.has_dictation) || row.dictation_marks_obtained !== null) { sub.has_dictation = true; if (row.dictation_max_marks) sub.dictation_max_marks = row.dictation_max_marks; }
            if (checkTrue(row.has_recitation) || row.recitation_marks_obtained !== null) { sub.has_recitation = true; if (row.recitation_max_marks) sub.recitation_max_marks = row.recitation_max_marks; }
            if (checkTrue(row.has_ia_pr) || row.ia_pr_marks_obtained !== null) { sub.has_ia_pr = true; if (row.ia_pr_max_marks) sub.ia_pr_max_marks = row.ia_pr_max_marks; }

            const formatMarks = (obtained, has) => {
                if (row.attendance_status === 'Absent') return '-';
                if (obtained !== null && obtained !== undefined && obtained !== '') {
                    return `${Math.round(Number(obtained))}`;
                }
                if (checkTrue(has)) return '0';
                return '-';
            };

            if (row.exam_type === examTypes[0]) {
                sub.exam1_marks = row.attendance_status === 'Absent' ? '-' : Math.round(obtained);
                sub.exam1_grade = row.grade || '-';
                sub.exam1_max = row.max_marks || 0;
                sub.exam1_theory = formatMarks(row.theory_marks_obtained, checkTrue(row.has_theory));
                sub.exam1_lab = formatMarks(row.lab_marks_obtained, checkTrue(row.has_lab));
                sub.exam1_oral = formatMarks(row.oral_marks_obtained, checkTrue(row.has_oral));
                sub.exam1_written = formatMarks(row.written_marks_obtained, checkTrue(row.has_written));
                sub.exam1_reading = formatMarks(row.reading_marks_obtained, checkTrue(row.has_reading));
                sub.exam1_writing_comp = formatMarks(row.writing_comp_marks_obtained, checkTrue(row.has_writing_comp));
                sub.exam1_dictation = formatMarks(row.dictation_marks_obtained, checkTrue(row.has_dictation));
                sub.exam1_recitation = formatMarks(row.recitation_marks_obtained, checkTrue(row.has_recitation));
                sub.exam1_ia_pr = formatMarks(row.ia_pr_marks_obtained, checkTrue(row.has_ia_pr));
            } else if (row.exam_type === examTypes[1]) {
                sub.exam2_marks = row.attendance_status === 'Absent' ? '-' : Math.round(obtained);
                sub.exam2_grade = row.grade || '-';
                sub.exam2_max = row.max_marks || 0;
                sub.exam2_theory = formatMarks(row.theory_marks_obtained, checkTrue(row.has_theory));
                sub.exam2_lab = formatMarks(row.lab_marks_obtained, checkTrue(row.has_lab));
                sub.exam2_oral = formatMarks(row.oral_marks_obtained, checkTrue(row.has_oral));
                sub.exam2_written = formatMarks(row.written_marks_obtained, checkTrue(row.has_written));
                sub.exam2_reading = formatMarks(row.reading_marks_obtained, checkTrue(row.has_reading));
                sub.exam2_writing_comp = formatMarks(row.writing_comp_marks_obtained, checkTrue(row.has_writing_comp));
                sub.exam2_dictation = formatMarks(row.dictation_marks_obtained, checkTrue(row.has_dictation));
                sub.exam2_recitation = formatMarks(row.recitation_marks_obtained, checkTrue(row.has_recitation));
                sub.exam2_ia_pr = formatMarks(row.ia_pr_marks_obtained, checkTrue(row.has_ia_pr));
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

            // Count active flags for this subject
            const activeFlags = ['has_written', 'has_reading', 'has_writing_comp', 'has_dictation', 'has_recitation', 'has_ia_pr', 'has_oral', 'has_lab', 'has_theory'].filter(f => sub[f]);
            const activeFlagsCount = activeFlags.length;

            const components = [];
            const addComp = (name, hasFlag, mmKey, t1Val, t2Val) => {
                const flagActive = sub[hasFlag];
                const t1Has = t1Val !== null && t1Val !== undefined && t1Val !== '' && t1Val !== '-';
                const t2Has = t2Val !== null && t2Val !== undefined && t2Val !== '' && t2Val !== '-';
                if (flagActive || t1Has || t2Has) {
                    const rawMM = sub[mmKey];
                    let mmVal = (rawMM !== null && rawMM !== undefined && rawMM !== '' && Number(rawMM) > 0)
                        ? Math.round(Number(rawMM))
                        : (activeFlagsCount <= 1 && sub.max > 0 ? Math.round(sub.max) : '-');

                    components.push({
                        name,
                        mm: mmVal,
                        term1: t1Val,
                        term2: t2Val
                    });
                }
            };

            addComp('Written', 'has_written', 'written_max_marks', sub.exam1_written, sub.exam2_written);
            addComp('Reading', 'has_reading', 'reading_max_marks', sub.exam1_reading, sub.exam2_reading);
            addComp('Writing', 'has_writing_comp', 'writing_comp_max_marks', sub.exam1_writing_comp, sub.exam2_writing_comp);
            addComp('Dictation', 'has_dictation', 'dictation_max_marks', sub.exam1_dictation, sub.exam2_dictation);
            addComp('Recitation', 'has_recitation', 'recitation_max_marks', sub.exam1_recitation, sub.exam2_recitation);
            addComp('I.A./PR', 'has_ia_pr', 'ia_pr_max_marks', sub.exam1_ia_pr, sub.exam2_ia_pr);
            addComp('Oral', 'has_oral', 'oral_max_marks', sub.exam1_oral, sub.exam2_oral);
            addComp('Lab', 'has_lab', 'lab_max_marks', sub.exam1_lab, sub.exam2_lab);
            addComp('Theory', 'has_theory', 'theory_max_marks', sub.exam1_theory, sub.exam2_theory);

            return {
                serial_no: idx + 1,
                ...sub,
                components,
                compRowSpan: components.length + 1,
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
            points1: t1Points.map(p => { const [x, y] = p.split(','); return { x, y }; }),
            points2: t2Points.map(p => { const [x, y] = p.split(','); return { x, y }; }),
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
            const logoPath = require('path').join(__dirname, '../assets/Times_Internation_School_logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoData = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { }

        const showTheory = academicSubjects.some(s => s.has_theory);
        const showLab = academicSubjects.some(s => s.has_lab);
        const showOral = academicSubjects.some(s => s.has_oral);
        const showWritten = academicSubjects.some(s => s.has_written);
        const showReading = academicSubjects.some(s => s.has_reading);
        const showWritingComp = academicSubjects.some(s => s.has_writing_comp);
        const showDictation = academicSubjects.some(s => s.has_dictation);
        const showRecitation = academicSubjects.some(s => s.has_recitation);
        const showIaPr = academicSubjects.some(s => s.has_ia_pr);

        const maxTheory = academicSubjects.reduce((acc, s) => acc || (s.has_theory && s.theory_max_marks ? parseInt(s.theory_max_marks) : null), null) || '';
        const maxLab = academicSubjects.reduce((acc, s) => acc || (s.has_lab && s.lab_max_marks ? parseInt(s.lab_max_marks) : null), null) || '';
        const maxOral = academicSubjects.reduce((acc, s) => acc || (s.has_oral && s.oral_max_marks ? parseInt(s.oral_max_marks) : null), null) || '';
        const maxWritten = academicSubjects.reduce((acc, s) => acc || (s.has_written && s.written_max_marks ? parseInt(s.written_max_marks) : null), null) || '';
        const maxReading = academicSubjects.reduce((acc, s) => acc || (s.has_reading && s.reading_max_marks ? parseInt(s.reading_max_marks) : null), null) || '';
        const maxWritingComp = academicSubjects.reduce((acc, s) => acc || (s.has_writing_comp && s.writing_comp_max_marks ? parseInt(s.writing_comp_max_marks) : null), null) || '';
        const maxDictation = academicSubjects.reduce((acc, s) => acc || (s.has_dictation && s.dictation_max_marks ? parseInt(s.dictation_max_marks) : null), null) || '';
        const maxRecitation = academicSubjects.reduce((acc, s) => acc || (s.has_recitation && s.recitation_max_marks ? parseInt(s.recitation_max_marks) : null), null) || '';
        const maxIaPr = academicSubjects.reduce((acc, s) => acc || (s.has_ia_pr && s.ia_pr_max_marks ? parseInt(s.ia_pr_max_marks) : null), null) || '';

        // colSpan helpers
        const baseNewFields = [showTheory, showWritten, showReading, showWritingComp, showDictation, showRecitation, showIaPr, showOral, showLab].filter(Boolean).length;
        const exam1ColSpan = baseNewFields + 1; // +1 for term total
        const exam2ColSpan = baseNewFields + 1;

        const showFinalResult = true;
        let examColSpan = exam1ColSpan;

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

        const getNextGrade = (currentGradeName, customNextClass) => {
            if (customNextClass && String(customNextClass).trim()) return String(customNextClass).trim();
            if (!currentGradeName) return 'Next Class';
            const g = String(currentGradeName).trim().toLowerCase();
            if (g.includes('play')) return 'Nursery';
            if (g.includes('nursery')) return 'LKG';
            if (g.includes('lkg')) return 'UKG';
            if (g.includes('ukg') || g.includes('prep') || g.includes('kg')) return 'I';
            if (g.includes('class - i') || g.includes('class i') || g.includes('grade 1') || g.includes('class 1') || g === 'i' || g === '1') return 'II';
            if (g.includes('class - ii') || g.includes('class ii') || g.includes('grade 2') || g.includes('class 2') || g === 'ii' || g === '2') return 'III';
            if (g.includes('class - iii') || g.includes('class iii') || g.includes('grade 3') || g.includes('class 3') || g === 'iii' || g === '3') return 'IV';
            if (g.includes('class - iv') || g.includes('class iv') || g.includes('grade 4') || g.includes('class 4') || g === 'iv' || g === '4') return 'V';
            if (g.includes('class - v') || g.includes('class v') || g.includes('grade 5') || g.includes('class 5') || g === 'v' || g === '5') return 'VI';
            if (g.includes('class - vi') || g.includes('class vi') || g.includes('grade 6') || g.includes('class 6') || g === 'vi' || g === '6') return 'VII';
            if (g.includes('class - vii') || g.includes('class vii') || g.includes('grade 7') || g.includes('class 7') || g === 'vii' || g === '7') return 'VIII';
            if (g.includes('class - viii') || g.includes('class viii') || g.includes('grade 8') || g.includes('class 8') || g === 'viii' || g === '8') return 'IX';
            if (g.includes('class - ix') || g.includes('class ix') || g.includes('grade 9') || g.includes('class 9') || g === 'ix' || g === '9') return 'X';
            if (g.includes('class - x') || g.includes('class x') || g.includes('grade 10') || g.includes('class 10') || g === 'x' || g === '10') return 'XI';
            if (g.includes('class - xi') || g.includes('class xi') || g.includes('grade 11') || g.includes('class 11') || g === 'xi' || g === '11') return 'XII';
            return 'Next Class';
        };

        let term1End = null;
        let term2End = null;
        let term1Working = null;
        let term2Working = null;
        let term1Attended = 0;
        let term2Attended = 0;
        let teacherRemark = null;
        let principalRemark = null;

        rows.forEach(r => {
            if (r.teacher_remark) teacherRemark = r.teacher_remark;
            if (r.principal_remark) principalRemark = r.principal_remark;
            if (r.exam_type === examTypes[0]) {
                if (r.end_date) term1End = new Date(r.end_date);
                if (r.total_working_days !== null && r.total_working_days !== undefined) term1Working = r.total_working_days;
            } else if (r.exam_type === examTypes[1]) {
                if (r.end_date) term2End = new Date(r.end_date);
                if (r.total_working_days !== null && r.total_working_days !== undefined) term2Working = r.total_working_days;
            }
        });

        if (term1Working === null && rows[0].total_working_days) {
            term1Working = rows[0].total_working_days;
        }

        try {
            const [attRows] = await db.execute(`
                SELECT DISTINCT attendance_date
                FROM attendance
                WHERE student_id = ? AND status IN ('Present', 'Late', 'present', 'late')
            `, [student_id]);

            attRows.forEach(a => {
                const d = new Date(a.attendance_date);
                if (term1End) {
                    if (d <= term1End) {
                        term1Attended++;
                    } else if (!term2End || d <= term2End) {
                        term2Attended++;
                    }
                } else {
                    term1Attended++; // fallback
                }
            });
        } catch (e) { }

        const nextGrade = getNextGrade(rows[0].grade_name, rows[0].next_class);

        const attendanceStats = {
            hasTerm1: term1Working !== null,
            term1Working: term1Working || 0,
            term1Attended: term1Attended,
            term1Absent: Math.max(0, (term1Working || 0) - term1Attended),
            term1Percentage: term1Working ? Math.round((term1Attended / term1Working) * 100) : 0,
            hasTerm2: term2Working !== null,
            term2Working: term2Working || 0,
            term2Attended: term2Attended,
            term2Absent: Math.max(0, (term2Working || 0) - term2Attended),
            term2Percentage: term2Working ? Math.round((term2Attended / term2Working) * 100) : 0,
            totalWorking: (term1Working || 0) + (term2Working || 0),
            totalAttended: term1Attended + term2Attended,
            totalAbsent: Math.max(0, ((term1Working || 0) + (term2Working || 0)) - (term1Attended + term2Attended)),
            totalPercentage: ((term1Working || 0) + (term2Working || 0)) ? Math.round(((term1Attended + term2Attended) / ((term1Working || 0) + (term2Working || 0))) * 100) : 0
        };

        const physicalStats = {
            attendance: `${attendanceStats.totalAttended}/${attendanceStats.totalWorking}`,
            sports: '', behaviour: '', cleanliness: ''
        };

        let term1Ptm = '';
        let term2Ptm = '';
        rows.forEach(r => {
            if (r.exam_type === 'TERM_1' && r.ptm_date) {
                term1Ptm = new Date(r.ptm_date).toLocaleDateString('en-IN');
            } else if (r.exam_type === 'TERM_2' && r.ptm_date) {
                term2Ptm = new Date(r.ptm_date).toLocaleDateString('en-IN');
            }
        });

        const ptmStats = {
            term1Date: term1Ptm || (rows[0].ptm_date ? new Date(rows[0].ptm_date).toLocaleDateString('en-IN') : ''),
            term2Date: term2Ptm
        };

        let school = {};
        try {
            const schoolPath = require('path').join(__dirname, '../school-info.json');
            school = JSON.parse(require('fs').readFileSync(schoolPath, 'utf8'));
        } catch (e) {
            console.log('No school-info.json found');
        }

        const dynamicColumns = [];
        if (showWritten) dynamicColumns.push({ id: 'written', name: 'Written', max: maxWritten });
        if (showReading) dynamicColumns.push({ id: 'reading', name: 'Reading', max: maxReading });
        if (showWritingComp) dynamicColumns.push({ id: 'writing_comp', name: 'Writing (Comp.)', max: maxWritingComp });
        if (showDictation) dynamicColumns.push({ id: 'dictation', name: 'Dictation', max: maxDictation });
        if (showRecitation) dynamicColumns.push({ id: 'recitation', name: 'Recitation', max: maxRecitation });
        if (showIaPr) dynamicColumns.push({ id: 'ia_pr', name: 'I.A./PR', max: maxIaPr });
        if (showOral) dynamicColumns.push({ id: 'oral', name: 'Oral', max: maxOral });
        if (showLab) dynamicColumns.push({ id: 'lab', name: 'Lab', max: maxLab });
        if (showTheory) dynamicColumns.push({ id: 'theory', name: 'Theory', max: maxTheory });

        const formattedAcademicSubjects = academicSubjects.map(s => {
            const exam1_dynamicMarks = [];
            const exam2_dynamicMarks = [];
            if (showWritten) { exam1_dynamicMarks.push({ value: s.exam1_written || '-' }); exam2_dynamicMarks.push({ value: s.exam2_written || '-' }); }
            if (showReading) { exam1_dynamicMarks.push({ value: s.exam1_reading || '-' }); exam2_dynamicMarks.push({ value: s.exam2_reading || '-' }); }
            if (showWritingComp) { exam1_dynamicMarks.push({ value: s.exam1_writing_comp || '-' }); exam2_dynamicMarks.push({ value: s.exam2_writing_comp || '-' }); }
            if (showDictation) { exam1_dynamicMarks.push({ value: s.exam1_dictation || '-' }); exam2_dynamicMarks.push({ value: s.exam2_dictation || '-' }); }
            if (showRecitation) { exam1_dynamicMarks.push({ value: s.exam1_recitation || '-' }); exam2_dynamicMarks.push({ value: s.exam2_recitation || '-' }); }
            if (showIaPr) { exam1_dynamicMarks.push({ value: s.exam1_ia_pr || '-' }); exam2_dynamicMarks.push({ value: s.exam2_ia_pr || '-' }); }
            if (showOral) { exam1_dynamicMarks.push({ value: s.exam1_oral || '-' }); exam2_dynamicMarks.push({ value: s.exam2_oral || '-' }); }
            if (showLab) { exam1_dynamicMarks.push({ value: s.exam1_lab || '-' }); exam2_dynamicMarks.push({ value: s.exam2_lab || '-' }); }
            if (showTheory) { exam1_dynamicMarks.push({ value: s.exam1_theory || '-' }); exam2_dynamicMarks.push({ value: s.exam2_theory || '-' }); }

            return {
                ...s,
                exam1_dynamicMarks,
                exam2_dynamicMarks
            };
        });

        const templateData = {
            school,
            student,
            reportTitle,
            exam1Name: examNames[examTypes[0]] || examTypes[0].replace(/_/g, ' '),
            exam2Name: examNames[examTypes[1]] || examTypes[1].replace(/_/g, ' '),
            subjects: formattedAcademicSubjects,
            dynamicColumns,
            showTheory, showLab, showOral,
            showWritten, showReading, showWritingComp,
            showDictation, showRecitation, showIaPr,
            maxTheory, maxLab, maxOral,
            maxWritten, maxReading, maxWritingComp,
            maxDictation, maxRecitation, maxIaPr,
            showFinalResult,
            exam1ColSpan, exam2ColSpan, examColSpan,
            totalMax, totalObtained, percentage,
            currentDate, finalResult, promotionStatus,
            nextGrade, ptmStats,
            logoData, chartData, coScholastic, skillBased, physicalStats, attendanceStats,
            teacherRemark: teacherRemark || '',
            principalRemark: principalRemark || ''
        };

        // --- TEMPLATE SELECTION ---
        // For FINAL_TERM_COMBINED: pick template based on grade
        // Junior: grades Play, Nursery, LKG, UKG, Class 1, 2, 3 (grade names typically contain these)
        // Senior: Classes 4-9, 11
        let templatePath = 'uploads/templates/combined-marksheet.hbs';
        if (type === 'FINAL_TERM_COMBINED') {
            templatePath = 'uploads/templates/senior_final_exam.hbs';
        }

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
            SELECT st.id as student_id, u.name as student_name, u.avatar_url, sar.roll_no, st.fathers_name,
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
                SELECT st.id as student_id, u.name as student_name, u.avatar_url, sar.roll_no, 
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
    GenerateBulkMarksheetPDF,
    GenerateBulkAdmitCardPDF
};