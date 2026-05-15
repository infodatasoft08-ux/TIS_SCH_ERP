const express = require('express');
const db = require('../db');
const formatMySQLDate = require("../config/deateConverter");
const whatsappQueue = require('../queues/whatsappQueue');

const VALID_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const toInt = v => (v === undefined || v === null || v === "" ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);


const TakeAttendance = async (req, res) => {
  const records = Array.isArray(req.body.records) ? req.body.records : [];
  if (records.length === 0) return res.status(400).json({ error: 'records array is required' });

  // validate records and normalize
  const normalized = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const student_id = toInt(r.student_id);
    const class_id = toInt(r.class_id);
    const student_academic_id = toInt(r.student_academic_id);
    const lesson_id = r.lesson_id ? toInt(r.lesson_id) : null;
    const attendance_date = r.attendance_date || null;
    const status = r.status ? String(r.status).toLowerCase() : null;
    const recorded_by = r.recorded_by ? toInt(r.recorded_by) : null;

    if (!student_id || !class_id || !student_academic_id) return res.status(400).json({ error: `record[${i}]: student_id, class_id and student academic id are required` });
    if (!attendance_date || !isDateString(attendance_date)) return res.status(400).json({ error: `record[${i}]: attendance_date is required in YYYY-MM-DD format` });
    if (!status || !VALID_STATUSES.has(status)) return res.status(400).json({ error: `record[${i}]: invalid status (allowed: present, absent, late, excused)` });

    normalized.push({ student_id, class_id, student_academic_id, lesson_id, attendance_date, status, recorded_by });
  }

  // const [arRows] = await conn.execute(
  //   `SELECT ar.id AS student_academic_id, ar.class_id, ar.student_id, ar.grade_id
  //     FROM student_academic_records ar
  //     WHERE ar.student_id = ?
  //     ORDER BY ar.id DESC LIMIT 1
  //     FOR UPDATE`,
  //   [student_id]
  // );



  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Build bulk insert values
    // Columns: student_id, class_id, lesson_id, date, status, recorded_by, recorded_at
    const valuesSql = normalized.map(() => '(?, ?, ?, ?, ?, ?, ?, NOW())').join(', ');
    const params = [];
    normalized.forEach(r => {
      params.push(r.student_id, r.class_id, r.student_academic_id, r.lesson_id, r.attendance_date, r.status, r.recorded_by || null);
    });

    // Use ON DUPLICATE KEY UPDATE to update status/recorded_by/recorded_at
    const sql = `
      INSERT INTO attendance (student_id, class_id, student_academic_id, lesson_id, attendance_date, status, recorded_by, recorded_at)
      VALUES ${valuesSql}
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        recorded_by = VALUES(recorded_by),
        recorded_at = NOW()
    `;

    const [result] = await conn.execute(sql, params);

    await conn.commit();

    // --- WHATSAPP INTEGRATION (BULK) ---
    try {
      const studentIds = normalized.map(r => r.student_id);
      if (studentIds.length > 0) {
        const [details] = await conn.execute(
          `SELECT s.id as student_id, u.name as student_name, c.name as class_name, sar.roll_no, 
                  s.parent_contact, s.mother_contect, u.phone as student_phone, ay.name as academic_year
           FROM students s
           JOIN users u ON u.id = s.user_id
           JOIN student_academic_records sar ON sar.student_id = s.id
           JOIN academic_years ay ON ay.id = sar.academic_year_id
           JOIN classes c ON c.id = sar.class_id
           WHERE s.id IN (${studentIds.map(() => '?').join(',')})
             AND sar.id IN (SELECT MAX(id) FROM student_academic_records GROUP BY student_id)`,
          [...studentIds]
        );

        const detailsMap = {};
        details.forEach(d => { detailsMap[d.student_id] = d; });
        let msg = '';



        for (const record of normalized) {
          const detail = detailsMap[record.student_id];
          if (detail && ['absent', 'late'].includes(record.status)) {
            // Collect both student and parent contacts
            const contacts = [
              detail.student_phone,
              detail.parent_contact
            ]
              .filter(Boolean)
              .map(num => String(num).trim());

            // Remove duplicate numbers
            const uniqueContacts = [...new Set(contacts)];

            const attendanceDate = new Date(record.attendance_date).toLocaleDateString('en-IN');
            const currentTime = new Date().toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
            if (record.status === 'absent') {

              msg =
                `Dear Parent, 📢 *Attendance Alert*

👤 *Student:* ${detail.student_name}
🏫 *Class:* ${detail.class_name}
🎓 *Academic Year:* ${detail.academic_year}

❌ *Status:* ABSENT

📅 *Attendance Date:* ${attendanceDate}
⏰ *Reported At:* ${currentTime}

Please contact the school if this is incorrect.

Thank you,
*TIMES INTERNATIONAL SCHOOL*`;

            } else if (record.status === 'late') {

              msg =
                `📢 *Attendance Alert*

👤 *Student:* ${detail.student_name}
🏫 *Class:* ${detail.class_name}
🎓 *Academic Year:* ${detail.academic_year}

⏰ *Status:* LATE

📅 *Attendance Date:* ${attendanceDate}
⏰ *Reported At:* ${currentTime}

Thank you,
*TIMES INTERNATIONAL SCHOOL*`;
            }
            if (msg && uniqueContacts.length > 0 && record.status === 'absent') {
              for (const contact of uniqueContacts) {
                await whatsappQueue.add('bulkAttendanceNotification', {
                  contact: contact,
                  jobType: 'bulkAttendanceNotification',
                  message: {
                    template: {
                      name: "student_attendance_alert",
                      language: {
                        code: "en"
                      },
                      components: [
                        {
                          type: "body",
                          parameters: [
                            {
                              type: "text",
                              text: detail.student_name
                            },
                            {
                              type: "text",
                              text: record.attendance_date
                            },
                            {
                              type: "text",
                              text: 'ABSENT'
                            },
                            {
                              type: "text",
                              text: `TIMES INTERNATIONAL SCHOOL`
                            },
                            {
                              type: "text",
                              text: detail.class_name
                            },
                            {
                              type: "text",
                              text: detail.academic_year
                            }
                          ]
                        }
                      ]
                    },

                    // Fallback normal text
                    fallbackText: msg
                  }
                });

              }
            } else if (msg && uniqueContacts.length > 0 && record.status === 'late') {
              for (const contact of uniqueContacts) {
                await whatsappQueue.add('bulkAttendanceNotification', {
                  contact: contact,
                  jobType: 'bulkAttendanceNotification',
                  message: {
                    template: {
                      name: "student_attendance_alert",
                      language: {
                        code: "en"
                      },
                      components: [
                        {
                          type: "body",
                          parameters: [
                            {
                              type: "text",
                              text: detail.student_name
                            },
                            {
                              type: "text",
                              text: record.attendance_date
                            },
                            {
                              type: "text",
                              text: 'LATE'
                            },
                            {
                              type: "text",
                              text: `TIMES INTERNATIONAL SCHOOL`
                            },
                            {
                              type: "text",
                              text: detail.class_name
                            },
                            {
                              type: "text",
                              text: detail.academic_year
                            }
                          ]
                        }
                      ]
                    },

                    // Fallback normal text
                    fallbackText: msg
                  }
                });

              }
            }
          }
        }
      }
    } catch (msgErr) { console.error('Bulk attendance notification error:', msgErr); }
    // -----------------------------------


    return res.json({ success: true, affectedRows: result.affectedRows, message: 'Today Attendance is Taken' });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/attendance error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



