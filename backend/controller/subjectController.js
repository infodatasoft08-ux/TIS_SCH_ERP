const db = require("../db");
const { deleteFromCloudinary } = require("../helper/cloudinaryHelper");
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;
const toInt = v => (v === undefined || v === null ? null : Number(v));



const AddSubjects = async (req, res) => {
  const { code, name, description } = req.body;
  if (!isNonEmptyString(name)) {

    return res.status(400).json({ error: 'Subject name is required' });
  }

  try {
    const image_url = req.file ? req.file.path : null;
    const [result] = await db.execute(
      `INSERT INTO subjects (code, name, description, image_url, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [code || null, name.trim(), description || null, image_url]
    );
    const [rows] = await db.execute(`SELECT * FROM subjects WHERE id = ?`, [
      result.insertId
    ]);
    return res.status(201).json({ subject: rows[0] });
  } catch (err) {
    if (image_url) await deleteFromCloudinary(image_url);
    console.error("POST /api/subjects error", err);
    if (err && err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Subject code or name already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};


const GetSubjects = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);

  // const conn = await db.getConnection();

  try {
    const sql = `
      SELECT * FROM subjects WHERE name LIKE ? OR code LIKE ? OR description LIKE ? ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}
    `;

    const [rows] = await db.execute(sql, [q, q, q]);
    // await conn.commit();
    return res.json({ subjects: rows, limit, offset });
  } catch (err) {
    console.error('GET /api/subjects error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


const UpdateSubjects = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid subject id' });

  const { code, name, description } = req.body;
  if (code === undefined && name === undefined && description === undefined && image_url === undefined && !req.file) {
    return res.status(400).json({ error: 'At least one field is required' });
  }
  const conn = await db.getConnection();

  try {
    const updates = [];
    const params = [];

    if (code !== undefined) { updates.push('code = ?'); params.push(code || null); }
    if (name !== undefined) { updates.push('name = ?'); params.push(isNonEmptyString(name) ? name.trim() : null); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    const image_url = req.body.image_url;
    if (req.file) {
      const [existing] = await conn.execute(`SELECT image_url FROM subjects WHERE id = ? FOR UPDATE`, [id]);
      if (existing[0] && existing[0].image_url) {
        await deleteFromCloudinary(existing[0].image_url);
      }
      updates.push('image_url = ?');
      params.push(req.file.path);
    } else if (image_url !== undefined) {
      if (image_url === null) {
        const [existing] = await conn.execute(`SELECT image_url FROM subjects WHERE id = ? FOR UPDATE`, [id]);
        if (existing[0] && existing[0].image_url) {
          await deleteFromCloudinary(existing[0].image_url);
        }
      }
      updates.push('image_url = ?');
      params.push(image_url || null);
    }

    params.push(id);
    const [result] = await conn.execute(
      `UPDATE subjects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Subject not found' });

    const [rows] = await conn.execute(`SELECT * FROM subjects WHERE id = ?`, [id]);
    await conn.commit();
    return res.json({ success: true, message: 'Subject Updated', subject: rows[0] });
  } catch (err) {
    console.error('PUT /api/subjects/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Subject code/name conflicts with existing' });
    await conn.rollback();
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const DeleteSubjects = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid subject id" });

  const conn = await db.getConnection();

  try {
    const [existing] = await conn.execute(`SELECT image_url FROM subjects WHERE id = ? FOR UPDATE`, [id]);
    const imageUrl = existing[0] ? existing[0].image_url : null;

    const [result] = await conn.execute(`DELETE FROM subjects WHERE id = ?`, [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Subject not found" });

    if (imageUrl) {
      await deleteFromCloudinary(imageUrl);
    }
    await conn.commit();
    return res.json({ success: true, message: `Subject ${result.name} Deleted`, deleted_id: id });
  } catch (err) {
    console.error("DELETE /api/subjects/:id error", err);
    if (err && (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451)) {
      return res
        .status(409)
        .json({
          error:
            "Subject cannot be deleted because it is referenced by other records"
        });
    }
    await conn.rollback();
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    conn.release();
  }
};

module.exports = {
  AddSubjects,
  GetSubjects,
  UpdateSubjects,
  DeleteSubjects
};