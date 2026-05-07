const pool = require("../db");
const toInt = v => (v === undefined || v === null ? null : Number(v));
const isNonEmptyString = v => typeof v === 'string' && v.trim().length > 0;



const fetchMenusByRole = async (req, res) => {
  // const conn = await pool.getConnection();
  try {
    const role_id = req.user.role_id;
    // fetch only active menus (if you have is_active column)
    const [result] = await pool.execute(
      `SELECT m.id, m.key_name, m.title, m.icon, m.path, m.parent_id, m.actions
       FROM menus m
       JOIN role_menus rm ON rm.menu_id = m.id
       WHERE rm.role_id = ?
       ORDER BY COALESCE(m.parent_id, 0), m.id`,
      [role_id]
    );
    // await conn.commit();
    return res.json({ success: true, results: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}


/* =========================
   MENUS CRUD
   ========================= */

/**
 * POST /api/menus
 * Body: { key_name, title, icon?, path?, parent_id? }
 */

const createMenu = async (req, res) => {
  const { key_name, title, icon = null, path = null, parent_id = null } = req.body;
  if (!isNonEmptyString(key_name) || !isNonEmptyString(title)) return res.status(400).json({ error: 'key_name and title are required' });

  try {
    // if parent_id provided, validate it exists
    if (parent_id) {
      const [p] = await pool.execute('SELECT id FROM menus WHERE id = ?', [parent_id]);
      if (p.length === 0) return res.status(400).json({ error: 'parent_id not found' });
    }

    const [r] = await pool.execute(
      'INSERT INTO menus (key_name, title, icon, path, parent_id, actions) VALUES (?, ?, ?, ?, ?, ?)',
      [key_name.trim(), title.trim(), icon || null, path || null, parent_id || null, req.body.actions ? JSON.stringify(req.body.actions) : null]
    );
    const [rows] = await pool.execute('SELECT * FROM menus WHERE id = ?', [r.insertId]);
    return res.status(201).json({ menu: rows[0] });
  } catch (err) {
    console.error('POST /api/menus error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Menu key_name conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}


// async function adminOnly(req, res) {
//   const roleId = Number(req.params.role_id);
//   if (!roleId) return res.status(400).json({ message: "Invalid role_id" });
//   try {
//     const menuTree = await fetchMenusByRole(roleId);
//     res.json(menuTree);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// }


/**
 * GET /api/menus
 * Query: ?q&parent_id&limit&offset
 */

const getMenus = async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q}%` : '%';
    const parentId = req.query.parent_id ? Number(req.query.parent_id) : null;
    let limit = parseInt(req.query.limit || '500', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 500;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    const where = [];
    const params = [];

    if (parentId !== null) { where.push('parent_id = ?'); params.push(parentId); }
    where.push('(key_name LIKE ? OR title LIKE ? OR path LIKE ?)'); params.push(q, q, q);

    const baseSql = 'FROM menus';
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const [cnt] = await pool.execute(`SELECT COUNT(*) AS total ${baseSql} ${whereSql}`, params);
    const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

    const [rows] = await pool.execute(`SELECT * ${baseSql} ${whereSql} ORDER BY parent_id, id LIMIT ${limit} OFFSET ${offset}`, params);
    return res.json({ total, limit, offset, menus: rows });
  } catch (err) {
    console.error('GET /api/menus error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/menus/tree
 * Returns hierarchical menu tree (useful for frontend)
 */

const fetchMenuTree = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM menus ORDER BY parent_id, id');
    // build tree
    const map = {};
    rows.forEach(r => map[r.id] = { ...r, children: [] });
    const tree = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
      else tree.push(map[r.id]);
    });
    return res.json({ tree });
  } catch (err) {
    console.error('GET /api/menus/tree error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

}

/**
 * GET /api/menus/:id
 */

const fetchMenuById = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid menu id' });
  try {
    const [rows] = await pool.execute('SELECT * FROM menus WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Menu not found' });
    return res.json({ menu: rows[0] });
  } catch (err) {
    console.error('GET /api/menus/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * PUT /api/menus/:id
 * Body: { key_name?, title?, icon?, path?, parent_id? }
 */

const updateMenu = async (req, res) => {
  const id = toInt(req.params.id);
  const { key_name, title, icon, path, parent_id } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid menu id' });
  if (key_name === undefined && title === undefined && icon === undefined && path === undefined && parent_id === undefined) {
    return res.status(400).json({ error: 'At least one field required' });
  }

  try {
    if (parent_id !== undefined && parent_id !== null) {
      // validate parent exists and not self
      if (Number(parent_id) === Number(id)) return res.status(400).json({ error: 'parent_id cannot be same as id' });
      const [p] = await pool.execute('SELECT id FROM menus WHERE id = ?', [parent_id]);
      if (p.length === 0) return res.status(400).json({ error: 'parent_id not found' });
    }

    const updates = []; const params = [];
    if (key_name !== undefined) { updates.push('key_name = ?'); params.push(key_name ? key_name.trim() : null); }
    if (title !== undefined) { updates.push('title = ?'); params.push(title ? title.trim() : null); }
    if (icon !== undefined) { updates.push('icon = ?'); params.push(icon || null); }
    if (path !== undefined) { updates.push('path = ?'); params.push(path || null); }
    if (parent_id !== undefined) { updates.push('parent_id = ?'); params.push(parent_id || null); }
    if (req.body.actions !== undefined) { 
        updates.push('actions = ?'); 
        params.push(req.body.actions ? JSON.stringify(req.body.actions) : null); 
    }

    params.push(id);
    await pool.execute(`UPDATE menus SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.execute('SELECT * FROM menus WHERE id = ?', [id]);
    return res.json({ menu: rows[0] });
  } catch (err) {
    console.error('PUT /api/menus/:id error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Menu key_name conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * DELETE /api/menus/:id
 * Note: if menu has children, optionally refuse; currently deletes children cascade manually.
 */

const deleteMenu = async (req, res) => {
  const id = toInt(req.params.id);
  const cascade = req.query.cascade === '1' || req.query.cascade === 'true';
  if (!id) return res.status(400).json({ error: 'Invalid menu id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // check exists
    const [mrows] = await conn.execute('SELECT id FROM menus WHERE id = ? FOR UPDATE', [id]);
    if (mrows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Menu not found' }); }

    // check children
    const [children] = await conn.execute('SELECT id FROM menus WHERE parent_id = ?', [id]);
    if (children.length > 0 && !cascade) { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Menu has children; use ?cascade=1 to delete recursively' }); }

    if (cascade) {
      // gather descendant ids (simple loop)
      const [all] = await conn.execute('SELECT id, parent_id FROM menus');
      const map = {}; all.forEach(r => map[r.id] = r.parent_id);
      const toDelete = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const [mid, pid] of Object.entries(map)) {
          if (!toDelete.has(Number(mid)) && pid !== null && toDelete.has(Number(pid))) {
            toDelete.add(Number(mid)); changed = true;
          }
        }
      }
      const ids = Array.from(toDelete);
      await conn.execute(`DELETE FROM role_menus WHERE menu_id IN (${ids.map(()=>'?').join(',')})`, ids);
      await conn.execute(`DELETE FROM menus WHERE id IN (${ids.map(()=>'?').join(',')})`, ids);
    } else {
      // delete only this menu (role_menus cleaned)
      await conn.execute('DELETE FROM role_menus WHERE menu_id = ?', [id]);
      await conn.execute('DELETE FROM menus WHERE id = ?', [id]);
    }

    await conn.commit();
    return res.json({ success: true, deleted_id: id, cascade });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE /api/menus/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}


/* =========================
   ROLE <-> MENU ASSIGNMENTS
   ========================= */

/**
 * POST /api/roles/:role_id/menus
 * Body: { menu_ids: [1,2,3], replace?: boolean }
 * - If replace=true: remove existing role_menus for the role and insert the new set (transactional)
 * - Otherwise: insert any new role_menu rows (ignore duplicates)
 */

const assignMenusToRole = async (req, res) => {
  const roleId = toInt(req.params.role_id);
  const menu_ids = Array.isArray(req.body.menu_ids) ? req.body.menu_ids.map(v => Number(v)) : [];
  const replace = req.body.replace === true || req.query.replace === '1' || req.query.replace === 'true';

  if (!roleId) return res.status(400).json({ error: 'Invalid role id' });
  if (menu_ids.length === 0) return res.status(400).json({ error: 'menu_ids array required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // validate role exists
    const [rrows] = await conn.execute('SELECT id FROM roles WHERE id = ? FOR UPDATE', [roleId]);
    if (rrows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Role not found' }); }

    // validate menu ids
    const [mrows] = await conn.execute(`SELECT id FROM menus WHERE id IN (${menu_ids.map(()=>'?').join(',')})`, menu_ids);
    const foundIds = mrows.map(r=>r.id);
    const missing = menu_ids.filter(id => !foundIds.includes(id));
    if (missing.length) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Some menus not found', missing }); }

    if (replace) {
      // delete existing for role
      await conn.execute('DELETE FROM role_menus WHERE role_id = ?', [roleId]);
    }

    // insert new assignments using INSERT IGNORE or ON DUPLICATE KEY UPDATE
    // MySQL: use INSERT IGNORE to skip duplicates (requires unique PK defined)
    const values = menu_ids.map(()=> '(?, ?)').join(',');
    const params = [];
    menu_ids.forEach(mid => { params.push(roleId, mid); });
    await conn.execute(`INSERT IGNORE INTO role_menus (role_id, menu_id) VALUES ${values}`, params);

    // return assigned menus for role
    const [assigned] = await pool.execute(
      `SELECT m.* FROM menus m JOIN role_menus rm ON rm.menu_id = m.id WHERE rm.role_id = ? ORDER BY m.parent_id, m.id`,
      [roleId]
    );
    await conn.commit();
    return res.json({ role_id: roleId, menus: assigned });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/roles/:role_id/menus error', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}


/**
 * GET /api/roles/:role_id/menus
 * Returns menus assigned to role (flat list)
 */

const getAssignRoleMenus = async (req, res) => {
  const roleId = toInt(req.params.role_id);
  if (!roleId) return res.status(400).json({ error: 'Invalid role id' });
  try {
    const [rows] = await pool.execute(
      `SELECT m.* FROM menus m JOIN role_menus rm ON rm.menu_id = m.id WHERE rm.role_id = ? ORDER BY m.parent_id, m.id`,
      [roleId]
    );
    return res.json({ role_id: roleId, menus: rows });
  } catch (err) {
    console.error('GET /api/roles/:role_id/menus error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/roles/:role_id/menus/tree
 * Returns assigned menus arranged in tree structure
 */

const getAssignRoleMenusTree = async (req, res) => {
  const roleId = toInt(req.params.role_id);
  if (!roleId) return res.status(400).json({ error: 'Invalid role id' });
  try {
    const [rows] = await pool.execute(
      `SELECT m.* FROM menus m JOIN role_menus rm ON rm.menu_id = m.id WHERE rm.role_id = ? ORDER BY m.parent_id, m.id`,
      [roleId]
    );
    const map = {};
    rows.forEach(r => map[r.id] = { ...r, children: [] });
    const tree = [];
    rows.forEach(r => {
      if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
      else tree.push(map[r.id]);
    });
    return res.json({ role_id: roleId, tree });
  } catch (err) {
    console.error('GET /api/roles/:role_id/menus/tree error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * DELETE /api/roles/:role_id/menus/:menu_id
 * Remove a specific menu assignment for a role
 */

const removeMenuFromRole = async (req, res) => {
  const roleId = toInt(req.params.role_id);
  const menuId = toInt(req.params.menu_id);
  if (!roleId || !menuId) return res.status(400).json({ error: 'Invalid role id or menu id' });

  try {
    const [result] = await pool.execute('DELETE FROM role_menus WHERE role_id = ? AND menu_id = ?', [roleId, menuId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true, role_id: roleId, menu_id: menuId });
  } catch (err) {
    console.error('DELETE /api/roles/:role_id/menus/:menu_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/menus/:menu_id/roles
 * Returns role ids (or role rows) that have access to menu
 */

const getRolesForMenus = async (req, res) => {
  const menuId = toInt(req.params.menu_id);
  if (!menuId) return res.status(400).json({ error: 'Invalid menu id' });
  try {
    const [rows] = await pool.execute(
      `SELECT r.* FROM roles r JOIN role_menus rm ON rm.role_id = r.id WHERE rm.menu_id = ? ORDER BY r.id`,
      [menuId]
    );
    return res.json({ menu_id: menuId, roles: rows });
  } catch (err) {
    console.error('GET /api/menus/:menu_id/roles error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



module.exports = {
    fetchMenusByRole,
    createMenu,
    getMenus,
    fetchMenuTree,
    fetchMenuById,
    updateMenu,
    deleteMenu,
    assignMenusToRole,
    getAssignRoleMenus,
    getAssignRoleMenusTree,
    removeMenuFromRole,
    getRolesForMenus
    // adminOnly
};