const UpdateSingleAttendance = async (req, res) => {
  const { attendance_id, recorded_by, status } = req.body;

  if (!attendance_id || !status) {
    return res.status(400).json({ error: 'attendance_id and status required' });
  }

  // const today = new Date().toISOString().split('T')[0];
  const normalizedStatus = String(status).toLowerCase();
  if (!VALID_STATUSES.has(normalizedStatus)) {
    return res.status(400).json({
      error: 'Invalid status (allowed: present, absent, late, excused)'
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existingAttendance] = await conn.execute(
      `SELECT 
          a.*,
          u.name as student_name,
          c.name as class_name,
          g.name as grade_name,
          ay.name as academic_year,
          sar.roll_no,
          s.parent_contact,
          s.mother_contect,
          u.phone as student_phone
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN users u ON u.id = s.user_id
      JOIN student_academic_records sar 
          ON sar.student_id = s.id
      JOIN classes c ON c.id = a.class_id
      JOIN grades g ON g.id = sar.grade_id
      JOIN academic_years ay ON ay.id = sar.academic_year_id
      WHERE a.id = ?`,
      [attendance_id]
    );

    if (!existingAttendance.length) {
      return res.status(404).json({
        error: 'Attendance record not found'
      });
    }

    const oldAttendance = existingAttendance[0];
    const previousStatus = oldAttendance.status;


    const [result] = await conn.execute(
      `UPDATE attendance
       SET status = ?, recorded_by = ?, recorded_at = NOW()
       WHERE id = ?`,
      [normalizedStatus, recorded_by || null, attendance_id]
    );

    await conn.commit();

    // -------------------------------
    // WHATSAPP UPDATE NOTIFICATION
    // -------------------------------
    try {
      // Collect both student and parent contacts
      const contacts = [
        oldAttendance.student_phone,
        oldAttendance.parent_contact
      ]
        .filter(Boolean)
        .map(num => String(num).trim());

      // Remove duplicate numbers
      const uniqueContacts = [...new Set(contacts)];

      const formattedDateTime = new Date(
        oldAttendance.attendance_date
      ).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      const currentDateTime = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      if (uniqueContacts.length > 0 && previousStatus !== normalizedStatus) {

        let msg = '';

        // ABSENT -> PRESENT
        if (
          previousStatus === 'absent' &&
          normalizedStatus === 'present'
        ) {

          msg =
            `Dear Parent 📢 *Attendance Update*

👤 *Student:* ${oldAttendance.student_name}
🏫 *Class:* ${oldAttendance.class_name}
🆔 *Roll No:* ${oldAttendance.roll_no || '-'}

✅ *Status Updated*
From: *ABSENT*
To: *PRESENT*

📅 *Attendance Date:* ${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}
⏰ *Updated At:* ${currentDateTime}

Thank you,
*TIMES INTERNATIONAL SCHOOL*`;

        }

        // LATE -> PRESENT
        else if (
          previousStatus === 'late' &&
          normalizedStatus === 'present'
        ) {

          msg =
            `📢 *Attendance Update*

👤 *Student:* ${oldAttendance.student_name}
🏫 *Class:* ${oldAttendance.class_name}
🆔 *Roll No:* ${oldAttendance.roll_no || '-'}

⏰ *Status Updated*
From: *LATE*
To: *PRESENT*

📅 *Attendance Date:* ${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}
⏰ *Updated At:* ${currentDateTime}

Thank you,
*TIMES INTERNATIONAL SCHOOL*`;

        }

        // PRESENT -> ABSENT
        else if (
          previousStatus === 'present' &&
          normalizedStatus === 'absent'
        ) {

          msg =
            `📢 *Attendance Update*

👤 *Student:* ${oldAttendance.student_name}
🏫 *Class:* ${oldAttendance.class_name}
🆔 *Roll No:* ${oldAttendance.roll_no || '-'}

❌ *Status:* ABSENT

📅 *Attendance Date:* ${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}
⏰ *Updated At:* ${currentDateTime}

Thank you,
*TIMES INTERNATIONAL SCHOOL*`;
        }

        if (msg && (previousStatus === 'absent' && normalizedStatus === 'present')) {
          // Send to all unique contacts absent to present
          for (const contact of uniqueContacts) {
            await whatsappQueue.add('bulkAttendanceNotification', {
              contact: contact,
              jobType: 'bulkAttendanceNotification',
              message: {
                template: {
                  name: "update_student_attendance_alert",
                  language: {
                    code: "en"
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: oldAttendance.student_name
                        },
                        {
                          type: "text",
                          text: `${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}`
                        },
                        {
                          type: "text",
                          text: 'ABSENT'
                        },
                        {
                          type: "text",
                          text: `TIMES INTERNATIONAL SCHOOL`
                        },
                        {
                          type: "text",
                          text: oldAttendance.class_name
                        },
                        {
                          type: "text",
                          text: oldAttendance.academic_year
                        }
                      ]
                    }
                  ]
                },
                fallbackText: msg
              }
            });
          }
        } else if (msg && (previousStatus === 'late' && normalizedStatus === 'present')) {

          // Send to all unique contacts late to present
          for (const contact of uniqueContacts) {
            await whatsappQueue.add('bulkAttendanceNotification', {
              contact: contact,
              jobType: 'bulkAttendanceNotification',
              message: {
                template: {
                  name: "update_student_attendance_alert",
                  language: {
                    code: "en"
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: oldAttendance.student_name
                        },
                        {
                          type: "text",
                          text: `${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}`
                        },
                        {
                          type: "text",
                          text: 'LATE'
                        },
                        {
                          type: "text",
                          text: `TIMES INTERNATIONAL SCHOOL`
                        },
                        {
                          type: "text",
                          text: oldAttendance.class_name
                        },
                        {
                          type: "text",
                          text: oldAttendance.academic_year
                        }
                      ]
                    }
                  ]
                },
                fallbackText: msg
              }
            });
          }
        } else if (msg && (previousStatus === 'present' && normalizedStatus === 'absent')) {

          // Send to all unique contacts present to absent
          for (const contact of uniqueContacts) {
            await whatsappQueue.add('bulkAttendanceNotification', {
              contact: contact,
              jobType: 'bulkAttendanceNotification',
              message: {
                template: {
                  name: "update_student_attendance_alert",
                  language: {
                    code: "en"
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: oldAttendance.student_name
                        },
                        {
                          type: "text",
                          text: `${new Date(oldAttendance.attendance_date).toLocaleDateString('en-IN')}`
                        },
                        {
                          type: "text",
                          text: 'ABSENT'
                        },
                        {
                          type: "text",
                          text: `TIMES INTERNATIONAL SCHOOL`
                        },
                        {
                          type: "text",
                          text: oldAttendance.class_name
                        },
                        {
                          type: "text",
                          text: oldAttendance.academic_year
                        }
                      ]
                    }
                  ]
                },
                fallbackText: msg
              }
            });
          }
        }
      }

    } catch (msgErr) {

      console.error(
        'Attendance update notification error:',
        msgErr
      );
    }

    return res.json({ success: true, message: 'Attendance updated successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('UpdateSingleAttendance error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



const GetAttendance = async (req, res) => {
  try {
    // const studentId = req.query.student_id ? Number(req.query.student_id) : null;
    // const classId = req.query.class_id ? Number(req.query.class_id) : null;
    // const lessonId = req.query.lesson_id ? Number(req.query.lesson_id) : null;
    // const attendance_date = req.query.attendance_date || null;
    // const from = req.query.from || null;
    // const to = req.query.to || null;
    // const status = req.query.status ? String(req.query.status).toLowerCase() : null;
    const {
      student_academic_id,
      class_id,
      lesson_id,
      from,
      to,
      status
    } = req.query;

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 2000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const where = [];
    const params = [];

    // if (studentId) { where.push('a.student_id = ?'); params.push(studentId); }
    // if (classId) { where.push('a.class_id = ?'); params.push(classId); }
    // if (lessonId) { where.push('a.lesson_id = ?'); params.push(lessonId); }
    if (student_academic_id) {
      where.push('a.student_academic_id = ?');
      params.push(student_academic_id);
    }

    if (class_id) {
      where.push('a.class_id = ?');
      params.push(class_id);
    }

    if (lesson_id) {
      where.push('a.lesson_id = ?');
      params.push(lesson_id);
    }
    // if (date) {
    //   if (!isDateString(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    //   where.push('a.date = ?'); params.push(date);
    // } else if (from || to) {
    //     if (from && !isDateString(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
    //     if (to && !isDateString(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
    //     if (from && to) { where.push('a.date BETWEEN ? AND ?'); params.push(from, to); 
    //     } else if (from) { where.push('a.date >= ?'); params.push(from); 
    //     } else if (to) { where.push('a.date <= ?'); params.push(to); }
    // }
    if (from && to) {
      where.push('a.attendance_date BETWEEN ? AND ?');
      params.push(from, to);
    }
    if (status) {
      if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: 'invalid status filter' });
      where.push('a.status = ?'); params.push(status);
    }

    let sql = `
          SELECT a.*, u.name AS student_name, u.email AS student_email
          FROM attendance a
          LEFT JOIN students s ON s.id = a.student_id
          LEFT JOIN users u ON u.id = s.user_id
        `;
    // if (where.length) sql += ' WHERE ' + where.join(' AND ');
    // sql += ` ORDER BY a.date DESC, a.student_id LIMIT ? OFFSET ?`;

    if (where.length) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ` ORDER BY a.attendance_date DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(sql, params);
    return res.json({ attendance: rows });
  } catch (err) {
    console.error('GET /api/attendance error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const GetAttendanceById = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const [rows] = await db.execute(
      `SELECT a.*, u.name AS student_name, u.email AS student_email
       FROM attendance a
       LEFT JOIN students s ON s.id = a.student_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Attendance record not found' });
    return res.json({ attendance: rows[0] });
  } catch (err) {
    console.error('GET /api/attendance/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const DeleteAttendace = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const [result] = await db.execute(`DELETE FROM attendance WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Attendance record not found' });
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('DELETE /api/attendance/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}




const GetStudentAttendanceRecords = async (req, res) => {
  try {
    const userStudentId = req.user.id;
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const from = req.query.from || null;
    const to = req.query.to || null;

    // Get student ID from user ID
    const [trows] = await db.execute(
      `SELECT id FROM students WHERE user_id = ?`,
      [userStudentId]
    );

    const [username] = await db.execute(
      `SELECT name FROM users WHERE id = ?`,
      [userStudentId]
    );

    const [className] = await db.execute(
      `SELECT name FROM classes WHERE id = ?`,
      [classId]
    );

    if (trows.length === 0) {
      return res.status(403).json({ error: 'You are not a Student' });
    }

    const studentId = trows[0].id;

    if (!from || !to) return res.status(400).json({ error: 'from and to dates (YYYY-MM-DD) are required' });
    if (!isDateString(from) || !isDateString(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
    if (!classId) return res.status(400).json({ error: 'class_id is required' });

    // Query to get DAILY attendance records (not aggregated)
    const [rows] = await db.execute(
      `SELECT 
          a.id,
          a.student_id,
          a.class_id,
          a.lesson_id,
          a.attendance_date,
          a.status,
          a.recorded_at,
          a.recorded_by,
          t.name AS Taken_By,
          u.name AS student_name,
          c.name AS class_name,
          l.title AS lesson_name
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN users t ON t.id = a.recorded_by
       LEFT JOIN classes c ON c.id = a.class_id
       LEFT JOIN lessons l ON l.id = a.lesson_id
       WHERE a.student_id = ? 
         AND a.class_id = ? 
         AND a.attendance_date BETWEEN ? AND ?
       ORDER BY a.attendance_date DESC`,
      [studentId, classId, from, to]
    );

    const formattedrecords = rows.map(record => ({
      ...record,
      // Format date as yyyy-mm-dd without timezone conversion
      attendance_date: record.attendance_date ?
        formatMySQLDate(record.attendance_date) :
        null
    }));

    return res.json({
      success: true,
      records: formattedrecords,
      stats: {
        student_id: studentId,
        student_name: rows[0]?.student_name || username,
        class_id: classId,
        class_name: rows[0]?.class_name || className,
        period: { from, to },
        total_days: rows.length,
        present_count: rows.filter(r => r.status === 'present').length,
        absent_count: rows.filter(r => r.status === 'absent').length,
        late_count: rows.filter(r => r.status === 'late').length,
        excused_count: rows.filter(r => r.status === 'excused').length
      }
    });

  } catch (err) {
    console.error('GET /api/attendance/records error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const GetAttendanceSummery = async (req, res) => {
  try {
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    const limit = Number(req.query.limit) || 1000;
    const offset = Number(req.query.offset) || 0;
    const q = req.query.search || '';

    if (!from || !to) return res.status(400).json({ error: 'from and to dates (YYYY-MM-DD) are required' });
    if (!isDateString(from) || !isDateString(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
    if (!classId) return res.status(400).json({ error: 'class_id is required' });

    // Get attendance records for all students in the class with pagination
    const [rows] = await db.execute(
      `SELECT 
          a.id,
          a.student_id,
          a.class_id,
          a.lesson_id,
          a.attendance_date,
          sar.roll_no,
          a.status,
          a.recorded_at,
          a.recorded_by,
          t.name AS Taken_By,
          u.name AS student_name,
          c.name AS class_name,
          l.title AS lesson_name
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_academic_records sar ON sar.student_id = s.id AND sar.class_id = a.class_id
       LEFT JOIN users t ON t.id = a.recorded_by
       LEFT JOIN classes c ON c.id = a.class_id
       LEFT JOIN lessons l ON l.id = a.lesson_id
       WHERE a.class_id = ? 
         AND a.attendance_date BETWEEN ? AND ?
       ORDER BY a.attendance_date DESC, u.name ASC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      [classId, from, to]
    );

    // Calculate total stats for the full filtered range (not just the current page)
    const [overallStats] = await db.execute(
      `SELECT 
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused_count
       FROM attendance
       WHERE class_id = ? 
         AND attendance_date BETWEEN ? AND ?`,
      [classId, from, to]
    );

    const periodStats = overallStats[0] || {
      total_records: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      excused_count: 0
    };

    // Get total students in class for statistics
    const [studentsCount] = await db.execute(
      `SELECT COUNT(*) as total_students FROM student_academic_records WHERE class_id = ? AND academic_year_id = (SELECT academic_year_id FROM student_academic_records WHERE class_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1)`,
      [classId, classId]
    );

    // Get class name
    const [classRows] = await db.execute(
      `SELECT name FROM classes WHERE id = ?`,
      [classId]
    );

    const totalStudents = studentsCount[0]?.total_students || 0;
    const className = classRows[0]?.name || '';

    const formattedrecords = rows.map(record => ({
      ...record,
      // Format date as yyyy-mm-dd without timezone conversion
      attendance_date: record.attendance_date ?
        formatMySQLDate(record.attendance_date) :
        null
    }));

    return res.json({
      success: true,
      records: formattedrecords,
      stats: {
        class_id: classId,
        class_name: className,
        period: { from, to },
        total_students: totalStudents,
        total_records: parseInt(periodStats.total_records),
        present_count: parseInt(periodStats.present_count || 0),
        absent_count: parseInt(periodStats.absent_count || 0),
        late_count: parseInt(periodStats.late_count || 0),
        excused_count: parseInt(periodStats.excused_count || 0)
      }
    });

  } catch (err) {
    console.error('GET /api/attendance/records error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};




const GetSupervisedClassAttendanceTrends = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get teacher id
    const [trows] = await db.execute(
      `SELECT id FROM teachers WHERE user_id = ?`,
      [userId]
    );
    if (trows.length === 0) return res.status(403).json({ error: 'You are not a teacher' });
    const teacherId = trows[0].id;

    // 2. Get supervised class
    const [crows] = await db.execute(
      `SELECT id FROM classes WHERE supervisor_teacher_id = ?`,
      [teacherId]
    );
    if (crows.length === 0) return res.status(404).json({ error: 'No supervised class found' });
    const classId = crows[0].id;

    // 3. Get attendance stats grouped by month
    const [trends] = await db.execute(
      `SELECT 
          DATE_FORMAT(attendance_date, '%b %Y') as month,
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          MIN(attendance_date) as sort_date
       FROM attendance
       WHERE class_id = ?
       GROUP BY month
       ORDER BY sort_date ASC`,
      [classId]
    );

    const formattedTrends = trends.map(t => ({
      month: t.month,
      averagePresence: Number(((t.present_count / t.total_records) * 100).toFixed(1))
    }));

    return res.json({ trends: formattedTrends });

  } catch (err) {
    console.error('GET /api/attendance/supervised-class/trends error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  TakeAttendance,
  UpdateSingleAttendance,
  GetAttendance,
  GetAttendanceById,
  DeleteAttendace,
  GetStudentAttendanceRecords,
  GetAttendanceSummery,
  GetSupervisedClassAttendanceTrends
};