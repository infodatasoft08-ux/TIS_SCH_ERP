const formatSQLDateTime = require('../config/dateTimeConvert');
const formatMySQLDate = require('../config/deateConverter');
const pool = require('../db');
const { deleteFromCloudinary } = require('../helper/cloudinaryHelper');
// const { sendWhatsAppMessage } = require('../helper/whatsappHelper');

const toInt = v => (v === undefined || v === null ? null : Number(v));
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isDateTimeString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(s);



/**
 * POST /api/notices
 * Body:
 * {
 *   title, body?, audience? ('all'|'students'|'teachers'|'staff'|'parents'),
 *   class_id?, publish_at (ISO datetime)?, expire_at (ISO datetime)?, is_published? (boolean), created_by?
 * }
 */
const createNotice = async (req, res) => {
    const { title, body, audience = 'all', class_id = null, publish_at = null, expire_at = null, is_published = false, created_by = null } = req.body;
    if (!isNonEmptyString(title)) return res.status(400).json({ error: 'title is required' });
    // if (publish_at && !isDateTimeString(publish_at)) return res.status(400).json({ error: 'publish_at must be ISO datetime (YYYY-MM-DDTHH:MM[:SS])' });
    // if (expire_at && !isDateTimeString(expire_at)) return res.status(400).json({ error: 'expire_at must be ISO datetime (YYYY-MM-DDTHH:MM[:SS])' });

    // Function to convert datetime to ISO format
    const toISOString = (datetime) => {
        if (!datetime) return null;

        // If it's already in ISO format (has 'T'), return as-is
        if (datetime.includes('T')) {
            return datetime;
        }

        // Convert from "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDT HH:MM:SS"
        // Or from "YYYY-MM-DD HH:MM" to "YYYY-MM-DDT HH:MM:00"
        const datePart = datetime.split(' ')[0];
        let timePart = datetime.split(' ')[1] || '00:00';

        // Ensure time has seconds
        if (timePart.split(':').length === 2) {
            timePart = timePart + ':00';
        }

        return `${datePart}T${timePart}`;
    };

    // Convert to ISO format
    const publishAtISO = toISOString(publish_at);
    const expireAtISO = toISOString(expire_at);

    // Validate
    if (publish_at && !publishAtISO) {
        return res.status(400).json({ error: 'publish_at must be a valid datetime' });
    }
    if (expire_at && !expireAtISO) {
        return res.status(400).json({ error: 'expire_at must be a valid datetime' });
    }

    try {
        const final_image_url = req.file ? req.file.path : null;
        const [ins] = await pool.execute(
            `INSERT INTO notices (title, body, audience, class_id, publish_at, expire_at, is_published, created_by, image_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [title.trim(), body || null, audience, class_id || null, publishAtISO || null, expireAtISO || null, (is_published ? 1 : 0), created_by || null, final_image_url]
        );
        const [rows] = await pool.execute('SELECT * FROM notices WHERE id = ?', [ins.insertId]);

        return res.status(201).json({ notice: rows[0] });
    } catch (err) {
        console.error('POST /api/notices error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/notices
 * Query: ?q&audience&class_id&published=1|0&from&to&limit&offset
 */

const getNotice = async (req, res) => {
    try {
        const q = req.query.q ? `%${req.query.q}%` : '%';
        const audience = req.query.audience || null;
        const classId = req.query.class_id ? Number(req.query.class_id) : null;
        const published = req.query.published !== undefined ? (req.query.published === '1' || req.query.published === 'true') : null;
        const from = req.query.from || null; // date or datetime
        const to = req.query.to || null;
        let limit = parseInt(req.query.limit || '100', 10);
        let offset = parseInt(req.query.offset || '0', 10);
        if (!Number.isFinite(limit) || limit < 1) limit = 100;
        if (!Number.isFinite(offset) || offset < 0) offset = 0;
        limit = Math.min(limit, 2000);

        const where = [];
        const params = [];

        if (audience) { where.push('audience = ?'); params.push(audience); }
        if (classId) { where.push('class_id = ?'); params.push(classId); }
        if (published !== null) { where.push('is_published = ?'); params.push(published ? 1 : 0); }
        if (from && to) {
            where.push('(publish_at BETWEEN ? AND ? OR created_at BETWEEN ? AND ?)');
            params.push(from, to, from, to);
        } else if (from) {
            where.push('(publish_at >= ? OR created_at >= ?)');
            params.push(from, from);
        } else if (to) {
            where.push('(publish_at <= ? OR created_at <= ?)');
            params.push(to, to);
        }

        where.push('(title LIKE ? OR body LIKE ?)');
        params.push(q, q);

        let baseSql = 'FROM notices';
        if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

        const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
        const [cnt] = await pool.execute(countSql, params);
        const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

        const dataSql = `
        SELECT *
        ${baseSql}
        ORDER BY publish_at DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await pool.execute(dataSql, params);
        const formattedNotices = rows.map(notice => ({
            ...notice,
            // Format date as yyyy-mm-dd without timezone conversion
            publish_at: notice.publish_at ?
                formatSQLDateTime(notice.publish_at) :
                null,
            expire_at: notice.expire_at ?
                formatSQLDateTime(notice.expire_at) :
                null
        }));

        return res.json({ total, limit, offset, notices: formattedNotices });
    } catch (err) {
        console.error('GET /api/notices error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/notices/:id
 */

const getNoticeById = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [rows] = await pool.execute('SELECT * FROM notices WHERE id = ?', [id]);
        const formattedNotices = rows.map(notice => ({
            ...notice,
            // Format date as yyyy-mm-dd without timezone conversion
            publish_at: notice.publish_at ?
                formatSQLDateTime(notice.publish_at) :
                null,
            expire_at: notice.expire_at ?
                formatSQLDateTime(notice.expire_at) :
                null
        }));
        if (formattedNotices.length === 0) return res.status(404).json({ error: 'Notice not found' });
        return res.json({ notice: formattedNotices[0] });
    } catch (err) {
        console.error('GET /api/notices/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * PUT /api/notices/:id
 * Body: { title?, body?, audience?, class_id?, publish_at?, expire_at?, is_published? }
 */

const updateNotice = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { title, body, audience, class_id, publish_at, expire_at, is_published } = req.body;
    if (title === undefined && body === undefined && audience === undefined && class_id === undefined && publish_at === undefined && expire_at === undefined && is_published === undefined) {
        return res.status(400).json({ error: 'At least one field required' });
    }
    if (publish_at !== undefined && publish_at !== null && !isDateTimeString(publish_at)) return res.status(400).json({ error: 'publish_at invalid' });
    if (expire_at !== undefined && expire_at !== null && !isDateTimeString(expire_at)) return res.status(400).json({ error: 'expire_at invalid' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.execute('SELECT * FROM notices WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Notice not found' }); }

        const updates = []; const params = [];
        if (title !== undefined) { updates.push('title = ?'); params.push(isNonEmptyString(title) ? title.trim() : null); }
        if (body !== undefined) { updates.push('body = ?'); params.push(body || null); }
        if (audience !== undefined) { updates.push('audience = ?'); params.push(audience || null); }
        if (class_id !== undefined) { updates.push('class_id = ?'); params.push(class_id || null); }
        if (publish_at !== undefined) { updates.push('publish_at = ?'); params.push(publish_at || null); }
        if (expire_at !== undefined) { updates.push('expire_at = ?'); params.push(expire_at || null); }
        if (is_published !== undefined) { updates.push('is_published = ?'); params.push(is_published ? 1 : 0); }

        if (req.file) {
            if (rows[0].image_url) {
                await deleteFromCloudinary(rows[0].image_url);
            }
            updates.push('image_url = ?');
            params.push(req.file.path);
        } else if (req.body.image_url !== undefined) {
            if (req.body.image_url === "" && rows[0].image_url) {
                await deleteFromCloudinary(rows[0].image_url);
            }
            updates.push('image_url = ?');
            params.push(req.body.image_url || null);
        }

        params.push(id);
        await conn.execute(`UPDATE notices SET ${updates.join(', ')} WHERE id = ?`, params);

        await conn.commit();
        conn.release();

        const [updated] = await pool.execute('SELECT * FROM notices WHERE id = ?', [id]);
        return res.json({ notice: updated[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/notices/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * DELETE /api/notices/:id
 */

const deleteNotice = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [existing] = await pool.execute('SELECT image_url FROM notices WHERE id = ?', [id]);
        const imageUrl = existing[0] ? existing[0].image_url : null;

        const [result] = await pool.execute('DELETE FROM notices WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Notice not found' });

        if (imageUrl) {
            await deleteFromCloudinary(imageUrl);
        }
        return res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error('DELETE /api/notices/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/* -------------------------
   EVENTS
   ------------------------- */

/**
 * POST /api/events
 * Body:
 * {
 *   title, description?, location?, event_date (YYYY-MM-DD required),
 *   start_time (HH:MM)?, end_time (HH:MM)?, capacity?, created_by?, is_public?
 * }
 */

const createEvents = async (req, res) => {
    const { title, description, location, event_date, start_time = null, end_time = null, capacity = null, created_by = null, is_public = true, image_url } = req.body;
    if (!isNonEmptyString(title)) {
        if (image_url) await deleteFromCloudinary(image_url);
        return res.status(400).json({ error: 'title is required' });
    }
    if (!event_date || !isDateString(event_date)) {
        if (image_url) await deleteFromCloudinary(image_url);
        return res.status(400).json({ error: 'event_date (YYYY-MM-DD) is required' });
    }

    try {
        const final_image_url = req.file ? req.file.path : (image_url || null);
        const [ins] = await pool.execute(
            `INSERT INTO events (title, description, location, event_date, start_time, end_time, capacity, created_by, is_public, image_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [title.trim(), description || null, location || null, event_date, start_time || null, end_time || null, capacity || null, created_by || null, (is_public ? 1 : 0), final_image_url]
        );
        const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [ins.insertId]);

        // --- WHATSAPP INTEGRATION (EVENT) ---
        // try {
        //     if (is_public) {
        //         // For events, usually notify all students/parents
        //         const [students] = await pool.execute(
        //             `SELECT s.parent_contact, s.mother_contect, u.phone as student_phone 
        //              FROM student_academic_records sar
        //              JOIN students s ON s.id = sar.student_id
        //              JOIN users u ON u.id = s.user_id
        //              WHERE sar.id IN (SELECT MAX(id) FROM student_academic_records GROUP BY student_id)`
        //         );
        //         for (const student of students) {
        //             const contact = student.parent_contact || student.mother_contect || student.student_phone;
        //             sendWhatsAppMessage(student.parent_contact || student.student_phone, `New Event: ${title} on ${event_date}. ${description || ''}`);
        //         }
        //     }
        // } catch (msgErr) { console.error('Event notification error:', msgErr); }
        // -------------------------------------

        return res.status(201).json({ event: rows[0] });
    } catch (err) {
        if (image_url) await deleteFromCloudinary(image_url);
        console.error('POST /api/events error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/events
 * Query: ?q&from&to&class_id&is_public&limit&offset
 */

const getEvents = async (req, res) => {
    try {
        const q = req.query.q ? `%${req.query.q}%` : '%';
        const from = req.query.from || null; // date
        const to = req.query.to || null;
        const is_public = req.query.is_public !== undefined ? (req.query.is_public === '1' || req.query.is_public === 'true') : null;
        let limit = parseInt(req.query.limit || '100', 10);
        let offset = parseInt(req.query.offset || '0', 10);
        if (!Number.isFinite(limit) || limit < 1) limit = 100;
        if (!Number.isFinite(offset) || offset < 0) offset = 0;
        limit = Math.min(limit, 2000);

        const where = [];
        const params = [];

        if (from && to) {
            if (!isDateString(from) || !isDateString(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
            where.push('event_date BETWEEN ? AND ?'); params.push(from, to);
        } else if (from) {
            if (!isDateString(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
            where.push('event_date >= ?'); params.push(from);
        } else if (to) {
            if (!isDateString(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
            where.push('event_date <= ?'); params.push(to);
        }

        if (is_public !== null) { where.push('is_public = ?'); params.push(is_public ? 1 : 0); }

        where.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)'); params.push(q, q, q);

        let baseSql = 'FROM events';
        if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

        const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
        const [cnt] = await pool.execute(countSql, params);
        const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

        const dataSql = `
            SELECT *
            ${baseSql}
            ORDER BY event_date ASC, start_time ASC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await pool.execute(dataSql, params);

        const formattedEvents = rows.map(events => ({
            ...events,
            // Format date as yyyy-mm-dd without timezone conversion
            event_date: events.event_date ?
                formatMySQLDate(events.event_date) :
                null,
        }));

        return res.json({ total, limit, offset, events: formattedEvents });
    } catch (err) {
        console.error('GET /api/events error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * GET /api/events/:id
 */

const getEventsById = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
        const event = rows[0];

        const formattedEvents = event.map(events => ({
            ...events,
            // Format date as yyyy-mm-dd without timezone conversion
            event_date: events.event_date ?
                formatMySQLDate(events.event_date) :
                null,
        }));

        // fetch registrations count & optionally list
        const [cnt] = await pool.execute('SELECT COUNT(*) AS cnt FROM event_registrations WHERE event_id = ?', [id]);
        event.registered_count = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].cnt || 0) : 0;

        return res.json({ formattedEvents });
    } catch (err) {
        console.error('GET /api/events/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * PUT /api/events/:id
 * Body: { title?, description?, location?, event_date?, start_time?, end_time?, capacity?, is_public? }
 */
const updateEvents = async (req, res) => {
    const id = toInt(req.params.eventid);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const { title, description, location, event_date, start_time, end_time, capacity, is_public, image_url } = req.body;
    if (title === undefined && description === undefined && location === undefined && event_date === undefined && start_time === undefined && end_time === undefined && capacity === undefined && is_public === undefined && image_url === undefined && !req.file) {
        return res.status(400).json({ error: 'At least one field required' });
    }
    if (event_date !== undefined && event_date !== null && !isDateString(event_date)) return res.status(400).json({ error: 'event_date must be YYYY-MM-DD' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const [rows] = await conn.execute('SELECT * FROM events WHERE id = ? FOR UPDATE', [id]);
        if (rows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Event not found' }); }

        const updates = []; const params = [];
        if (title !== undefined) { updates.push('title = ?'); params.push(isNonEmptyString(title) ? title.trim() : null); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
        if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
        if (event_date !== undefined) { updates.push('event_date = ?'); params.push(event_date || null); }
        if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time || null); }
        if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time || null); }
        if (capacity !== undefined) { updates.push('capacity = ?'); params.push(capacity || null); }
        if (is_public !== undefined) { updates.push('is_public = ?'); params.push(is_public ? 1 : 0); }
        if (req.file) {
            if (rows[0].image_url) {
                await deleteFromCloudinary(rows[0].image_url);
            }
            updates.push('image_url = ?');
            params.push(req.file.path);
        } else if (image_url !== undefined) {
            if (image_url === null && rows[0].image_url) {
                await deleteFromCloudinary(rows[0].image_url);
            }
            updates.push('image_url = ?');
            params.push(image_url || null);
        }

        params.push(id);
        await conn.execute(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`, params);

        await conn.commit();
        conn.release();

        const [updated] = await pool.execute('SELECT * FROM events WHERE id = ?', [id]);
        return res.json({ event: updated[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('PUT /api/events/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * DELETE /api/events/:id
 */
const deleteEvent = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const [existing] = await pool.execute('SELECT image_url FROM events WHERE id = ? FOR UPDATE', [id]);
        const imageUrl = existing[0] ? existing[0].image_url : null;

        const [result] = await pool.execute('DELETE FROM events WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Event not found' });

        if (imageUrl) {
            await deleteFromCloudinary(imageUrl);
        }
        return res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error('DELETE /api/events/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/* -------------------------
   EVENT REGISTRATIONS
   ------------------------- */

/**
 * POST /api/events/:id/register
 * Body: { user_id }  // user id of student/teacher/staff/parent registering
 */

const createEventRegister = async (req, res) => {
    const eventId = toInt(req.params.eventid);
    const userId = toInt(req.body.user_id);
    if (!eventId || !userId) return res.status(400).json({ error: 'event id and user_id required' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [erows] = await conn.execute('SELECT id, capacity FROM events WHERE id = ? FOR UPDATE', [eventId]);
        if (erows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Event not found' }); }
        const event = erows[0];

        // check capacity (if set)
        if (event.capacity) {
            const [cnt] = await conn.execute('SELECT COUNT(*) AS cnt FROM event_registrations WHERE event_id = ? AND status = "registered"', [eventId]);
            const registered = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].cnt || 0) : 0;
            if (registered >= Number(event.capacity)) { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Event is full' }); }
        }

        // upsert registration
        await conn.execute(
            `INSERT INTO event_registrations (event_id, user_id, registered_at, status)
            VALUES (?, ?, NOW(), 'registered')
            ON DUPLICATE KEY UPDATE status = 'registered', registered_at = NOW()`,
            [eventId, userId]
        );

        await conn.commit();
        conn.release();

        const [regRows] = await pool.execute('SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        return res.status(201).json({ registration: regRows[0] });
    } catch (err) {
        await conn.rollback();
        conn.release();
        console.error('POST /api/events/:id/register error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/**
 * GET /api/events/:id/registrations
 * Query: ?status&limit&offset
 */

const getEventRegister = async (req, res) => {
    const eventId = toInt(req.params.eventid);
    if (!eventId) return res.status(400).json({ error: 'Invalid event id' });

    let limit = parseInt(req.query.limit || '200', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    const status = req.query.status ? String(req.query.status) : null;

    try {
        const where = ['er.event_id = ?']; const params = [eventId];
        if (status) { where.push('er.status = ?'); params.push(status); }

        const baseSql = `
            FROM event_registrations er
            JOIN users u ON u.id = er.user_id
            LEFT JOIN students st ON st.user_id = u.id
            LEFT JOIN teachers t ON t.user_id = u.id
            LEFT JOIN staff s ON s.user_id = u.id
            LEFT JOIN student_academic_records sa ON sa.student_id = st.id
        `;
        const whereSql = ' WHERE ' + where.join(' AND ');

        const [cnt] = await pool.execute(`SELECT COUNT(*) AS total ${baseSql} ${whereSql}`, params);
        const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

        const dataSql = `
            SELECT er.*, u.name AS user_name, u.email AS user_email, sa.id AS student_id, sa.roll_no AS student_roll_no,
            t.id AS teacher_id,
            s.id AS staff_id
            ${baseSql}
            ${whereSql}
            ORDER BY er.registered_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const [rows] = await pool.execute(dataSql, params);

        return res.json({ total, limit, offset, registrations: rows });
    } catch (err) {
        console.error('GET /api/events/:id/registrations error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/**
 * PUT /api/events/registrations/:reg_id
 * Body: { status } // 'registered'|'cancelled'|'checked_in'
 */

const updateEventRegister = async (req, res) => {
    const regId = toInt(req.params.reg_id);
    const { status } = req.body;
    if (!regId || !status) return res.status(400).json({ error: 'registration id and status required' });
    if (!['registered', 'cancelled', 'checked_in'].includes(status)) return res.status(400).json({ error: 'invalid status' });

    try {
        const [rows] = await pool.execute('SELECT * FROM event_registrations WHERE id = ? FOR UPDATE', [regId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Registration not found' });

        await pool.execute('UPDATE event_registrations SET status = ? WHERE id = ?', [status, regId]);
        const [updated] = await pool.execute('SELECT * FROM event_registrations WHERE id = ?', [regId]);
        return res.json({ registration: updated[0] });
    } catch (err) {
        console.error('PUT /api/events/registrations/:reg_id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


/**
 * DELETE /api/events/registrations/:reg_id
 */

const deleteEventRegister = async (req, res) => {
    const regId = toInt(req.params.reg_id);
    if (!regId) return res.status(400).json({ error: 'Invalid registration id' });
    try {
        const [result] = await pool.execute('DELETE FROM event_registrations WHERE id = ?', [regId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Registration not found' });
        return res.json({ success: true, deleted_id: regId });
    } catch (err) {
        console.error('DELETE /api/events/registrations/:reg_id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}



/**
 * GET /api/announcement/list/my/registrations
 */
const getMyRegistrations = async (req, res) => {
    const userId = req.user.id;
    if (!userId) return res.status(400).json({ error: 'User not authenticated' });

    try {
        const [rows] = await pool.execute(
            `SELECT * FROM event_registrations WHERE user_id = ?`,
            [userId]
        );
        return res.json({ registrations: rows });
    } catch (err) {
        console.error('GET /api/announcement/list/my/registrations error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    createNotice,
    getNotice,
    getNoticeById,
    updateNotice,
    deleteNotice,
    createEvents,
    getEvents,
    getEventsById,
    updateEvents,
    deleteEvent,
    createEventRegister,
    getEventRegister,
    updateEventRegister,
    deleteEventRegister,
    getMyRegistrations
};