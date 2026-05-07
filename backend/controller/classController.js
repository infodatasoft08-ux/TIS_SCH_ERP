const db = require("../db");
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));



// const AddClass = async (req, res) => {
//     const { grade_id, name, supervisor_teacher_id, room, capacity } = req.body;

//     if (!grade_id || !Number.isInteger(Number(grade_id))) {
//         return res.status(400).json({ error: 'grade_id (integer) is required' });
//     }
//     if (!isNonEmptyString(name)) {
//         return res.status(400).json({ error: 'class name is required' });
//     }

//     const conn = await db.getConnection();
//     try {
//         await conn.beginTransaction();

//         // Validate grade exists
//         const [gradeRows] = await conn.execute(`SELECT id FROM grades WHERE id = ? FOR UPDATE`, [grade_id]);
//         if (gradeRows.length === 0) {
//             await conn.rollback();
//             conn.release();
//             return res.status(400).json({ error: 'grade_id not found' });
//         }

//         // If supervisor provided, validate teacher exists
//         if (supervisor_teacher_id) {
//         const [tRows] = await conn.execute(`SELECT id FROM teachers WHERE id = ?`, [supervisor_teacher_id]);
//         if (tRows.length === 0) {
//             await conn.rollback();
//             conn.release();
//             return res.status(400).json({ error: 'supervisor_teacher_id not found' });
//         }
//         }

//         // Insert class
//         const [ins] = await conn.execute(
//           `INSERT INTO classes (grade_id, name, supervisor_teacher_id, room, capacity, created_at)
//           VALUES (?, ?, ?, ?, ?, NOW())`,
//           [grade_id, name.trim(), supervisor_teacher_id || null, room || null, capacity || null]
//         );

//         const newId = ins.insertId;
//         const [rows] = await conn.execute(
//             `SELECT c.*, g.name AS grade_name,
//                     t.user_id AS supervisor_user_id
//             FROM classes c
//             LEFT JOIN grades g ON g.id = c.grade_id
//             LEFT JOIN teachers t ON t.id = c.supervisor_teacher_id
//             WHERE c.id = ?`,
//             [newId]
//         );

//         await conn.commit();
//         return res.status(201).json({ class: rows[0] });
//     } catch (err) {
//         await conn.rollback();
//         console.error('POST /api/classes error', err);
//         if (err && err.code === 'ER_DUP_ENTRY') {
//             return res.status(409).json({ error: 'Class with same name in grade already exists' });
//         }
//         return res.status(500).json({ error: 'Internal server error' });
//     } finally {
//       conn.release();
//     }
// };


