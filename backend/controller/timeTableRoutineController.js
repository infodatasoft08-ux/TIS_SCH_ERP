const pool = require('../db');
const { isWithinSchoolHours } = require('../helper/timeToMinutClassRoutine');

const toInt = v => (v === undefined || v === null ? null : Number(v));
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
// const isTimeString = s => typeof s === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(s);
// const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN']; // use these for day_of_week enum

// Convert ISO datetime (2026-01-14T15:30:00.000Z) to MySQL format (2026-01-14 15:30:00)
const formatDateTime = (dateTime) => {
  if (!dateTime) return null;
    
    // If it's already a string in the correct format, return it
    if (typeof dateTime === 'string' && dateTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return dateTime;
    }
    
    // If it's a Date object or ISO string, format it
    const date = new Date(dateTime);
    
    // Get local time components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const isDateTimeString = s => {
  if (typeof s !== 'string') return false;
  
  // Accept multiple formats:
  // 1. Full datetime: '2026-01-16 23:53:00'
  // 2. ISO datetime: '2026-01-16T23:53:00'
  // 3. Just time: '23:53:00' (will need to add date)
  const datetimeRegex = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;
  const timeOnlyRegex = /^\d{2}:\d{2}(:\d{2})?$/;
  
  return datetimeRegex.test(s) || timeOnlyRegex.test(s);
};


/**
 * POST /api/routines
 * Create a class routine (single slot)
 * Body:
 * {
 *   class_id, subject_id, teacher_id?, day_of_week ('MON'|'TUE'...), start_time ('HH:MM' or 'HH:MM:SS'), end_time, room?, is_active?, created_by?
 * }
 */

