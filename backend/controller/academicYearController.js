const db = require("../db");

const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));

const GetAcademicYears = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const sql = `
      SELECT * FROM academic_years WHERE name LIKE ? ORDER BY name DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await db.execute(sql, [q]);
    return res.json({ academic_years: rows });
  } catch (err) {
    console.error('GET /api/admin/get/academic-years error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const AddAcademicYear = async (req, res) => {
  const { name, status } = req.body;
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: "Academic year name is required" });
  }
  const conn = await db.getConnection();
  try {
    const [result] = await conn.execute(
      `INSERT INTO academic_years (name, status, created_at) VALUES (?, ?, NOW())`,
      [name.trim(), status || 'active']
    );
    const insertedId = result.insertId;
    const [rows] = await conn.execute(`SELECT * FROM academic_years WHERE id = ?`, [insertedId]);
    await conn.commit();
    return res.status(201).json({ academic_year: rows[0] });
  } catch (err) {
    console.error("POST /api/admin/add/academic-years error", err);
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Academic year already exists" });
    }
    await conn.rollback();
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
};

const UpdateAcademicYear = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const { name, status } = req.body;
  const conn = await db.getConnection();

  try {
    const updates = [];
    const params = [];

    if (isNonEmptyString(name)) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const [result] = await conn.execute(
      `UPDATE academic_years SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });

    const [rows] = await conn.execute(`SELECT * FROM academic_years WHERE id = ?`, [id]);
    await conn.commit();
    return res.json({ academic_year: rows[0] });
  } catch (err) {
    console.error('PUT /api/admin/update/academic-year/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Name conflicts with existing' });
    await conn.rollback();
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const DeleteAcademicYear = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const [result] = await db.execute(`DELETE FROM academic_years WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/admin/delete/academic-year/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  GetAcademicYears,
  AddAcademicYear,
  UpdateAcademicYear,
  DeleteAcademicYear
};