const AddClass = async (req, res) => {
  const { grade_id, name, supervisor_teacher_id, room, capacity } = req.body;

  if (!grade_id || !Number.isInteger(Number(grade_id))) {
    return res.status(400).json({ error: 'grade_id (integer) is required' });
  }
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'class name is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Validate grade exists
    const [gradeRows] = await conn.execute(`SELECT id FROM grades WHERE id = ? FOR UPDATE`, [grade_id]);
    if (gradeRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'grade_id not found' });
    }

    // If supervisor provided, validate teacher exists AND is not already supervising another class
    if (supervisor_teacher_id) {
      // First: check teacher exists
      const [teacherRows] = await conn.execute(`SELECT id FROM teachers WHERE id = ?`, [supervisor_teacher_id]);
      if (teacherRows.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'supervisor_teacher_id not found' });
      }

      // Second: check if this teacher is already supervising another class
      const [existingClass] = await conn.execute(
        `SELECT id, name FROM classes WHERE supervisor_teacher_id = ?`,
        [supervisor_teacher_id]
      );

      if (existingClass.length > 0) {
        await conn.rollback();
        return res.status(409).json({
          error: `This teacher is already supervising class "${existingClass[0].name}". A teacher can only supervise one class.`
        });
      }
    }

    // Insert the new class
    const [ins] = await conn.execute(
      `INSERT INTO classes (grade_id, name, supervisor_teacher_id, room, capacity, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
      [grade_id, name.trim(), supervisor_teacher_id || null, room || null, capacity || null]
    );

    const newId = ins.insertId;

    // Fetch the created class with joined data
    const [rows] = await conn.execute(
      `SELECT c.*, g.name AS grade_name, t.user_id AS supervisor_user_id
             FROM classes c
             LEFT JOIN grades g ON g.id = c.grade_id
             LEFT JOIN teachers t ON t.id = c.supervisor_teacher_id
             WHERE c.id = ?`,
      [newId]
    );

    await conn.commit();
    return res.status(201).json({ class: rows[0] });

  } catch (err) {
    await conn.rollback();
    console.error('POST /api/classes error', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Class with same name in grade already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const GetClass = async (req, res) => {
  const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
  const q = req.query.q ? `%${req.query.q}%` : "%";
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  // const conn = await db.getConnection();
  try {
    let sql = `
      SELECT c.*,
             g.name AS grade_name,
             t.id AS supervisor_teacher_id,
             u.id AS supervisor_user_id,
             u.name AS supervisor_name,
             u.email AS supervisor_email
      FROM classes c
      LEFT JOIN grades g ON g.id = c.grade_id
      LEFT JOIN teachers t ON t.id = c.supervisor_teacher_id
      LEFT JOIN users u ON u.id = t.user_id
      WHERE (c.name LIKE ? OR c.room LIKE ? OR g.name LIKE ?)
    `;
    const params = [q, q, q];

    if (gradeId) {
      sql += " AND c.grade_id = ?";
      params.push(gradeId);
    }

    // embed validated numeric limit/offset directly
    sql += ` ORDER BY c.id ASC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(sql, params);
    // await conn.commit();
    return res.json({ classes: rows, limit, offset });
  } catch (err) {
    console.error("GET /api/classes error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const UpdateClass = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid class id' });

  const { grade_id, name, supervisor_teacher_id, room, capacity } = req.body || {};

  if (grade_id === undefined && name === undefined && supervisor_teacher_id === undefined && room === undefined && capacity === undefined) {
    return res.status(400).json({ error: 'At least one field is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the class row for update
    const [exists] = await conn.execute(`SELECT * FROM classes WHERE id = ? FOR UPDATE`, [id]);
    if (exists.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Class not found' });
    }

    const currentSupervisorId = exists[0].supervisor_teacher_id;

    // Validate new grade_id if provided
    if (grade_id !== undefined) {
      const [g] = await conn.execute(`SELECT id FROM grades WHERE id = ?`, [grade_id]);
      if (g.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'grade_id not found' });
      }
    }

    // Special check: if supervisor_teacher_id is being changed or set
    if (supervisor_teacher_id !== undefined) {
      if (supervisor_teacher_id === null) {
        // Allowing removal of supervisor → fine
      } else {
        // Validate teacher exists
        const [tRows] = await conn.execute(`SELECT id FROM teachers WHERE id = ?`, [supervisor_teacher_id]);
        if (tRows.length === 0) {
          await conn.rollback();
          return res.status(400).json({ error: 'supervisor_teacher_id not found' });
        }

        // Check if this teacher is already assigned to ANOTHER class (not this one)
        const [conflictingClass] = await conn.execute(
          `SELECT id, name FROM classes 
                     WHERE supervisor_teacher_id = ? AND id != ?`,
          [supervisor_teacher_id, id]
        );

        if (conflictingClass.length > 0) {
          await conn.rollback();
          return res.status(409).json({
            error: `This teacher is already supervising class "${conflictingClass[0].name}". A teacher can only supervise one class.`
          });
        }
      }
    }

    // Build update query
    const updates = [];
    const params = [];

    if (grade_id !== undefined) { updates.push('grade_id = ?'); params.push(grade_id); }
    if (name !== undefined) { updates.push('name = ?'); params.push(isNonEmptyString(name) ? name.trim() : null); }
    if (supervisor_teacher_id !== undefined) { updates.push('supervisor_teacher_id = ?'); params.push(supervisor_teacher_id || null); }
    if (room !== undefined) { updates.push('room = ?'); params.push(room || null); }
    if (capacity !== undefined) { updates.push('capacity = ?'); params.push(capacity || null); }

    if (updates.length > 0) {
      params.push(id);
      await conn.execute(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Fetch updated class
    const [rows] = await conn.execute(
      `SELECT c.*, g.name AS grade_name, 
                    t.id AS supervisor_teacher_id, 
                    u.id AS supervisor_user_id, 
                    u.name AS supervisor_name
             FROM classes c
             LEFT JOIN grades g ON g.id = c.grade_id
             LEFT JOIN teachers t ON t.id = c.supervisor_teacher_id
             LEFT JOIN users u ON u.id = t.user_id
             WHERE c.id = ?`,
      [id]
    );

    await conn.commit();
    return res.json({ class: rows[0] });

  } catch (err) {
    await conn.rollback();
    console.error('PUT /api/classes/:id error', err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Class name conflict in the same grade' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


// const UpdateClass = async (req, res) => {
//   const id = toInt(req.params.id);
//   if (!id) return res.status(400).json({ error: 'Invalid class id' });

//   console.log("Received body:", req.body);

//   const { grade_id, name, supervisor_teacher_id, room, capacity } = req.body || {};
//   if (grade_id === undefined && name === undefined && supervisor_teacher_id === undefined && room === undefined && capacity === undefined) {
//     return res.status(400).json({ error: 'At least one field is required' });
//   }

//   const conn = await db.getConnection();
//   try {
//     await conn.beginTransaction();

//     // Check exists
//     const [exists] = await conn.execute(`SELECT * FROM classes WHERE id = ? FOR UPDATE`, [id]);
//     if (exists.length === 0) {
//       await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Class not found' });
//     }

//     // If provided, validate grade
//     if (grade_id !== undefined) {
//       const [g] = await conn.execute(`SELECT id FROM grades WHERE id = ?`, [grade_id]);
//       if (g.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'grade_id not found' }); }
//     }

//     // If provided, validate supervisor teacher exists (or allow null)
//     if (supervisor_teacher_id !== undefined && supervisor_teacher_id !== null) {
//       const [tRows] = await conn.execute(`SELECT id FROM teachers WHERE id = ?`, [supervisor_teacher_id]);
//       if (tRows.length === 0) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'supervisor_teacher_id not found' }); }
//     }

//     const updates = [];
//     const params = [];

//     if (grade_id !== undefined) { updates.push('grade_id = ?'); params.push(grade_id); }
//     if (name !== undefined) { updates.push('name = ?'); params.push(isNonEmptyString(name) ? name.trim() : null); }
//     if (supervisor_teacher_id !== undefined) { updates.push('supervisor_teacher_id = ?'); params.push(supervisor_teacher_id || null); }
//     if (room !== undefined) { updates.push('room = ?'); params.push(room || null); }
//     if (capacity !== undefined) { updates.push('capacity = ?'); params.push(capacity || null); }

//     params.push(id);
//     await conn.execute(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`, params);

//     const [rows] = await conn.execute(
//       `SELECT c.*, g.name AS grade_name, t.id AS supervisor_teacher_id, u.id AS supervisor_user_id, u.name AS supervisor_name
//        FROM classes c
//        LEFT JOIN grades g ON g.id = c.grade_id
//        LEFT JOIN teachers t ON t.id = c.supervisor_teacher_id
//        LEFT JOIN users u ON u.id = t.user_id
//        WHERE c.id = ?`,
//       [id]
//     );

//     await conn.commit();
//     return res.json({ class: rows[0] });
//   } catch (err) {
//     await conn.rollback();
//     console.error('PUT /api/classes/:id error', err);
//     if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Class name conflict in the same grade' });
//     return res.status(500).json({ error: 'Internal server error' });
//   } finally {
//     conn.release();
//   }
// };


const DeleteClass = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid class id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // lock the row
    const [exists] = await conn.execute(`SELECT id FROM classes WHERE id = ? FOR UPDATE`, [id]);
    if (exists.length === 0) {
      await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Class not found' });
    }

    // attempt delete
    await conn.execute(`DELETE FROM classes WHERE id = ?`, [id]);
    await conn.commit();
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    await conn.rollback();;
    console.error('DELETE /api/classes/:id error', err);
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451)) {
      return res.status(409).json({ error: 'Class cannot be deleted because it is referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


module.exports = {
  AddClass,
  GetClass,
  UpdateClass,
  DeleteClass
};