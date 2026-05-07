const pool = require("../db");
const toInt = v => (v === undefined || v === null ? null : Number(v));
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;




/* =========================
   ROLES CRUD
   ========================= */

/**
 * POST /api/roles
 * Body: { role_name }
 */


const createRole = async (req, res) => {
    const { role_name } = req.body;
    if (!isNonEmptyString(role_name)) return res.status(400).json({ error: 'role_name is required' });

    try {
        const [r] = await pool.execute('INSERT INTO roles (role_name) VALUES (?)', [role_name.trim()]);
        const [rows] = await pool.execute('SELECT * FROM roles WHERE id = ?', [r.insertId]);
        return res.status(201).json({ role: rows[0] });
    } catch (err) {
        console.error('POST /api/roles error', err);
        if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Role already exists' });
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * GET /api/roles/:id
 */

const getRoles = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid role id' });
    try {
        const [rows] = await pool.execute('SELECT * FROM roles WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });
        return res.json({ role: rows[0] });
    } catch (err) {
        console.error('GET /api/roles/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// const getAllRoles = async (req, res) => {
//     try {
//         const [rows] = await pool.execute('SELECT * FROM roles');
//         if (rows.length === 0) return res.status(404).json({ error: 'Role not found' });
//         return res.json({ role: rows });
//     } catch (err) {
//         console.error('GET /api/roles error', err);
//         return res.status(500).json({ error: 'Internal server error' });
//     }
// }

const getAllRoles = async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    let limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 2000);
    let offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    // count total matching
    const [cntRows] = await pool.execute('SELECT COUNT(*) AS total FROM roles WHERE role_name LIKE ?', [q]);
    const total = (Array.isArray(cntRows) && cntRows[0]) ? Number(cntRows[0].total || 0) : 0;

    // fetch page
    const [rows] = await pool.execute(
      `SELECT * FROM roles WHERE role_name LIKE ? ORDER BY id ASC LIMIT ${limit} OFFSET ${offset}`,
      [q]
    );

    return res.json({ total, limit, offset, roles: rows });
  } catch (err) {
    console.error('GET /api/roles error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/roles/:id
 * Body: { role_name }
 */

const updateRole = async (req, res) => {
    const id = toInt(req.params.id);
    const { role_name } = req.body;
    if (!id) return res.status(400).json({ error: 'Invalid role id' });
    if (!isNonEmptyString(role_name)) return res.status(400).json({ error: 'role_name required' });

    try {
        await pool.execute('UPDATE roles SET role_name = ? WHERE id = ?', [role_name.trim(), id]);
        const [rows] = await pool.execute('SELECT * FROM roles WHERE id = ?', [id]);
        return res.json({ role: rows[0] });
    } catch (err) {
        console.error('PUT /api/roles/:id error', err);
        if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Role name conflict' });
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * DELETE /api/roles/:id
 */

const deleteRole = async (req, res) => {
    const id = toInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid role id' });
    try {
        const [result] = await pool.execute('DELETE FROM roles WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Role not found' });
        // cascade deletion of role_menus if you don't have FK ON DELETE CASCADE
        await pool.execute('DELETE FROM role_menus WHERE role_id = ?', [id]);
        return res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error('DELETE /api/roles/:id error', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
 

module.exports = {
    createRole,
    getRoles,
    updateRole,
    deleteRole,
    getAllRoles
};