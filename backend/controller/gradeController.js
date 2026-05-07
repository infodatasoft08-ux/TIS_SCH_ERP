const db = require("../db");

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));



const GetGrades = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  // const conn = await db.getConnection();

  try {
    const sql = `
      SELECT * FROM grades WHERE name LIKE ? ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(sql, [q]);
    // const [rows] = await db.execute(
    //   `SELECT * FROM grades`);
    // await conn.commit();
    return res.json({ grades: rows, limit, offset });
  } catch (err) {
    console.error('GET /api/grades error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const AddGrades = async (req, res) => {
  const { name, description } = req.body;
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Grade name is required" });
  }
  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO grades (name, description, created_at) VALUES (?, ?, NOW())`,
      [name.trim(), description || null]
    );
    const insertedId = result.insertId;
    const [rows] = await conn.execute(`SELECT * FROM grades WHERE id = ?`, [
      insertedId
    ]);
    await conn.commit();
    return res.status(201).json({ grade: rows[0] });
  } catch (err) {
    console.error("POST /api/grades error", err);
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Grade with same name already exists" });
    }
    await conn.rollback();
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
};

const UpdateGrades = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid grade id' });

  const { name, description } = req.body;
  if (!isNonEmptyString(name) && description === undefined) {
    return res.status(400).json({ error: 'At least one field (name or description) is required' });
  }
  const conn = await db.getConnection();

  try {
    const updates = [];
    const params = [];

    if (isNonEmptyString(name)) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description || null);
    }

    params.push(id);
    const [result] = await conn.execute(
      `UPDATE grades SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Grade not found' });

    const [rows] = await conn.execute(`SELECT * FROM grades WHERE id = ?`, [id]);
    await conn.commit();
    return res.json({ grade: rows[0] });
  } catch (err) {
    console.error('PUT /api/grades/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Grade name conflicts with existing' });
    await conn.rollback();
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const DeleteGrades = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid grade id' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // optional: check existence
    const [exists] = await conn.execute(`SELECT id FROM grades WHERE id = ? FOR UPDATE`, [id]);
    if (exists.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Grade not found' });
    }

    // attempt delete
    await conn.execute(`DELETE FROM grades WHERE id = ?`, [id]);
    await conn.commit();
    conn.release();
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/grades/:id error', err);
    // foreign key prevents deletion
    if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED')) {
      return res.status(409).json({ error: 'Grade cannot be deleted because it is referenced by other records' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const AsignSubjectOnGrade = async (req, res) => {
  const gradeId = Number(req.params.id);
  const subjectIds = Array.isArray(req.body.subject_ids)
    ? [...new Set(req.body.subject_ids.map(Number).filter(Boolean))]
    : [];

  if (!gradeId) {
    return res.status(400).json({ error: 'Invalid grade id' });
  }
  if (subjectIds.length === 0) {
    return res.status(400).json({ error: 'subject_ids array required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure teacher exists
    const [grade] = await conn.execute(
      `SELECT id FROM grades WHERE id = ? FOR UPDATE`,
      [gradeId]
    );

    if (grade.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Grade not found' });
    }

    // Bulk insert – duplicates automatically ignored
    const values = subjectIds.map(() => '(?, ?)').join(', ');
    const params = [];
    subjectIds.forEach(sid => params.push(gradeId, sid));

    const [result] = await conn.execute(
      `INSERT IGNORE INTO grade_subjects (grade_id, subject_id)
       VALUES ${values}`,
      params
    );

    await conn.commit();

    return res.json({
      success: true,
      requested_subject_ids: subjectIds,
      newly_assigned_count: result.affectedRows
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const GetSubjectsByGrade = async (req, res) => {
  const gradeId = Number(req.params.id);
  if (!gradeId) return res.status(400).json({ error: 'Invalid grade id' });

  try {
    const [rows] = await db.execute(
      `SELECT s.* 
       FROM grade_subjects gs 
       JOIN subjects s ON s.id = gs.subject_id 
       WHERE gs.grade_id = ?`,
      [gradeId]
    );
    return res.json({ subjects: rows });
  } catch (err) {
    console.error('GET /api/grades/:id/subjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const RemoveSubjectFromGrade = async (req, res) => {
  const gradeId = Number(req.params.id);
  const subjectId = Number(req.params.subject_id);

  if (!gradeId || !subjectId) {
    return res.status(400).json({ error: 'Invalid grade_id or subject_id' });
  }

  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      `DELETE FROM grade_subjects WHERE grade_id = ? AND subject_id = ?`,
      [gradeId, subjectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    return res.json({ success: true, message: 'Subject removed from grade' });
  } catch (err) {
    console.error('DELETE /api/grades/:id/subjects/:subject_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

module.exports = {
  GetGrades,
  AddGrades,
  UpdateGrades,
  DeleteGrades,
  AsignSubjectOnGrade,
  GetSubjectsByGrade,
  RemoveSubjectFromGrade
};