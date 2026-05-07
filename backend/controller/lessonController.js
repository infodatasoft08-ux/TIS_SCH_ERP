const express = require('express');
const db = require('../db');



const toInt = v => (v === undefined || v === null ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTimeString = s => typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
// const isTimeString = s => typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?\s*[APap][Mm]$/.test(s);
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;


/**
 * POST /api/lessons
 * Body:
 * {
 *   class_id, subject_id, teacher_id?, title?, description?,
 *   scheduled_date (YYYY-MM-DD)?, start_time (HH:MM)?, end_time (HH:MM)?,
 *   is_recurring? (0|1), recurrence_rule? (string)
 * }
 */

const createLesson = async (req, res)=> {
    const {
        class_id, subject_id, teacher_id, title, description,
        scheduled_date, start_time, end_time, is_recurring, recurrence_rule
    } = req.body;

    if (!class_id || !subject_id) return res.status(400).json({ error: 'class_id and subject_id are required' });
    if (scheduled_date && !isDateString(scheduled_date)) return res.status(400).json({ error: 'scheduled_date must be YYYY-MM-DD' });
    if (start_time && !isTimeString(start_time)) return res.status(400).json({ error: 'start_time must be HH:MM or HH:MM:SS' });
    if (end_time && !isTimeString(end_time)) return res.status(400).json({ error: 'end_time must be HH:MM or HH:MM:SS' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // validate class
        const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ? FOR UPDATE', [class_id]);
        if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class_id not found' }); }

        // validate subject
        const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]);
        if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject_id not found' }); }

        // validate teacher if provided
        if (teacher_id) {
            const [trows] = await conn.execute('SELECT id FROM teachers WHERE id = ?', [teacher_id]);
            if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'teacher_id not found' }); }
        }

        const [ins] = await conn.execute(
            `INSERT INTO lessons
            (class_id, subject_id, teacher_id, title, description, scheduled_date, start_time, end_time, is_recurring, recurrence_rule, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                class_id,
                subject_id,
                teacher_id || null,
                title ? title.trim() : null,
                description || null,
                scheduled_date || null,
                start_time || null,
                end_time || null,
                (is_recurring ? 1 : 0),
                recurrence_rule || null
            ]
        );

        await conn.commit();
        conn.release();

        const [rows] = await db.execute(
            `SELECT l.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id, u.name As teacher_name
            FROM lessons l
            LEFT JOIN classes c ON c.id = l.class_id
            LEFT JOIN subjects s ON s.id = l.subject_id
            LEFT JOIN teachers t ON t.id = l.teacher_id
            LEFT JOIN users u ON u.id = t.user_id
            WHERE l.id = ?`,
            [ins.insertId]
        );

        return res.status(201).json({ lesson: rows[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/lessons error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/lessons
 * Query filters:
 *   class_id, teacher_id, subject_id,
 *   date (YYYY-MM-DD) OR from & to,
 *   is_recurring (0|1),
 *   q (search title/description),
 *   limit, offset
 */

const GetLessons = async (req, res) => {
    try {
        const classId = req.query.class_id ? Number(req.query.class_id) : null;
        const teacherId = req.query.teacher_id ? Number(req.query.teacher_id) : null;
        const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;
        const date = req.query.date || null;
        const from = req.query.from || null;
        const to = req.query.to || null;
        const is_recurring = req.query.is_recurring !== undefined ? (req.query.is_recurring === '1' || req.query.is_recurring === 'true') : null;
        const q = req.query.q ? `%${req.query.q}%` : '%';

        let limit = parseInt(req.query.limit || '100', 10);
        let offset = parseInt(req.query.offset || '0', 10);
        if (!Number.isFinite(limit) || limit < 1) limit = 100;
        if (!Number.isFinite(offset) || offset < 0) offset = 0;
        limit = Math.min(limit, 2000);

        const where = [];
        const params = [];

        if (classId) { where.push('l.class_id = ?'); params.push(classId); }
        if (teacherId) { where.push('l.teacher_id = ?'); params.push(teacherId); }
        if (subjectId) { where.push('l.subject_id = ?'); params.push(subjectId); }

        if (date) {
            if (!isDateString(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
            where.push('DATE(l.scheduled_date) = ?'); params.push(date);
        } else if (from || to) {
            if (from && !isDateString(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
            if (to && !isDateString(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
            if (from && to) { where.push('DATE(l.scheduled_date) BETWEEN ? AND ?'); params.push(from, to); }
            else if (from) { where.push('DATE(l.scheduled_date) >= ?'); params.push(from); }
            else if (to) { where.push('DATE(l.scheduled_date) <= ?'); params.push(to); }
        }

        if (is_recurring !== null) { where.push('l.is_recurring = ?'); params.push(is_recurring ? 1 : 0); }

        where.push('(l.title LIKE ? OR l.description LIKE ?)'); params.push(q, q);

        let baseSql = `
        FROM lessons l
        LEFT JOIN classes c ON c.id = l.class_id
        LEFT JOIN subjects s ON s.id = l.subject_id
        LEFT JOIN teachers t ON t.id = l.teacher_id
        LEFT JOIN users u ON u.id = t.user_id
        `;
        if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

        // total
        const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
        const [countRows] = await db.execute(countSql, params);
        const total = (Array.isArray(countRows) && countRows[0]) ? Number(countRows[0].total || 0) : 0;

        const dataSql = `
        SELECT l.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id, u.name As teacher_name
        ${baseSql}
        ORDER BY l.scheduled_date DESC, l.start_time, l.id DESC
        LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await db.execute(dataSql, params);

        return res.json({ total, limit, offset, lessons: rows });
    } catch (err) {
        console.error('GET /api/lessons error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/lessons/:id
 */

const GetLessonById = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid lesson id' });

    try {
        const [rows] = await db.execute(
            `SELECT l.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id, u.name AS teacher_name
            FROM lessons l
            LEFT JOIN classes c ON c.id = l.class_id
            LEFT JOIN subjects s ON s.id = l.subject_id
            LEFT JOIN teachers t ON t.id = l.teacher_id
            LEFT JOIN users u ON u.id = t.user_id
            WHERE l.id = ?`,
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
        return res.json({ lesson: rows[0] });
    } catch (err) {
        console.error('GET /api/lessons/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * PUT /api/lessons/:id
 * Body can include: class_id?, subject_id?, teacher_id?, title?, description?, scheduled_date?, start_time?, end_time?, is_recurring?, recurrence_rule?
 */

const UpdateLesson = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid lesson id' });

    const {
        class_id, subject_id, teacher_id, title, description,
        scheduled_date, start_time, end_time, is_recurring, recurrence_rule
    } = req.body;

    if (
        class_id === undefined && subject_id === undefined && teacher_id === undefined &&
        title === undefined && description === undefined && scheduled_date === undefined &&
        start_time === undefined && end_time === undefined && is_recurring === undefined && recurrence_rule === undefined
    ) {
        return res.status(400).json({ error: 'At least one field is required to update' });
    }

    if (scheduled_date !== undefined && scheduled_date !== null && !isDateString(scheduled_date)) return res.status(400).json({ error: 'scheduled_date must be YYYY-MM-DD' });
    if (start_time !== undefined && start_time !== null && !isTimeString(start_time)) return res.status(400).json({ error: 'start_time must be HH:MM or HH:MM:SS' });
    if (end_time !== undefined && end_time !== null && !isTimeString(end_time)) return res.status(400).json({ error: 'end_time must be HH:MM or HH:MM:SS' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [erows] = await conn.execute('SELECT * FROM lessons WHERE id = ? FOR UPDATE', [id]);
        if (erows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Lesson not found' }); }

        // validate references if provided
        if (class_id !== undefined && class_id !== null) {
            const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
            if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class_id not found' }); }
        }
        if (subject_id !== undefined && subject_id !== null) {
            const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]);
            if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject_id not found' }); }
        }
        if (teacher_id !== undefined && teacher_id !== null) {
            const [trows] = await conn.execute('SELECT id FROM teachers WHERE id = ?', [teacher_id]);
            if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'teacher_id not found' }); }
        }

        const updates = []; const params = [];
        if (class_id !== undefined) { updates.push('class_id = ?'); params.push(class_id || null); }
        if (subject_id !== undefined) { updates.push('subject_id = ?'); params.push(subject_id || null); }
        if (teacher_id !== undefined) { updates.push('teacher_id = ?'); params.push(teacher_id || null); }
        if (title !== undefined) { updates.push('title = ?'); params.push(isNonEmptyString(title) ? title.trim() : null); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
        if (scheduled_date !== undefined) { updates.push('scheduled_date = ?'); params.push(scheduled_date || null); }
        if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time || null); }
        if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time || null); }
        if (is_recurring !== undefined) { updates.push('is_recurring = ?'); params.push(is_recurring ? 1 : 0); }
        if (recurrence_rule !== undefined) { updates.push('recurrence_rule = ?'); params.push(recurrence_rule || null); }

        params.push(id);
        await conn.execute(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`, params);

        await conn.commit();
        conn.release();

        const [updated] = await db.execute(
            `SELECT l.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id
            FROM lessons l
            LEFT JOIN classes c ON c.id = l.class_id
            LEFT JOIN subjects s ON s.id = l.subject_id
            LEFT JOIN teachers t ON t.id = l.teacher_id
            WHERE l.id = ?`,
            [id]
        );

        return res.json({ lesson: updated[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/lessons/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * DELETE /api/lessons/:id
 */

const DeleteLessons = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid lesson id' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [erows] = await conn.execute('SELECT id FROM lessons WHERE id = ? FOR UPDATE', [id]);
        if (erows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Lesson not found' }); }

        // optionally delete related exams/assignments if you want; here we just delete lesson
        await conn.execute('DELETE FROM lessons WHERE id = ?', [id]);

        await conn.commit();
        conn.release();
        return res.json({ success: true, deleted_lesson_id: id });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('DELETE /api/lessons/:id error', err);
        if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
            return res.status(409).json({ error: 'Lesson cannot be deleted because referenced by other records' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/lessons/teacher/:teacher_id
 * list lessons for a teacher (helpful)
 */

const GetLessonByTeacher = async (req, res) => {
    const teacherId = toInt(req.params.teacher_id);
    if (!teacherId) return res.status(400).json({ error: 'Invalid teacher id' });

    try {
        const [rows] = await db.execute(
            `SELECT l.*, c.name AS class_name, s.name AS subject_name
            FROM lessons l
            LEFT JOIN classes c ON c.id = l.class_id
            LEFT JOIN subjects s ON s.id = l.subject_id
            WHERE l.teacher_id = ?
            ORDER BY l.scheduled_date DESC, l.start_time`,
            [teacherId]
        );
        return res.json({ lessons: rows });
    } catch (err) {
        console.error('GET /api/lessons/teacher/:teacher_id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/lessons/class/:class_id
 * list lessons for a class
 */

const GetLessonByClass = async (req, res) => {
    const classId = toInt(req.params.class_id);
    if (!classId) return res.status(400).json({ error: 'Invalid class id' });

    try {
        const [rows] = await db.execute(
            `SELECT l.*, s.name AS subject_name, t.user_id AS teacher_user_id
            FROM lessons l
            LEFT JOIN subjects s ON s.id = l.subject_id
            LEFT JOIN teachers t ON t.id = l.teacher_id
            WHERE l.class_id = ?
            ORDER BY l.scheduled_date DESC, l.start_time`,
            [classId]
        );
        return res.json({ lessons: rows });
    } catch (err) {
        console.error('GET /api/lessons/class/:class_id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


module.exports = {
  createLesson,
  GetLessons,
  GetLessonById,
  UpdateLesson,
  DeleteLessons,
  GetLessonByTeacher,
  GetLessonByClass
};