const addRoutine = async(req, res)  => {
  const { class_id, subject_id, teacher_id = null, day_of_week, start_time, end_time, room = null, period = null, is_active = true, created_by = null } = req.body;

  if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'class_id, subject_id, day_of_week, start_time and end_time are required' });
  }
  if (!DAYS.includes(day_of_week)) return res.status(400).json({ error: `day_of_week must be one of ${DAYS.join(',')}` });
  if (!isDateTimeString(start_time) || !isDateTimeString(end_time)) return res.status(400).json({ error: 'start_time/end_time must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' });

  // Helper function to extract time from datetime
  const extractTime = (datetimeStr) => {
    if (!datetimeStr) return '00:00:00';
    
    // If it's already in TIME format (HH:MM:SS or HH:MM)
    if (datetimeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      // Ensure HH:MM:SS format
      if (datetimeStr.length === 5) {
        return `${datetimeStr}:00`;
      }
      return datetimeStr;
    }
    
    // If it's in datetime format (YYYY-MM-DD HH:MM:SS)
    if (datetimeStr.includes(' ')) {
      const timePart = datetimeStr.split(' ')[1];
      return timePart.length === 5 ? `${timePart}:00` : timePart;
    }
    
    // If it's in ISO format (YYYY-MM-DDTHH:MM:SS)
    if (datetimeStr.includes('T')) {
      const timePart = datetimeStr.split('T')[1].split('.')[0];
      return timePart.length === 5 ? `${timePart}:00` : timePart;
    }
    
    return '00:00:00';
  };

  const timeStartTime = extractTime(start_time);
  const timeEndTime = extractTime(end_time);

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  if (!timeRegex.test(timeStartTime) || !timeRegex.test(timeEndTime)) {
    return res.status(400).json({ 
      error: 'start_time and end_time must be in HH:MM:SS format' 
    });
  }

  // Validate end time is after start time
  const timeToMinutes = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 60 + minutes + (seconds / 60);
  };
  
  const startMinutes = timeToMinutes(timeStartTime);
  const endMinutes = timeToMinutes(timeEndTime);
  if (endMinutes <= startMinutes) {
    return res.status(400).json({ 
      error: 'end_time must be after start_time' 
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // validate class
    const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ? FOR UPDATE', [class_id]);
    if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class not found' }); }

    // validate subject
    const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ? FOR UPDATE', [subject_id]);
    if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject not found' }); }

    // validate teacher if provided
    if (teacher_id) {
      const [trows] = await conn.execute(
        "SELECT id FROM teachers WHERE id = ? FOR UPDATE",
        [teacher_id]
      );
      if (trows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: "teacher not found" });
      }
    }

    if (teacher_id) {
      // const [conflict] = await conn.execute(
      //   `SELECT id FROM class_routines
      //           WHERE teacher_id = ? AND day_of_week = ?
      //           AND NOT (end_time <= ? OR start_time >= ?)`,
      //   [teacher_id, day_of_week, start_time, end_time]
      // );

      const [conflict] = await conn.execute(
        `SELECT id FROM class_routines
                WHERE teacher_id = ? AND day_of_week = ?
                AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
        [teacher_id, day_of_week, timeStartTime, timeEndTime]
      );

      if (conflict.length) {
        await conn.rollback();
        conn.release();
        return res.status(409).json({
          error: "Teacher is already assigned at this time"
        });
      }
    }

    if (start_time && end_time) {
      if (!isWithinSchoolHours(start_time, end_time)) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: "Routine time must be within school hours (08:00–16:00)"
        });
      }
    }

    // Optional: check overlapping slots for the same class & day (prevent overlapping times)
    // const [overlap] = await conn.execute(
    //   `SELECT id FROM class_routines
    //    WHERE class_id = ? AND day_of_week = ?
    //      AND NOT (end_time <= ? OR start_time >= ?)
    //      LIMIT 1`,
    //   [class_id, day_of_week, start_time, end_time]
    // );
    const [overlap] = await conn.execute(
      `SELECT id FROM class_routines
       WHERE class_id = ? AND day_of_week = ?
         AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)
         LIMIT 1`,
      [class_id, day_of_week, timeStartTime, timeEndTime]
    );
    if (overlap.length > 0) {
      // overlap exists
      await conn.rollback();
      conn.release();
      return res.status(409).json({ error: 'Time slot overlaps with existing routine for this class/day' });
    }

    // insert
    const [ins] = await conn.execute(
      `INSERT INTO class_routines
        (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, period, is_active, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room || null, period || null, is_active ? 1 : 0, created_by || null]
    );

    await conn.commit();
    conn.release();

    const [rows] = await pool.execute(
      `SELECT cr.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id
       FROM class_routines cr
       LEFT JOIN classes c ON c.id = cr.class_id
       LEFT JOIN subjects s ON s.id = cr.subject_id
       LEFT JOIN teachers t ON t.id = cr.teacher_id
       WHERE cr.id = ?`,
      [ins.insertId]
    );

    return res.status(201).json({ routine: rows[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/routines error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/routines
 * List routines with filters: ?class_id&teacher_id&subject_id&day_of_week&limit&offset
 */

const GetRoutine = async(req, res) => {
    try {
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const teacherId = req.query.teacher_id ? Number(req.query.teacher_id) : null;
    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;
    const day = req.query.day_of_week ? String(req.query.day_of_week).toUpperCase() : null;
    let limit = Math.min(Math.max(parseInt(req.query.limit || '200', 10), 1), 2000);
    let offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const where = []; const params = [];
    if (classId) { where.push('cr.class_id = ?'); params.push(classId); }
    if (teacherId) { where.push('cr.teacher_id = ?'); params.push(teacherId); }
    if (subjectId) { where.push('cr.subject_id = ?'); params.push(subjectId); }
    if (day) {
      if (!DAYS.includes(day)) return res.status(400).json({ error: `day_of_week must be one of ${DAYS.join(',')}` });
      where.push('cr.day_of_week = ?'); params.push(day);
    }

    let baseSql = `
      FROM class_routines cr
      LEFT JOIN classes c ON c.id = cr.class_id
      LEFT JOIN subjects s ON s.id = cr.subject_id
      LEFT JOIN teachers t ON t.id = cr.teacher_id
      LEFT JOIN users u ON u.id = cr.teacher_id
    `;
    if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
    const [cnt] = await pool.execute(countSql, params);
    const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

    const dataSql = `
      SELECT cr.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id, u.name AS teacher_name
      ${baseSql}
      ORDER BY FIELD(cr.day_of_week, 'MON','TUE','WED','THU','FRI','SAT','SUN'), cr.start_time
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.execute(dataSql, params);

    // Format datetime values
    const formattedRows = rows.map(r => ({
      ...r,
      start_time: formatDateTime(r.start_time),
      end_time: formatDateTime(r.end_time)
    }));

    return res.json({ total, limit, offset, routines: formattedRows });
  } catch (err) {
    console.error('GET /api/routines error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/routines/:id
 */
const GetRoutineById = async(req, res) => {
    const id = toInt(req.params.routineid);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [rows] = await pool.execute(
        `SELECT cr.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id
        FROM class_routines cr
        LEFT JOIN classes c ON c.id = cr.class_id
        LEFT JOIN subjects s ON s.id = cr.subject_id
        LEFT JOIN teachers t ON t.id = cr.teacher_id
        WHERE cr.id = ?`,
        [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Routine not found' });
        const routine = rows[0];
        routine.start_time = formatDateTime(routine.start_time);
        routine.end_time = formatDateTime(routine.end_time);
        return res.json({ routine });
    } catch (err) {
        console.error('GET /api/routines/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * PUT /api/routines/:id
 * Update a routine slot
 * Body can contain any of: class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, is_active
 */

const updateRoutine = async(req, res) => {
    const id = toInt(req.params.routineid);
    const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, period, is_active } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    if (day_of_week && !DAYS.includes(day_of_week)) return res.status(400).json({ error: `day_of_week must be one of ${DAYS.join(',')}` });
    if ((start_time && !isDateTimeString(start_time)) || (end_time && !isDateTimeString(end_time))) return res.status(400).json({ error: 'start_time/end_time must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' });

    // Helper function to extract time from datetime
    const extractTime = (datetimeStr) => {
      if (!datetimeStr) return '00:00:00';
      
      // If it's already in TIME format (HH:MM:SS or HH:MM)
      if (datetimeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        // Ensure HH:MM:SS format
        if (datetimeStr.length === 5) {
          return `${datetimeStr}:00`;
        }
        return datetimeStr;
      }
      
      // If it's in datetime format (YYYY-MM-DD HH:MM:SS)
      if (datetimeStr.includes(' ')) {
        const timePart = datetimeStr.split(' ')[1];
        return timePart.length === 5 ? `${timePart}:00` : timePart;
      }
      
      // If it's in ISO format (YYYY-MM-DDTHH:MM:SS)
      if (datetimeStr.includes('T')) {
        const timePart = datetimeStr.split('T')[1].split('.')[0];
        return timePart.length === 5 ? `${timePart}:00` : timePart;
      }
      
      return '00:00:00';
    };

    const timeStartTime = extractTime(start_time);
    const timeEndTime = extractTime(end_time);

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(timeStartTime) || !timeRegex.test(timeEndTime)) {
      return res.status(400).json({ 
        error: 'start_time and end_time must be in HH:MM:SS format' 
      });
    }

    // Validate end time is after start time
    const timeToMinutes = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 60 + minutes + (seconds / 60);
    };
    
    const startMinutes = timeToMinutes(timeStartTime);
    const endMinutes = timeToMinutes(timeEndTime);
    if (endMinutes <= startMinutes) {
      return res.status(400).json({ 
        error: 'end_time must be after start_time' 
      });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.execute('SELECT * FROM class_routines WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Routine not found' }); }
        const current = rows[0];

        // Validate new refs if provided
        if (class_id) {
            const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ? FOR UPDATE', [class_id]);
            if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'class not found' }); }
        }
        if (subject_id) {
            const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ? FOR UPDATE', [subject_id]);
            if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject not found' }); }
        }
        if (teacher_id) {
            const [trows] = await conn.execute('SELECT id FROM teachers WHERE id = ? FOR UPDATE', [teacher_id]);
            if (trows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'teacher not found' }); }
        }

        if (teacher_id) {
            // const [conflict] = await conn.execute(
            //     `SELECT id FROM class_routines
            //     WHERE teacher_id = ? AND day_of_week = ? AND id <> ?
            //     AND NOT (end_time <= ? OR start_time >= ?)`,
            //     [teacher_id, day_of_week, id || 0, start_time, end_time]
            // );
            const [conflict] = await conn.execute(
                `SELECT id FROM class_routines
                WHERE teacher_id = ? AND day_of_week = ? AND id <> ?
                AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
                [teacher_id, day_of_week, id || 0, timeStartTime, timeEndTime]
            );

            if (conflict.length) {
                await conn.rollback(); 
                conn.release();
                return res.status(409).json({
                error: "Teacher is already assigned at this time"
                });
            }
        }

        if (start_time && end_time) {
            if (!isWithinSchoolHours(start_time, end_time)) {
                await conn.rollback();
                conn.release();
                return res.status(400).json({
                error: "Routine time must be within school hours (08:00–16:00)"
                });
            }
        }

        // Determine final values for overlap check
        const finalClassId = class_id || current.class_id;
        const finalDay = day_of_week || current.day_of_week;
        // const finalStart = start_time || current.start_time;
        // const finalEnd = end_time || current.end_time;
        const finalStart = extractTime(start_time) || extractTime(current.start_time);
        const finalEnd = extractTime(end_time) || extractTime(current.end_time);

        // check overlap (exclude self)
        // const [overlap] = await conn.execute(
        //     `SELECT id FROM class_routines
        //     WHERE class_id = ? AND day_of_week = ? AND id <> ?
        //         AND NOT (end_time <= ? OR start_time >= ?)
        //     LIMIT 1`,
        //     [finalClassId, finalDay, id, finalStart, finalEnd]
        // );
        const [overlap] = await conn.execute(
            `SELECT id FROM class_routines
            WHERE class_id = ? AND day_of_week = ? AND id <> ?
                AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)
            LIMIT 1`,
            [finalClassId, finalDay, id, finalStart, finalEnd]
        );
        if (overlap.length > 0) {
            await conn.rollback();
            conn.release();
            return res.status(409).json({ error: 'Updated time overlaps with existing routine for this class/day' });
        }

        // build update
        const updates = []; const params = [];
        if (class_id !== undefined) { updates.push('class_id = ?'); params.push(class_id); }
        if (subject_id !== undefined) { updates.push('subject_id = ?'); params.push(subject_id); }
        if (teacher_id !== undefined) { updates.push('teacher_id = ?'); params.push(teacher_id); }
        if (day_of_week !== undefined) { updates.push('day_of_week = ?'); params.push(day_of_week); }
        if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time); }
        if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time); }
        if (room !== undefined) { updates.push('room = ?'); params.push(room || null); }
        if (period !== undefined) { updates.push('period = ?'); params.push(period || null); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

        if (updates.length) {
            params.push(id);
            await conn.execute(`UPDATE class_routines SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        await conn.commit();
        conn.release();

        const [newRows] = await pool.execute(
            `SELECT cr.*, c.name AS class_name, s.name AS subject_name, t.user_id AS teacher_user_id
            FROM class_routines cr
            LEFT JOIN classes c ON c.id = cr.class_id
            LEFT JOIN subjects s ON s.id = cr.subject_id
            LEFT JOIN teachers t ON t.id = cr.teacher_id
            WHERE cr.id = ?`,
            [id]
        );
        return res.json({ routine: newRows[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/routines/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * DELETE /api/routines/:id
 */

const deleteRoutine = async(req, res) => {
    const id = toInt(req.params.routineid);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [result] = await pool.execute('DELETE FROM class_routines WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Routine not found' });
        return res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error('DELETE /api/routines/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * POST /api/classes/:class_id/routines/replace
 * Replace whole timetable for a class (transactional).
 * Body: { routines: [ { subject_id, teacher_id?, day_of_week, start_time, end_time, room? , is_active? } ] }
 *
 * This deletes existing routines for the class and inserts the provided set.
 */

const replaceTimeTable = async(req, res) => {
    const classId = toInt(req.params.class_id);
    const routines = Array.isArray(req.body.routines) ? req.body.routines : null;
    const created_by = req.body.created_by || null;

    if (!classId) return res.status(400).json({ error: 'Invalid class id' });
    if (!routines) return res.status(400).json({ error: 'routines array required' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // validate class exists
        const [crows] = await conn.execute('SELECT id FROM classes WHERE id = ? FOR UPDATE', [classId]);
        if (crows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Class not found' }); }

        // delete existing
        await conn.execute('DELETE FROM class_routines WHERE class_id = ?', [classId]);

        // validate and insert each
        for (const r of routines) {
            const { subject_id, teacher_id = null, day_of_week, start_time, end_time, room = null, period = null, is_active = true } = r;
            if (!subject_id || !day_of_week || !start_time || !end_time) {
                await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Each routine requires subject_id, day_of_week, start_time, end_time' });
            }
            if (!DAYS.includes(day_of_week)) { await conn.rollback(); conn.release(); return res.status(400).json({ error: `Invalid day_of_week: ${day_of_week}` }); }
            if (!isDateTimeString(start_time) || !isDateTimeString(end_time)) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'start_time/end_time must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' }); }

            // validate subject
            const [srows] = await conn.execute('SELECT id FROM subjects WHERE id = ?', [subject_id]);
            if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'subject not found' }); }

            // optional teacher validation
            if (teacher_id) {
              const [trows] = await conn.execute(
                "SELECT id FROM teachers WHERE id = ?",
                [teacher_id]
              );
              if (trows.length === 0) {
                await conn.rollback();
                conn.release();
                return res.status(400).json({ error: "teacher not found" });
              }
            }

            if (teacher_id) {
              const [conflict] = await conn.execute(
                `SELECT id FROM class_routines
                WHERE teacher_id = ? AND day_of_week = ? AND id <> ?
                AND NOT (end_time <= ? OR start_time >= ?)`,
                [teacher_id, day_of_week, id || 0, start_time, end_time]
              );

              if (conflict.length) {
                await conn.rollback();
                conn.release();
                return res.status(409).json({
                  error: "Teacher is already assigned at this time"
                });
              }
            }

            if (start_time && end_time) {
                if (!isWithinSchoolHours(start_time, end_time)) {
                    await conn.rollback();
                    conn.release();
                    return res.status(400).json({
                    error: "Routine time must be within school hours (08:00–16:00)"
                    });
                }
            }

            await conn.execute(
                `INSERT INTO class_routines (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, period, is_active, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [classId, subject_id, teacher_id, day_of_week, start_time, end_time, room || null, period || null, is_active ? 1 : 0, created_by || null]
            );
        }

        await conn.commit();
        conn.release();

        // return updated timetable
        const [rows] = await pool.execute(
            `SELECT cr.*, s.name AS subject_name, t.user_id AS teacher_user_id
            FROM class_routines cr
            LEFT JOIN subjects s ON s.id = cr.subject_id
            LEFT JOIN teachers t ON t.id = cr.teacher_id
            WHERE cr.class_id = ?
            ORDER BY FIELD(cr.day_of_week, 'MON','TUE','WED','THU','FRI','SAT','SUN'), cr.start_time`,
            [classId]
        );

        return res.status(201).json({ class_id: classId, routines: rows });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/classes/:class_id/routines/replace error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/classes/:class_id/routines
 * Returns timetable for the class optionally filtered by day_of_week
 * Query: ?day_of_week=MON
 */

const getTimeTableForClass = async(req, res) => {
    const classId = toInt(req.params.class_id);
    if (!classId) return res.status(400).json({ error: 'Invalid class id' });

    const day = req.query.day_of_week ? String(req.query.day_of_week).toUpperCase() : null;
    if (day && !DAYS.includes(day)) return res.status(400).json({ error: `day_of_week must be one of ${DAYS.join(',')}` });

    try {
        const params = [classId];
        let where = 'cr.class_id = ?';
        if (day) { where += ' AND cr.day_of_week = ?'; params.push(day); }

        const [rows] = await pool.execute(
            `SELECT cr.*, s.name AS subject_name, t.user_id AS teacher_user_id, u.name AS teacher_name
            FROM class_routines cr
            LEFT JOIN subjects s ON s.id = cr.subject_id
            LEFT JOIN teachers t ON t.id = cr.teacher_id
            LEFT JOIN users u ON u.id = cr.teacher_id
            WHERE ${where}
            ORDER BY FIELD(cr.day_of_week, 'MON','TUE','WED','THU','FRI','SAT','SUN'), cr.start_time`,
            params
        );

        // Get breaks/lunch
        const breakParams = [classId];
        let breakWhere = 'cb.class_id = ?';
        if (day) { 
            breakWhere += ' AND cb.day_of_week = ?'; 
            breakParams.push(day); 
        }

        const [breaks] = await pool.execute(
            `SELECT 
                cb.*,
                cb.break_type AS subject_name,
                NULL AS teacher_user_id,
                NULL AS teacher_name,
                'BREAK' AS type
            FROM class_breaks cb
            WHERE ${breakWhere}`,
            breakParams
        );

        // Format datetime values from ISO to MySQL format (YYYY-MM-DD HH:MM:SS)
        // const formattedRows = rows.map(r => ({
        //     ...r,
        //     start_time: formatDateTime(r.start_time),
        //     end_time: formatDateTime(r.end_time)
        // }));

        // Combine and sort
        const allEntries = [...rows, ...breaks].map(entry => ({
            ...entry,
            start_time: formatDateTime(entry.start_time),
            end_time: formatDateTime(entry.end_time)
        }));

        // Sort by day and time
        allEntries.sort((a, b) => {
            const dayOrder = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
            const dayCompare = dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
            if (dayCompare !== 0) return dayCompare;
            return new Date(a.start_time) - new Date(b.start_time);
        });

        // group by day for convenience
        const grouped = {};
        for (const r of allEntries) {
            if (!grouped[r.day_of_week]) grouped[r.day_of_week] = [];
            grouped[r.day_of_week].push(r);
        }

      return res.json({ class_id: classId, day: day || null, routines: allEntries, grouped });
    } catch (err) {
        console.error('GET /api/classes/:class_id/routines error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/teachers/:teacher_id/routines
 * Timetable for a teacher
 */

const getTimeTableForTeacher = async(req, res) => {
    const teacherId = toInt(req.params.teacher_id);
    if (!teacherId) return res.status(400).json({ error: 'Invalid teacher id' });

    try {
        const [rows] = await pool.execute(
            `SELECT cr.*, c.name AS class_name, s.name AS subject_name
            FROM class_routines cr
            LEFT JOIN classes c ON c.id = cr.class_id
            LEFT JOIN subjects s ON s.id = cr.subject_id
            WHERE cr.teacher_id = ?
            ORDER BY FIELD(cr.day_of_week, 'MON','TUE','WED','THU','FRI','SAT','SUN'), cr.start_time`,
            [teacherId]
        );
        
        // Format datetime values
        const formattedRows = rows.map(r => ({
            ...r,
            start_time: formatDateTime(r.start_time),
            end_time: formatDateTime(r.end_time)
        }));
        
        return res.json({ teacher_id: teacherId, routines: formattedRows });
    } catch (err) {
        console.error('GET /api/teachers/:teacher_id/routines error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/students/:student_id/routines
 * Returns the timetable for a student by resolving their class
 */

const getTimeTableWithSubjectClass = async(req, res) => {
    const studentId = toInt(req.params.student_id);
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    try {
        const [srows] = await pool.execute('SELECT class_id FROM students WHERE id = ?', [studentId]);
        if (srows.length === 0) return res.status(404).json({ error: 'Student not found' });
        const classId = srows[0].class_id;
        if (!classId) return res.status(400).json({ error: 'Student has no class assigned' });

        const [rows] = await pool.execute(
            `SELECT cr.*, s.name AS subject_name, t.user_id AS teacher_user_id, u.name AS teacher_name
            FROM class_routines cr
            LEFT JOIN subjects s ON s.id = cr.subject_id
            LEFT JOIN teachers t ON t.id = cr.teacher_id
            LEFT JOIN users u ON u.id = cr.teacher_id
            WHERE cr.class_id = ?
            ORDER BY FIELD(cr.day_of_week, 'MON','TUE','WED','THU','FRI','SAT','SUN'), cr.start_time`,
            [classId]
        );

        const grouped = {};
        
        // Format datetime values
        const formattedRows = rows.map(r => ({
            ...r,
            start_time: formatDateTime(r.start_time),
            end_time: formatDateTime(r.end_time)
        }));
        
        for (const r of formattedRows) {
            if (!grouped[r.day_of_week]) grouped[r.day_of_week] = [];
            grouped[r.day_of_week].push(r);
        }

        return res.json({ student_id: studentId, class_id: classId, routines: formattedRows, grouped });
    } catch (err) {
        console.error('GET /api/students/:student_id/routines error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


const addClassBreak = async (req, res) => {
  const { class_id, day_of_week, break_type, start_time, end_time } = req.body;

  // Validation
  if (!class_id || !day_of_week || !break_type || !start_time || !end_time) {
    return res.status(400).json({ 
      error: 'class_id, day_of_week, break_type, start_time and end_time are required' 
    });
  }

  // Validate day
  if (!DAYS.includes(day_of_week.toUpperCase())) {
    return res.status(400).json({ 
      error: `day_of_week must be one of ${DAYS.join(', ')}` 
    });
  }

  // Validate break type
  const validBreakTypes = ['LUNCH', 'SHORT_BREAK', 'LONG_BREAK'];
  if (!validBreakTypes.includes(break_type.toUpperCase())) {
    return res.status(400).json({ 
      error: `break_type must be one of ${validBreakTypes.join(', ')}` 
    });
  }

  if (!isDateTimeString(start_time) || !isDateTimeString(end_time)) return res.status(400).json({ error: 'start_time/end_time must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' });


  // Helper function to extract time from datetime
  const extractTime = (datetimeStr) => {
    if (!datetimeStr) return '00:00:00';
    
    // If it's already in TIME format (HH:MM:SS or HH:MM)
    if (datetimeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      // Ensure HH:MM:SS format
      if (datetimeStr.length === 5) {
        return `${datetimeStr}:00`;
      }
      return datetimeStr;
    }
    
    // If it's in datetime format (YYYY-MM-DD HH:MM:SS)
    if (datetimeStr.includes(' ')) {
      const timePart = datetimeStr.split(' ')[1];
      return timePart.length === 5 ? `${timePart}:00` : timePart;
    }
    
    // If it's in ISO format (YYYY-MM-DDTHH:MM:SS)
    if (datetimeStr.includes('T')) {
      const timePart = datetimeStr.split('T')[1].split('.')[0];
      return timePart.length === 5 ? `${timePart}:00` : timePart;
    }
    
    return '00:00:00';
  };

  const timeStartTime = extractTime(start_time);
  const timeEndTime = extractTime(end_time);

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  if (!timeRegex.test(timeStartTime) || !timeRegex.test(timeEndTime)) {
    return res.status(400).json({ 
      error: 'start_time and end_time must be in HH:MM:SS format' 
    });
  }

  // Validate end time is after start time
  const timeToMinutes = (timeStr) => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 60 + minutes + (seconds / 60);
  };
  
  const startMinutes = timeToMinutes(timeStartTime);
  const endMinutes = timeToMinutes(timeEndTime);
  if (endMinutes <= startMinutes) {
    return res.status(400).json({ 
      error: 'end_time must be after start_time' 
    });
  }


  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Validate class exists
    const [classRows] = await conn.execute(
      'SELECT id FROM classes WHERE id = ? FOR UPDATE',
      [class_id]
    );
    if (classRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check for overlapping breaks
    // const [overlapBreaks] = await conn.execute(
    //   `SELECT id FROM class_breaks 
    //    WHERE class_id = ? AND day_of_week = ?
    //    AND NOT (end_time <= ? OR start_time >= ?)`,
    //   [class_id, day_of_week.toUpperCase(), start_time, end_time]
    // );
    const [overlapBreaks] = await conn.execute(
      `SELECT id FROM class_breaks 
       WHERE class_id = ? AND day_of_week = ?
       AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
      [class_id, day_of_week.toUpperCase(), timeStartTime, timeEndTime]  // Only 4 parameters
    );
    if (overlapBreaks.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ 
        error: 'Break time overlaps with existing break for this class/day' 
      });
    }

    // Check for overlapping with routines
    // const [overlapRoutines] = await conn.execute(
    //   `SELECT id FROM class_routines 
    //    WHERE class_id = ? AND day_of_week = ?
    //    AND NOT (end_time <= ? OR start_time >= ?)`,
    //   [class_id, day_of_week.toUpperCase(), start_time, end_time]
    // );

    const [overlapRoutines] = await conn.execute(
      `SELECT id FROM class_routines 
       WHERE class_id = ? AND day_of_week = ?
       AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
      [class_id, day_of_week.toUpperCase(), timeStartTime, timeEndTime]
    );
    if (overlapRoutines.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ 
        error: 'Break time overlaps with existing class routine' 
      });
    }

    // Insert the break
    const [result] = await conn.execute(
      `INSERT INTO class_breaks 
       (class_id, day_of_week, break_type, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [
        class_id, 
        day_of_week.toUpperCase(), 
        break_type.toUpperCase(), 
        start_time, 
        end_time
      ]
    );

    await conn.commit();
    conn.release();

    // Return the created break
    const [breakRows] = await pool.execute(
      `SELECT 
        cb.*,
        c.name AS class_name
       FROM class_breaks cb
       LEFT JOIN classes c ON c.id = cb.class_id
       WHERE cb.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ 
      message: 'Class break added successfully',
      class_break: breakRows[0] 
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/class-breaks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const updateClassBreak = async (req, res) => {
  const breakId = toInt(req.params.id);
  const { class_id, day_of_week, break_type, start_time, end_time } = req.body;

  if (!breakId) {
    return res.status(400).json({ error: 'Invalid break ID' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get current break
    const [currentBreak] = await conn.execute(
      'SELECT * FROM class_breaks WHERE id = ? FOR UPDATE',
      [breakId]
    );
    if (currentBreak.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Class break not found' });
    }

    const current = currentBreak[0];

    // Helper function to extract time from datetime
    const extractTime = (datetimeStr) => {
      if (!datetimeStr) return '00:00:00';
      
      // If it's already in TIME format (HH:MM:SS or HH:MM)
      if (datetimeStr.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        // Ensure HH:MM:SS format
        if (datetimeStr.length === 5) {
          return `${datetimeStr}:00`;
        }
        return datetimeStr;
      }
      
      // If it's in datetime format (YYYY-MM-DD HH:MM:SS)
      if (datetimeStr.includes(' ')) {
        const timePart = datetimeStr.split(' ')[1];
        return timePart.length === 5 ? `${timePart}:00` : timePart;
      }
      
      // If it's in ISO format (YYYY-MM-DDTHH:MM:SS)
      if (datetimeStr.includes('T')) {
        const timePart = datetimeStr.split('T')[1].split('.')[0];
        return timePart.length === 5 ? `${timePart}:00` : timePart;
      }
      
      return '00:00:00';
    };

    // Prepare update values
    const finalClassId = class_id !== undefined ? class_id : current.class_id;
    const finalDay = day_of_week !== undefined ? day_of_week.toUpperCase() : current.day_of_week;
    const finalBreakType = break_type !== undefined ? break_type.toUpperCase() : current.break_type;
    const finalStartTime = start_time !== undefined ? extractTime(start_time) : extractTime(current.start_time);
    const finalEndTime = end_time !== undefined ? extractTime(end_time) : extractTime(current.end_time);

    // Validate day if provided
    if (day_of_week && !DAYS.includes(finalDay)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ 
        error: `day_of_week must be one of ${DAYS.join(', ')}` 
      });
    }

    // Validate break type if provided
    if (break_type) {
      const validBreakTypes = ['LUNCH', 'SHORT_BREAK', 'LONG_BREAK'];
      if (!validBreakTypes.includes(finalBreakType)) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ 
          error: `break_type must be one of ${validBreakTypes.join(', ')}` 
        });
      }
    }

    if (!isDateTimeString(start_time) || !isDateTimeString(end_time)) return res.status(400).json({ error: 'start_time/end_time must be YYYY-MM-DD HH:MM or YYYY-MM-DD HH:MM:SS' });

    const timeStartTime = extractTime(start_time);
    const timeEndTime = extractTime(end_time);

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(timeStartTime) || !timeRegex.test(timeEndTime)) {
      return res.status(400).json({ 
        error: 'start_time and end_time must be in HH:MM:SS format' 
      });
    }

    // Validate end time is after start time
    const timeToMinutes = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      return hours * 60 + minutes + (seconds / 60);
    };
    
    const startMinutes = timeToMinutes(timeStartTime);
    const endMinutes = timeToMinutes(timeEndTime);
    if (endMinutes <= startMinutes) {
      return res.status(400).json({ 
        error: 'end_time must be after start_time' 
      });
    }

    // Validate time format if provided
    // const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    // if ((start_time && !timeRegex.test(start_time)) || (end_time && !timeRegex.test(end_time))) {
    //   await conn.rollback();
    //   conn.release();
    //   return res.status(400).json({ 
    //     error: 'start_time and end_time must be in HH:MM:SS or HH:MM format' 
    //   });
    // }

    // Validate end time is after start time
    // const startMinutes = timeToMinutes(finalStartTime);
    // const endMinutes = timeToMinutes(finalEndTime);
    // if (endMinutes <= startMinutes) {
    //   await conn.rollback();
    //   conn.release();
    //   return res.status(400).json({ 
    //     error: 'end_time must be after start_time' 
    //   });
    // }

    // Validate class if provided
    if (class_id) {
      const [classRows] = await conn.execute(
        'SELECT id FROM classes WHERE id = ? FOR UPDATE',
        [class_id]
      );
      if (classRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ error: 'Class not found' });
      }
    }

    // Check for overlapping breaks (excluding current)
    // const [overlapBreaks] = await conn.execute(
    //   `SELECT id FROM class_breaks 
    //    WHERE class_id = ? AND day_of_week = ? AND id != ?
    //    AND NOT (end_time <= ? OR start_time >= ?)`,
    //   [finalClassId, finalDay, breakId, finalStartTime, finalEndTime]
    // );
    const [overlapBreaks] = await conn.execute(
      `SELECT id FROM class_breaks 
       WHERE class_id = ? AND day_of_week = ? AND id != ?
       AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
      [finalClassId, finalDay, breakId, timeStartTime, timeEndTime]
    );
    if (overlapBreaks.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ 
        error: 'Break time overlaps with another break for this class/day' 
      });
    }

    // Check for overlapping with routines
    // const [overlapRoutines] = await conn.execute(
    //   `SELECT id FROM class_routines 
    //    WHERE class_id = ? AND day_of_week = ?
    //    AND NOT (end_time <= ? OR start_time >= ?)`,
    //   [finalClassId, finalDay, finalStartTime, finalEndTime]
    // );
    const [overlapRoutines] = await conn.execute(
      `SELECT id FROM class_routines 
       WHERE class_id = ? AND day_of_week = ?
       AND NOT (TIME(end_time) <= ? OR TIME(start_time) >= ?)`,
      [finalClassId, finalDay, finalStartTime, finalEndTime]
    );
    if (overlapRoutines.length > 0) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ 
        error: 'Break time overlaps with existing class routine' 
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (class_id !== undefined) { updates.push('class_id = ?'); params.push(class_id); }
    if (day_of_week !== undefined) { updates.push('day_of_week = ?'); params.push(finalDay); }
    if (break_type !== undefined) { updates.push('break_type = ?'); params.push(finalBreakType); }
    if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time); }

    if (updates.length > 0) {
      params.push(breakId);
      await conn.execute(
        `UPDATE class_breaks SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    await conn.commit();
    conn.release();

    // Return updated break
    const [updatedBreak] = await pool.execute(
      `SELECT 
        cb.*,
        c.name AS class_name
       FROM class_breaks cb
       LEFT JOIN classes c ON c.id = cb.class_id
       WHERE cb.id = ?`,
      [breakId]
    );

    return res.json({ 
      message: 'Class break updated successfully',
      class_break: updatedBreak[0] 
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('PUT /api/class-breaks/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const deleteClassBreak = async (req, res) => {
  const breakId = toInt(req.params.id);

  if (!breakId) {
    return res.status(400).json({ error: 'Invalid break ID' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check if break exists
    const [breakRows] = await conn.execute(
      'SELECT * FROM class_breaks WHERE id = ? FOR UPDATE',
      [breakId]
    );
    if (breakRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Class break not found' });
    }

    // Delete the break
    await conn.execute('DELETE FROM class_breaks WHERE id = ?', [breakId]);

    await conn.commit();
    conn.release();

    return res.json({ 
      message: 'Class break deleted successfully',
      deleted_id: breakId 
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('DELETE /api/class-breaks/:id error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  addRoutine,
  GetRoutine,
  GetRoutineById,
  updateRoutine,
  deleteRoutine,
  replaceTimeTable,
  getTimeTableForClass,
  getTimeTableForTeacher,
  getTimeTableWithSubjectClass,
  addClassBreak,
  updateClassBreak,
  deleteClassBreak
};