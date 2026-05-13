const pool = require('../db');
const { generateInvoicePDF, generatePaymentReceiptPDF, generateCombinedInvoiceReceiptPDF, generateBulkInvoicesPDF } = require('../helper/pdfHelper');
const whatsappQueue = require('../queues/whatsappQueue');

const toInt = v => (v === undefined || v === null ? null : Number(v));
const isDateString = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);


/**
 * POST /api/fees/types
 * Body: { code?, name, description? }
 */

const createFeeType = async (req, res) => {
  const { code, name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO fee_types (code, name, description, created_at) VALUES (?, ?, ?, NOW())`,
      [code || null, name.trim(), description || null]
    );
    const [rows] = await pool.execute('SELECT * FROM fee_types WHERE id = ?', [result.insertId]);
    return res.status(201).json({ fee_type: rows[0] });
  } catch (err) {
    console.error('POST /api/fees/types error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Duplicate fee type code' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/fees/types
 * Query: ?q&limit&offset
 */

const GetFeeTypes = async (req, res) => {
  const q = req.query.q ? `%${req.query.q}%` : '%';
  let limit = parseInt(req.query.limit || '200', 10);
  let offset = parseInt(req.query.offset || '0', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 200;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  limit = Math.min(limit, 2000);

  try {
    const countSql = `SELECT COUNT(*) AS total FROM fee_types WHERE name LIKE ? OR code LIKE ?`;
    const [cnt] = await pool.execute(countSql, [q, q]);
    const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

    const [rows] = await pool.execute(
      `SELECT * FROM fee_types WHERE name LIKE ? OR code LIKE ? ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
      [q, q]
    );
    return res.json({ total, fee_types: rows, limit, offset });
  } catch (err) {
    console.error('GET /api/fees/types error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * GET /api/fees/types/:id
 */

const GetFeeTypeById = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [rows] = await pool.execute('SELECT * FROM fee_types WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Fee type not found' });
    return res.json({ fee_type: rows[0] });
  } catch (err) {
    console.error('GET /api/fees/types/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/fees/types/:id
 * Body: { code?, name?, description? }
 */

const UpdateFeeType = async (req, res) => {
  const id = toInt(req.params.id);
  const { code, name, description } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (code === undefined && name === undefined && description === undefined) return res.status(400).json({ error: 'At least one field required' });

  try {
    const updates = []; const params = [];
    if (code !== undefined) { updates.push('code = ?'); params.push(code || null); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name || null); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description || null); }
    params.push(id);
    await pool.execute(`UPDATE fee_types SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.execute('SELECT * FROM fee_types WHERE id = ?', [id]);
    return res.json({ fee_type: rows[0] });
  } catch (err) {
    console.error('PUT /api/fees/types/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



/**
 * DELETE /api/fees/types/:id
 */

const DeleteFeeType = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [result] = await pool.execute('DELETE FROM fee_types WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Fee type not found' });
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('DELETE /api/fees/types/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/** ----------------------
 * CLASS FEE STRUCTURE
 * ---------------------- */

/**
 * POST /api/fees/class-structure
 * Body: { class_id, fee_type_id, monthly_amount }
 */


const CreateClassFeeStructure = async (req, res) => {
  const { grade_id, fee_type_id, monthly_amount } = req.body;
  if (!grade_id || !fee_type_id || monthly_amount === undefined) return res.status(400).json({ error: 'grade_id, fee_type_id, monthly_amount required' });

  const feeTypeIds = Array.isArray(fee_type_id) ? fee_type_id : [fee_type_id];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];
    for (const ftid of feeTypeIds) {
      const [ins] = await conn.execute(
        `INSERT INTO class_fee_structure (grade_id, fee_type_id, monthly_amount, created_at)
              VALUES (?, ?, ?, NOW())`,
        [grade_id, ftid, Number(monthly_amount)]
      );
      results.push(ins.insertId);
    }

    await conn.commit();

    const [rows] = await pool.execute('SELECT * FROM class_fee_structure WHERE grade_id = ?', [grade_id]);
    return res.status(201).json({ class_fees: rows });
  } catch (err) {
    await conn.rollback();
    console.error('POST /api/fees/class-structure error', err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Structure already exists for this class and fee type' });
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
}



/**
 * GET /api/fees/class-structure?class_id=#
 */

const GetClassFeeStructure = async (req, res) => {
  const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
  let limit = parseInt(req.query.limit || '200', 10);
  let offset = parseInt(req.query.offset || '0', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 200;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  limit = Math.min(limit, 2000);

  try {
    if (gradeId) {
      const countSql = `SELECT COUNT(*) AS total FROM class_fee_structure cfs JOIN fee_types ft ON ft.id = cfs.fee_type_id WHERE cfs.grade_id = ?`;
      const [cnt] = await pool.execute(countSql, [gradeId]);
      const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

      const [rows] = await pool.execute(
        `SELECT cfs.*, ft.code AS fee_code, ft.name AS fee_name
            FROM class_fee_structure cfs
            JOIN fee_types ft ON ft.id = cfs.fee_type_id
            WHERE cfs.grade_id = ?
            ORDER BY ft.name
            LIMIT ${limit} OFFSET ${offset}
            `,
        [gradeId]
      );
      return res.json({ total, limit, offset, grade_id: gradeId, fee_structure: rows });
    } else {
      const countSql = `SELECT COUNT(*) AS total FROM class_fee_structure cfs JOIN fee_types ft ON ft.id = cfs.fee_type_id`;
      const [cnt] = await pool.execute(countSql);
      const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

      const [rows] = await pool.execute(
        `SELECT cfs.*, ft.code AS fee_code, ft.name AS fee_name
            FROM class_fee_structure cfs
            JOIN fee_types ft ON ft.id = cfs.fee_type_id
            ORDER BY cfs.grade_id, ft.name
            LIMIT ${limit} OFFSET ${offset}
            `
      );
      return res.json({ total, limit, offset, fee_structure: rows });
    }
  } catch (err) {
    console.error('GET /api/fees/class-structure error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * PUT /api/fees/class-structure/:id
 * Body: { monthly_amount? }
 */


const UpdateClassFeeStructure = async (req, res) => {
  const id = toInt(req.params.id);
  const { monthly_amount } = req.body;
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (monthly_amount === undefined) return res.status(400).json({ error: 'monthly_amount required' });

  try {
    await pool.execute('UPDATE class_fee_structure SET monthly_amount = ? WHERE id = ?', [Number(monthly_amount), id]);
    const [rows] = await pool.execute('SELECT * FROM class_fee_structure WHERE id = ?', [id]);
    return res.json({ class_fee: rows[0] });
  } catch (err) {
    console.error('PUT /api/fees/class-structure/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/**
 * DELETE /api/fees/class-structure/:id
 */


const DeleteClassFeeStructure = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [result] = await pool.execute('DELETE FROM class_fee_structure WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('DELETE /api/fees/class-structure/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/** ----------------------
 * INVOICE GENERATION / MANAGEMENT
 * ---------------------- */

/**
 * Helper: compute invoice lines and total for a class for months_count
 * Returns { lines: [{ fee_type_id, monthly_amount, months, amount }], total }
 */

async function computeInvoiceLinesForClass(conn, grade_id, months_count = 1, fee_type_ids = null) {
  // fetch class fee structure
  let sql = `SELECT cfs.fee_type_id, cfs.monthly_amount, ft.name AS fee_name, ft.code AS fee_code
        FROM class_fee_structure cfs
        JOIN fee_types ft ON ft.id = cfs.fee_type_id
        WHERE cfs.grade_id = ?`;

  const params = [grade_id];

  if (Array.isArray(fee_type_ids) && fee_type_ids.length > 0) {
    const placeholders = fee_type_ids.map(() => "?").join(",");
    sql += ` AND cfs.fee_type_id IN (${placeholders})`;
    params.push(...fee_type_ids);
  }

  const [rows] = await conn.execute(sql, params);

  const lines = rows.map(r => {
    const months = Number(months_count);
    const amount = Number(r.monthly_amount) * months;
    return {
      fee_type_id: r.fee_type_id,
      fee_name: r.fee_name,
      fee_code: r.fee_code,
      monthly_amount: Number(r.monthly_amount),
      months,
      amount: Number(amount.toFixed(2))
    };
  });

  // console.log(lines);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  // console.log(total);
  return { lines, total: Number(total.toFixed(2)) };
}

/**
 * POST /api/fees/generate-invoice
 * Body:
 * {
 *   student_id, months_count (1..4), period_start (YYYY-MM-DD) optional
 * }
 *
 * Generates invoice lines based on student's class_fee_structure and creates student_invoices + invoice_lines.
 */

const CreateInvoice = async (req, res) => {
  const { student_id, months_count = 1, period_start, is_auto_generate = false } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id required' });
  const months = Math.max(1, Math.min(12, Number(months_count) || 1));

  // default period_start = today
  const start = period_start && isDateString(period_start) ? period_start : (new Date()).toISOString().slice(0, 10);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // fetch student and class (latest academic record)
    const [arRows] = await conn.execute(
      `SELECT ar.id AS academic_id, ar.class_id, ar.student_id, ar.grade_id
             FROM student_academic_records ar
             WHERE ar.student_id = ?
             ORDER BY ar.academic_year_id DESC, ar.id DESC LIMIT 1
             FOR UPDATE`,
      [student_id]
    );

    if (arRows.length === 0) {
      // Check if student exists at all
      const [srows] = await conn.execute('SELECT id FROM students WHERE id = ?', [student_id]);
      if (srows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Student not found' }); }
      // Student exists but no academic record?
      await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Student has no academic record/class assigned' });
    }

    const classId = arRows[0].class_id;
    const gradeId = arRows[0].grade_id;
    const academicId = arRows[0].academic_id;
    if (!classId) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Student has no class assigned' }); }
    if (!gradeId) { await conn.rollback(); conn.release(); return res.status(400).json({ error: 'Student has no grade assigned' }); }

    // compute invoice lines
    const { lines, total } = await computeInvoiceLinesForClass(conn, gradeId, months);

    if (!lines || lines.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'No fee structure or fee types found for this class' });
    }

    // compute period_end by adding months_count months to start (approx: set to last day of last month)
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1); // end is day before same day next months_count
    const period_end = endDate.toISOString().slice(0, 10);

    // Carry forward logic
    // const [prevInvoices] = await conn.execute(
    //   `SELECT id, amount_due, amount_paid, period_start FROM student_invoices 
    //    WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
    //   [student_id]
    // );

    const [prevInvoices] = await conn.execute(
      `SELECT id, amount_due, amount_paid, period_start, period_end FROM student_invoices 
       WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
      [student_id]
    );

    // let prev_payment_dues = 0;
    // let prev_fine_dues = 0;
    // let prev_months = [];

    let carried_fines = [];
    let total_carried_amount = 0;

    // for (const pinv of prevInvoices) {
    //   const bal = Math.max(0, Number(pinv.amount_due) - Number(pinv.amount_paid));
    //   if (bal > 0) {
    //     const [fRows] = await conn.execute(`SELECT amount FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0 AND fine_type NOT LIKE 'previous_%'`, [pinv.id]);
    //     const totalFines = fRows.reduce((acc, f) => acc + Number(f.amount), 0);

    //     const unpaidFines = Math.min(bal, totalFines);
    //     const unpaidFees = bal - unpaidFines;

    //     prev_fine_dues += unpaidFines;
    //     prev_payment_dues += unpaidFees;

    //     const pinvDate = new Date(pinv.period_start);
    //     const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' });
    //     if (!prev_months.includes(monthName)) {
    //        prev_months.push(monthName);
    //     }
    //   }
    // }

    for (const pinv of prevInvoices) {
      const balance = Number(pinv.amount_due) - Number(pinv.amount_paid);
      if (balance <= 0) continue;

      // Mark the invoice as carried forward
      await conn.execute(
        `UPDATE student_invoices SET status = 'carried_forward' WHERE id = ?`,
        [pinv.id]
      );

      // Fetch all non-reversed fines for this invoice
      const [fines] = await conn.execute(
        `SELECT fine_type, description, amount FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0`,
        [pinv.id]
      );

      const totalFinesAmount = fines.reduce((acc, f) => acc + Number(f.amount), 0);
      const baseAmount = Number(pinv.amount_due) - totalFinesAmount;

      let remainingPaid = Number(pinv.amount_paid);

      // We will allocate remainingPaid in this order:
      // 1. Existing previous_dues/previous_fines (FIFO)
      // 2. Regular fines
      // 3. Base fees

      const prevFines = fines.filter(f => f.fine_type.startsWith('previous_'));
      const regFines = fines.filter(f => !f.fine_type.startsWith('previous_'));

      // 1. Process previous carry-forwards
      for (const f of prevFines) {
        const amt = Number(f.amount);
        const paid = Math.min(remainingPaid, amt);
        remainingPaid -= paid;
        const unpaid = amt - paid;
        if (unpaid > 0) {
          carried_fines.push({
            type: f.fine_type,
            description: f.description,
            amount: unpaid
          });
          total_carried_amount += unpaid;
        }
      }

      // 2. Process regular fines of this invoice
      let unpaidRegFines = 0;
      for (const f of regFines) {
        const amt = Number(f.amount);
        const paid = Math.min(remainingPaid, amt);
        remainingPaid -= paid;
        unpaidRegFines += (amt - paid);
      }

      if (unpaidRegFines > 0) {
        const pinvDate = new Date(pinv.period_start);
        const pinvEndDate = new Date(pinv.period_end);
        const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' });
        const monthNameEnd = pinvEndDate.toLocaleString('en-IN', { month: 'long' });
        const periodStr = monthName === monthNameEnd ? monthName : `${monthName}-${monthNameEnd}`;

        carried_fines.push({
          type: 'previous_fines',
          description: `Previous Fine Dues (${periodStr})`,
          amount: unpaidRegFines
        });
        total_carried_amount += unpaidRegFines;
      }

      // 3. Process base fees
      const unpaidBase = baseAmount - remainingPaid;
      if (unpaidBase > 0) {
        const pinvDate = new Date(pinv.period_start);
        const pinvEndDate = new Date(pinv.period_end);
        const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' }).toLowerCase();
        const monthNameEnd = pinvEndDate.toLocaleString('en-IN', { month: 'long' }).toLowerCase();
        const periodStr = monthName === monthNameEnd ? monthName : `${monthName}-${monthNameEnd}`;

        carried_fines.push({
          type: 'previous_dues',
          description: `Payment Dues (${periodStr})`,
          amount: unpaidBase
        });
        total_carried_amount += unpaidBase;
      }
    }

    // const totalAmountDue = total + prev_payment_dues + prev_fine_dues;
    const totalAmountDue = total + total_carried_amount;

    // create invoice
    const [inv] = await conn.execute(
      `INSERT INTO student_invoices (student_id, student_academic_id, class_id, grade_id, period_start, period_end, months_count, amount_due, amount_paid, status, is_auto_generate, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'pending', ?, NOW())`,
      [student_id, academicId, classId, gradeId, start, period_end, months, totalAmountDue, is_auto_generate ? 1 : 0]
    );
    const invoiceId = inv.insertId;

    // insert invoice_lines
    if (lines.length > 0) {
      const vals = lines.map(() => '( ?, ?, ?)').join(', ');
      const params = [];
      lines.forEach(l => { params.push(invoiceId, l.fee_type_id, l.amount); });
      await conn.execute(`INSERT INTO invoice_lines ( invoice_id, fee_type_id, amount) VALUES ${vals}`, params);
    }

    // const monthStr = prev_months.length > 0 ? ` (${prev_months.join(', ')})` : '';

    // if (prev_payment_dues > 0) {
    //   await conn.execute(
    //     `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
    //     [invoiceId, 'previous_dues', `Previous Payment Dues${monthStr}`, prev_payment_dues]
    //   );
    // }
    // if (prev_fine_dues > 0) {
    //   await conn.execute(
    //     `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
    //     [invoiceId, 'previous_fines', `Previous Fine Dues${monthStr}`, prev_fine_dues]
    //   );
    // }

    for (const cf of carried_fines) {
      await conn.execute(
        `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
        [invoiceId, cf.type, cf.description, cf.amount]
      );
    }

    await conn.commit();
    conn.release();

    // return invoice with lines
    const [invoiceRows] = await pool.execute('SELECT * FROM student_invoices WHERE id = ?', [invoiceId]);
    const [linesRows] = await pool.execute(
      `SELECT il.*, ft.name AS fee_name, ft.code AS fee_code
            FROM invoice_lines il JOIN fee_types ft ON ft.id = il.fee_type_id
            WHERE il.invoice_id = ?`,
      [invoiceId]
    );
    return res.status(201).json({ invoice: invoiceRows[0], lines: linesRows });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/fees/generate-invoice error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



const CreateBulkInvoices = async (req, res) => {
  const { class_id, student_ids, months_count = 1, period_start, fee_type_ids, is_auto_generate = false } = req.body;

  // console.log(req.body);

  if (!class_id || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: "class_id and student_ids required" });
  }

  const months = Math.max(1, Math.min(12, Number(months_count)));

  const start =
    period_start && isDateString(period_start)
      ? period_start
      : new Date().toISOString().slice(0, 10);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Get students of class from academic records
    // ...
    const placeholders = student_ids.map(() => "?").join(",");
    const [students] = await conn.execute(
      `SELECT DISTINCT sar.student_id as id, sar.id as academic_id, sar.grade_id, sar.class_id
       FROM student_academic_records sar
       WHERE sar.student_id IN (${placeholders})`,
      [...student_ids]
    );

    if (students.length === 0) {
      throw new Error("No valid students found");
    }

    // Compute invoice template once
    const { lines, total } = await computeInvoiceLinesForClass(
      conn,
      students[0].grade_id,
      months,
      fee_type_ids
    );

    if (!lines || lines.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'No fee structure or fee types found for this class' });
    }

    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1);
    const period_end = endDate.toISOString().slice(0, 10);

    // Create invoices
    // for (const s of students) {
    //   // Carry forward logic for this student
    //   const [prevInvoices] = await conn.execute(
    //     `SELECT id, amount_due, amount_paid, period_start FROM student_invoices 
    //      WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
    //     [s.id]
    //   );

    //   let prev_payment_dues = 0;
    //   let prev_fine_dues = 0;
    //   let prev_months = [];

    //   for (const pinv of prevInvoices) {
    //     const bal = Math.max(0, Number(pinv.amount_due) - Number(pinv.amount_paid));
    //     if (bal > 0) {
    //       const [fRows] = await conn.execute(`SELECT amount FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0 AND fine_type NOT LIKE 'previous_%'`, [pinv.id]);
    //       const totalFines = fRows.reduce((acc, f) => acc + Number(f.amount), 0);

    //       const unpaidFines = Math.min(bal, totalFines);
    //       const unpaidFees = bal - unpaidFines;

    //       prev_fine_dues += unpaidFines;
    //       prev_payment_dues += unpaidFees;

    //       const pinvDate = new Date(pinv.period_start);
    //       const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' });
    //       if (!prev_months.includes(monthName)) {
    //         prev_months.push(monthName);
    //       }
    //     }
    //   }

    //   const totalAmountDue = total + prev_payment_dues + prev_fine_dues;

    //   const [inv] = await conn.execute(
    //     `INSERT INTO student_invoices
    //     (student_id, student_academic_id, class_id, grade_id, period_start, period_end, months_count, amount_due, amount_paid, status, is_auto_generate, created_at)
    //     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'pending', ?, NOW())`,
    //     [s.id, s.academic_id, s.class_id, s.grade_id, start, period_end, months, totalAmountDue, is_auto_generate ? 1 : 0]
    //   );

    //   if (lines.length) {
    //     const vals = lines.map(() => "(?, ?, ?)").join(",");
    //     const params = [];
    //     lines.forEach(l =>
    //       params.push(inv.insertId, l.fee_type_id, l.amount)
    //     );

    //     await conn.execute(
    //       `INSERT INTO invoice_lines (invoice_id, fee_type_id, amount)
    //        VALUES ${vals}`,
    //       params
    //     );
    //   }

    //   const monthStr = prev_months.length > 0 ? ` (${prev_months.join(', ')})` : '';

    //   if (prev_payment_dues > 0) {
    //     await conn.execute(
    //       `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
    //       [inv.insertId, 'previous_dues', `Previous Payment Dues${monthStr}`, prev_payment_dues]
    //     );
    //   }
    //   if (prev_fine_dues > 0) {
    //     await conn.execute(
    //       `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
    //       [inv.insertId, 'previous_fines', `Previous Fine Dues${monthStr}`, prev_fine_dues]
    //     );
    //   }
    // }

    for (const s of students) {
      // Carry forward logic for this student
      const [prevInvoices] = await conn.execute(
        `SELECT id, amount_due, amount_paid, period_start, period_end FROM student_invoices 
         WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
        [s.id]
      );

      let carried_fines = [];
      let total_carried_amount = 0;

      for (const pinv of prevInvoices) {
        const balance = Number(pinv.amount_due) - Number(pinv.amount_paid);
        if (balance <= 0) continue;

        // Mark the invoice as carried forward
        await conn.execute(
          `UPDATE student_invoices SET status = 'carried_forward' WHERE id = ?`,
          [pinv.id]
        );

        // Fetch all non-reversed fines for this invoice
        const [fines] = await conn.execute(
          `SELECT fine_type, description, amount FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0`,
          [pinv.id]
        );

        const totalFinesAmount = fines.reduce((acc, f) => acc + Number(f.amount), 0);
        const baseAmount = Number(pinv.amount_due) - totalFinesAmount;

        let remainingPaid = Number(pinv.amount_paid);

        const prevFines = fines.filter(f => f.fine_type.startsWith('previous_'));
        const regFines = fines.filter(f => !f.fine_type.startsWith('previous_'));

        // 1. Process previous carry-forwards
        for (const f of prevFines) {
          const amt = Number(f.amount);
          const paid = Math.min(remainingPaid, amt);
          remainingPaid -= paid;
          const unpaid = amt - paid;
          if (unpaid > 0) {
            carried_fines.push({
              type: f.fine_type,
              description: f.description,
              amount: unpaid
            });
            total_carried_amount += unpaid;
          }
        }

        // 2. Process regular fines
        let unpaidRegFines = 0;
        for (const f of regFines) {
          const amt = Number(f.amount);
          const paid = Math.min(remainingPaid, amt);
          remainingPaid -= paid;
          unpaidRegFines += (amt - paid);
        }

        if (unpaidRegFines > 0) {
          const pinvDate = new Date(pinv.period_start);
          const pinvEndDate = new Date(pinv.period_end);
          const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' });
          const monthNameEnd = pinvEndDate.toLocaleString('en-IN', { month: 'long' });
          const periodStr = monthName === monthNameEnd ? monthName : `${monthName}-${monthNameEnd}`;

          carried_fines.push({
            type: 'previous_fines',
            description: `Previous Fine Dues (${periodStr})`,
            amount: unpaidRegFines
          });
          total_carried_amount += unpaidRegFines;
        }

        // 3. Process base fees
        const unpaidBase = baseAmount - remainingPaid;
        if (unpaidBase > 0) {
          const pinvDate = new Date(pinv.period_start);
          const pinvEndDate = new Date(pinv.period_end);
          const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' }).toLowerCase();
          const monthNameEnd = pinvEndDate.toLocaleString('en-IN', { month: 'long' }).toLowerCase();
          const periodStr = monthName === monthNameEnd ? monthName : `${monthName}-${monthNameEnd}`;

          carried_fines.push({
            type: 'previous_dues',
            description: `Payment Dues (${periodStr})`,
            amount: unpaidBase
          });
          total_carried_amount += unpaidBase;
        }
      }

      const totalAmountDue = total + total_carried_amount;

      const [inv] = await conn.execute(
        `INSERT INTO student_invoices
        (student_id, student_academic_id, class_id, grade_id, period_start, period_end, months_count, amount_due, amount_paid, status, is_auto_generate, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'pending', ?, NOW())`,
        [s.id, s.academic_id, s.class_id, s.grade_id, start, period_end, months, totalAmountDue, is_auto_generate ? 1 : 0]
      );

      if (lines.length) {
        const vals = lines.map(() => "(?, ?, ?)").join(",");
        const params = [];
        lines.forEach(l =>
          params.push(inv.insertId, l.fee_type_id, l.amount)
        );

        await conn.execute(
          `INSERT INTO invoice_lines (invoice_id, fee_type_id, amount)
           VALUES ${vals}`,
          params
        );
      }

      // Insert carried forward fines
      for (const cf of carried_fines) {
        await conn.execute(
          `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
          [inv.insertId, cf.type, cf.description, cf.amount]
        );
      }
    }

    const options = { month: 'short', timeZone: 'Asia/Kolkata' };
    const startMonth = new Date(start).toLocaleString('en-IN', options);
    const endMonth = new Date(period_end).toLocaleString('en-IN', options);

    const period = `${startMonth}-${endMonth}`;

    // --- WHATSAPP NOTIFICATION ---
    try {

      // Get all students data
      const [studentDetails] = await conn.execute(`
        SELECT 
          s.id as student_id,
          u.name,
          u.phone as student_phone,
          s.parent_contact,
          s.mother_contect,
          s.fathers_name,
          s.mothers_name,
          ay.name as academic_year,
          si.amount_due as total_amount,
          si.id as invoice_id,
          si.period_start as start_date,
          si.period_end as end_date,
          c.name as class_name,
          g.name as grade_name
        FROM students s
        JOIN users u ON u.id = s.user_id
        JOIN student_academic_records sar ON sar.student_id = s.id
        JOIN academic_years ay ON ay.id = sar.academic_year_id
        LEFT JOIN student_invoices si ON si.student_id = s.id
        JOIN classes c ON c.id = s.class_id
        JOIN grades g ON g.id = s.grade_id
        WHERE s.id IN (${students.map(() => '?').join(',')})
      `, students.map(s => s.id));

      // Base URL
      const baseUrl =
        process.env.HOSTING_BACKEND_BASE_URL ||
        process.env.LOCAL_BACKEND_BASE_URL ||
        'http://localhost:5000';

      // Send message to every student
      for (const stu of studentDetails) {

        const studentId = stu.student_id;

        // Generate token per student
        const token = generatePublicToken(studentId);

        // Invoice Link
        const invoiceLink =
          `${baseUrl}/api/fee/public/invoice/${studentId}?token=${token}`;

        // Combined PDF Link
        // const combinedPdfLink =
        //   `${baseUrl}/api/fee/public/combined-pdf/${studentId}?token=${token}`;

        // Receipt Link
        // const receiptLink =
        //   `${baseUrl}/api/fee/public/receipt/${studentId}?token=${token}`;

        // All contacts
        const contacts = [
          stu.student_phone,
          stu.parent_contact
        ]
          .filter(Boolean)
          .map(num => num.trim());

        // Remove duplicate numbers
        const uniqueContacts = [...new Set(contacts)];

        // Send WhatsApp to all unique contacts
        for (const contact of uniqueContacts) {
          try {
            // Queue WhatsApp message instead of direct sending
            await whatsappQueue.add('feeInvoiceNotification', {
              contact,
              jobType: 'feeInvoiceNotification',
              message: {

                template: {
                  name: "fee_invoice_notification",
                  language: {
                    code: "en"
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: stu.fathers_name
                        },
                        {
                          type: "text",
                          text: stu.name
                        },
                        {
                          type: "text",
                          text: stu.academic_year
                        },
                        {
                          type: "text",
                          text: stu.grade_name
                        },
                        {
                          type: "text",
                          text: `INV-${stu.invoice_id}`
                        },
                        {
                          type: "text",
                          text: stu.total_amount
                        },
                        {
                          type: "text",
                          text: stu.end_date
                        },
                        {
                          type: "button",
                          text: "View Invoice",
                          url: invoiceLink
                        },
                        {
                          type: "text",
                          text: period
                        },
                        {
                          type: "text",
                          text: "COMMERCE MITHILESH COMMERCE",
                        }
                      ]
                    }
                  ]
                },

                // Fallback normal text
                fallbackText: `
                Dear ${stu.name},\n\n

                Your fee invoice for the academic year *${stu.academic_year}*\n
                for month(s) *${period}* has been generated successfully.\n\n

                📄 Invoice Download:\n
                ${invoiceLink}

                Thank you.
              `
              }
            });
          } catch (err) {
            console.error(`WhatsApp queue add failed for ${contact}`, err.message);
          }
        }
      }

    } catch (msgErr) {
      console.error('Fee generation notification error:', msgErr);
    }


    await conn.commit();
    return res.status(201).json({
      success: true,
      invoices_created: students.length
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};



const UpdateInvoiceWithFine = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const fine = Number(req.body.fine_amount);

  if (!Number.isFinite(fine) || fine < 0) {
    return res.status(400).json({ error: 'Invalid fine amount' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT amount_due, amount_paid, fine_amount
       FROM student_invoices
       WHERE id = ?
       FOR UPDATE`,
      [invoiceId]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const inv = rows[0];
    const baseAmount = inv.amount_due - inv.fine_amount;
    const newAmountDue = baseAmount + fine;

    if (inv.amount_paid > newAmountDue) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Paid amount exceeds updated invoice total'
      });
    }

    let status = 'pending';
    if (inv.amount_paid > 0 && inv.amount_paid < newAmountDue)
      status = 'partially_paid';
    if (inv.amount_paid === newAmountDue)
      status = 'paid';

    await conn.execute(
      `UPDATE student_invoices
       SET fine_amount = ?, fine_applied = ?, amount_due = ?, status = ?
       WHERE id = ?`,
      [fine, fine > 0 ? 1 : 0, newAmountDue, status, invoiceId]
    );

    await conn.commit();

    res.json({
      success: true,
      base_amount: baseAmount,
      fine_amount: fine,
      amount_due: newAmountDue,
      amount_paid: inv.amount_paid,
      status
    });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



const AddInvoiceFine = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const { fine_type, amount, description } = req.body;

  if (!fine_type || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Fine type and amount required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[invoice]] = await conn.execute(
      `SELECT amount_due, amount_paid, period_end
       FROM student_invoices
       WHERE id = ?
       FOR UPDATE`,
      [invoiceId]
    );

    if (!invoice) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const newAmountDue = Number(invoice.amount_due) + Number(amount);

    if (invoice.amount_paid > newAmountDue) {
      await conn.rollback();
      return res.status(400).json({ error: 'Paid amount exceeds new total' });
    }

    await conn.execute(
      `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount)
       VALUES (?, ?, ?, ?)`,
      [invoiceId, fine_type, description, amount]
    );

    await conn.execute(
      `UPDATE student_invoices
       SET amount_due = ?
       WHERE id = ?`,
      [newAmountDue, invoiceId]
    );

    await conn.commit();
    res.json({ success: true });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const AddInvoiceDiscount = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const { amount, reason } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Discount amount required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[invoice]] = await conn.execute(
      `SELECT amount_due, amount_paid, discount_amount
       FROM student_invoices
       WHERE id = ?
       FOR UPDATE`,
      [invoiceId]
    );

    if (!invoice) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const newAmountDue = Number(invoice.amount_due) - Number(amount);
    const newDiscountAmount = Number(invoice.discount_amount || 0) + Number(amount);

    if (newAmountDue < invoice.amount_paid) {
      await conn.rollback();
      return res.status(400).json({ error: 'Discount exceeds remaining balance (paid amount > new total)' });
    }

    // Update invoice status based on new amount due
    let status = 'pending';
    if (invoice.amount_paid > 0 && invoice.amount_paid < newAmountDue)
      status = 'partially_paid';
    if (invoice.amount_paid >= newAmountDue && newAmountDue > 0)
      status = 'paid';
    if (newAmountDue === 0)
      status = 'paid';

    await conn.execute(
      `INSERT INTO invoice_discounts (invoice_id, amount, reason)
       VALUES (?, ?, ?)`,
      [invoiceId, amount, reason || null]
    );

    await conn.execute(
      `UPDATE student_invoices
       SET amount_due = ?, discount_amount = ?, status = ?
       WHERE id = ?`,
      [newAmountDue, newDiscountAmount, status, invoiceId]
    );

    await conn.commit();
    res.json({ success: true, new_amount_due: newAmountDue, status });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};


const ReverseInvoiceFine = async (req, res) => {
  const fineId = Number(req.params.fineId);
  const { reason } = req.body;

  if (!fineId || !reason) {
    return res.status(400).json({ error: 'Fine ID and reason are required' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Lock fine
    const [[fine]] = await conn.execute(
      `SELECT id, invoice_id, amount, is_reversed
       FROM invoice_fines
       WHERE id = ?
       FOR UPDATE`,
      [fineId]
    );

    if (!fine) {
      await conn.rollback();
      return res.status(404).json({ error: 'Fine not found' });
    }

    if (fine.is_reversed === 1) {
      await conn.rollback();
      return res.status(400).json({ error: 'Fine already reversed' });
    }

    // Lock invoice
    const [[invoice]] = await conn.execute(
      `SELECT amount_due, amount_paid
       FROM student_invoices
       WHERE id = ?
       FOR UPDATE`,
      [fine.invoice_id]
    );

    if (!invoice) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const newAmountDue =
      Number(invoice.amount_due) - Number(fine.amount);

    if (invoice.amount_paid > newAmountDue) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Cannot reverse fine: paid amount exceeds new invoice total'
      });
    }

    // Reverse fine
    await conn.execute(
      `UPDATE invoice_fines
       SET 
         is_reversed = 1,
         reversed_reason = ?,
         reversed_at = NOW()
       WHERE id = ?`,
      [reason, fineId]
    );

    // Update invoice
    let status = 'pending';
    if (invoice.amount_paid > 0 && invoice.amount_paid < newAmountDue)
      status = 'partially_paid';
    if (invoice.amount_paid === newAmountDue)
      status = 'paid';

    await conn.execute(
      `UPDATE student_invoices
       SET amount_due = ?, status = ?
       WHERE id = ?`,
      [newAmountDue, status, fine.invoice_id]
    );

    await conn.commit();

    res.json({
      success: true,
      invoice_id: fine.invoice_id,
      reversed_fine_id: fineId,
      new_amount_due: newAmountDue,
      status
    });

  } catch (err) {
    await conn.rollback();
    console.error('ReverseInvoiceFine error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};



/**
 * GET /api/fees/invoices
 * Query: ?student_id&status&from&to&limit&offset
 */


const GetInvoices = async (req, res) => {
  try {
    const studentId = req.query.student_id ? Number(req.query.student_id) : null;
    const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;
    const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const status = req.query.status || null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    let limit = parseInt(req.query.limit || '200', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    const where = []; const params = [];
    if (studentId) { where.push('si.student_id = ?'); params.push(studentId); }
    if (academicYearId) { where.push('sar.academic_year_id = ?'); params.push(academicYearId); }
    if (gradeId) { where.push('si.grade_id = ?'); params.push(gradeId); }
    if (classId) { where.push('si.class_id = ?'); params.push(classId); }
    if (status) { where.push('si.status = ?'); params.push(status); }
    if (from && to) {
      if (!isDateString(from) || !isDateString(to)) return res.status(400).json({ error: 'from/to must be YYYY-MM-DD' });
      where.push('DATE(si.created_at) BETWEEN ? AND ?'); params.push(from, to);
    }

    let baseSql = `
            FROM student_invoices si
            LEFT JOIN students st ON st.id = si.student_id
            LEFT JOIN classes c ON c.id = si.class_id
            LEFT JOIN grades g ON g.id = si.grade_id
            LEFT JOIN users u ON u.id = st.id
            LEFT JOIN student_academic_records sar ON sar.id = si.student_academic_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
        `;
    if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
    const [cnt] = await pool.execute(countSql, params);
    const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

    const dataSql = `
        SELECT si.*, st.user_id AS student_user_id, u.name AS user_name, c.name AS class_name, g.name AS grade_name, ay.name AS academic_year_name
        ${baseSql}
        ORDER BY si.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
        `;
    const [rows] = await pool.execute(dataSql, params);

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    for (const row of rows) {
      const startMonth = new Date(row.period_start).toLocaleString('en-IN', options);
      // const endMonth = new Date(row.period_end).toLocaleString('en-IN', options);

      row.period = `${startMonth}`;
    }

    return res.json({ total, limit, offset, invoices: rows });
  } catch (err) {
    console.error('GET /api/fees/invoices error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


const GetFinesByInvoiceId = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [rows] = await pool.execute('SELECT * FROM student_invoices WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const fineinvoice = rows[0];
    const [fines] = await pool.execute(
      `SELECT fine_type, description, amount
            FROM invoice_fines
            WHERE invoice_id = ?`,
      [id]
    );
    fineinvoice.lines = fines;
    return res.json({ fineinvoice });
  } catch (err) {
    console.error('GET /api/fees/fine_invoices/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



/**
 * GET /api/fees/invoices/:id
 */


const GetInvoiceById = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const [rows] = await pool.execute('SELECT * FROM student_invoices WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = rows[0];
    const [student_academic] = await pool.execute('SELECT grade_id, class_id, academic_year_id, roll_no FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC', [invoice.student_id]);
    const [lines] = await pool.execute(
      `SELECT il.*, ft.name AS fee_name, ft.code AS fee_code
            FROM invoice_lines il JOIN fee_types ft ON ft.id = il.fee_type_id
            WHERE il.invoice_id = ?`,
      [id]
    );
    const [payments] = await pool.execute('SELECT * FROM student_payments WHERE invoice_id = ? ORDER BY payment_date DESC', [id]);
    const [fines] = await pool.execute('SELECT id, fine_type, description, amount, is_reversed, reversed_reason FROM invoice_fines WHERE invoice_id = ?', [id]);
    const [discounts] = await pool.execute('SELECT id, amount, reason, created_at FROM invoice_discounts WHERE invoice_id = ?', [id]);

    const [classData] = await pool.execute('SELECT name FROM classes WHERE id = ?', [student_academic[0].class_id]);
    const [gradeData] = await pool.execute('SELECT name FROM grades WHERE id = ?', [student_academic[0].grade_id]);
    const [academic_year] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [student_academic[0]?.academic_year_id || 0]);

    invoice.lines = lines;
    invoice.payments = payments;
    invoice.fines = fines;
    invoice.discounts = discounts;

    invoice.academic_year_name = academic_year[0]?.name || null;
    invoice.class_name = classData[0].name || null;
    invoice.grade_name = gradeData[0].name || null;
    invoice.roll_no = student_academic[0]?.roll_no || null;

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);
    // const endMonth = new Date(invoice.period_end).toLocaleString('en-IN', options);

    invoice.period = `${startMonth}`;

    return res.json({ invoice });
  } catch (err) {
    console.error('GET /api/fees/invoices/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

const DownloadPaymentReceiptPDF = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    const [rows] = await pool.execute(`
      SELECT sp.*, si.student_id, si.period_start, si.period_end, si.months_count,
             u.name AS student_name, st.fathers_name, c.name AS class_name, g.name AS grade_name,
             si.amount_due, si.amount_paid, si.discount_amount, fine.amount AS fine_amount, fine.fine_type AS fine_type, fine.description AS fine_description
      FROM student_payments sp
      JOIN student_invoices si ON si.id = sp.invoice_id
      JOIN users u ON u.id = si.student_id
      JOIN students st ON st.user_id = u.id
      JOIN classes c ON c.id = si.class_id
      JOIN grades g ON g.id = si.grade_id
      LEFT JOIN invoice_fines fine ON fine.invoice_id = sp.invoice_id
      WHERE sp.id = ?
    `, [id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    const payment = rows[0];

    const [student_academic] = await pool.execute(
      'SELECT roll_no, academic_year_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1',
      [payment.student_id]
    );

    if (student_academic.length) {
      payment.roll_no = student_academic[0].roll_no;
      const [ay] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [student_academic[0].academic_year_id]);
      if (ay.length) {
        payment.academic_year_name = ay[0].name;
      }
    }

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    const startMonth = new Date(payment.period_start).toLocaleString('en-IN', options);
    // const endMonth = new Date(payment.period_end).toLocaleString('en-IN', options);

    payment.period = `${startMonth}`;

    const pdfBuffer = await generatePaymentReceiptPDF(payment);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${payment.id}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('DownloadPaymentReceiptPDF error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * DELETE /api/fees/invoices/:id
 * Delete invoice and its lines/payments (if allowed). Only allows deletion if amount_paid == 0
 */

const DeleteInvoice = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT amount_paid FROM student_invoices WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Invoice not found' }); }
    // if (Number(rows[0].amount_paid || 0) > 0) { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Cannot delete invoice with payments' }); }

    await conn.execute('DELETE FROM invoice_lines WHERE invoice_id = ?', [id]);
    await conn.execute('DELETE FROM student_invoices WHERE id = ?', [id]);
    await conn.execute('DELETE FROM invoice_fines WHERE invoice_id = ?', [id]);

    await conn.commit();
    conn.release();
    return res.json({ success: true, deleted_invoice_id: id });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('DELETE /api/fees/invoices/:id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/** ----------------------
 * PAYMENTS
 * ---------------------- */

/**
 * POST /api/fees/invoices/:id/pay
 * Body: { paid_amount, payment_method?, reference?, processed_by? }
 * Creates student_payments row and updates invoice amount_paid and status.
 */

const AddPaymentToInvoice = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const {
    paid_amount,
    payment_method = 'online',
    reference = null,
    processed_by = null,
    discount_amount = 0,
    discount_reason = null
  } = req.body;

  let paymentId = null;

  if (!invoiceId || paid_amount === undefined) {
    return res.status(400).json({ error: 'invoice_id and paid_amount are required' });
  }

  const paid = Number(paid_amount);
  const discount = Number(discount_amount || 0);

  if ((!Number.isFinite(paid) || paid <= 0) && (!Number.isFinite(discount) || discount <= 0)) {
    return res.status(400).json({ error: 'valid paid_amount or discount_amount required' });
  }

  if (discount < 0) {
    return res.status(400).json({ error: 'Discount cannot be negative' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT id, amount_due, amount_paid, discount_amount
             FROM student_invoices 
             WHERE id = ? 
             FOR UPDATE`,
      [invoiceId]
    );

    if (rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = rows[0];
    let amountDue = Number(invoice.amount_due || 0);
    const alreadyPaid = Number(invoice.amount_paid || 0);

    const pendingAmount = amountDue - alreadyPaid;
    if (discount > pendingAmount) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Discount exceeds remaining balance' });
    }

    if (discount > 0) {
      amountDue -= discount;
      const newDiscountTotal = Number(invoice.discount_amount || 0) + discount;

      await conn.execute(
        `INSERT INTO invoice_discounts (invoice_id, amount, reason) VALUES (?, ?, ?)`,
        [invoiceId, discount, discount_reason]
      );

      await conn.execute(
        `UPDATE student_invoices SET amount_due = ?, discount_amount = ? WHERE id = ?`,
        [amountDue, newDiscountTotal, invoiceId]
      );
    }

    const outstanding = Number((amountDue - alreadyPaid).toFixed(2));

    // 🚫 BLOCK OVERPAYMENT
    if (paid > outstanding) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: 'Payment exceeds due amount',
        due_amount: outstanding,
        attempted_payment: paid
      });
    }

    const newPaid = Number((alreadyPaid + paid).toFixed(2));

    // Insert payment
    // if (paid > 0) {
    //   await conn.execute(
    //     `INSERT INTO student_payments 
    //           (invoice_id, paid_amount, payment_date, payment_method, reference, processed_by)
    //           VALUES (?, ?, NOW(), ?, ?, ?)`,
    //     [invoiceId, paid, payment_method, reference, processed_by]
    //   );
    // }

    if (paid > 0) {
      const [pResult] = await conn.execute(
        `INSERT INTO student_payments 
              (invoice_id, paid_amount, payment_date, payment_method, reference, processed_by)
              VALUES (?, ?, NOW(), ?, ?, ?)`,
        [invoiceId, paid, payment_method, reference, processed_by]
      );
      paymentId = pResult.insertId;
    }

    // Determine status
    let newStatus = 'pending';
    if (newPaid > 0 && newPaid < amountDue) newStatus = 'partially_paid';
    if (newPaid >= amountDue && amountDue > 0) newStatus = 'paid';
    if (amountDue === 0) newStatus = 'paid';


    // // Insert payment
    // await conn.execute(
    //   `INSERT INTO student_payments 
    //         (invoice_id, paid_amount, payment_date, payment_method, reference, processed_by)
    //         VALUES (?, ?, NOW(), ?, ?, ?)`,
    //   [invoiceId, paid, payment_method, reference, processed_by]
    // );

    // Determine status
    // const newStatus = newPaid === amountDue ? 'paid' : 'partially_paid';

    // Update invoice
    await conn.execute(
      `UPDATE student_invoices 
             SET amount_paid = ?, status = ? 
             WHERE id = ?`,
      [newPaid, newStatus, invoiceId]
    );

    await conn.commit();
    conn.release();

    // Fetch updated invoice
    const [invRows] = await pool.execute(
      'SELECT * FROM student_invoices WHERE id = ?',
      [invoiceId]
    );

    const inv = invRows[0];
    const finalOutstanding = Number(
      (Number(inv.amount_due) - Number(inv.amount_paid)).toFixed(2)
    );


    const options = { month: 'short', timeZone: 'Asia/Kolkata' };


    const startMonth = new Date(inv.period_start).toLocaleString('en-IN', options);
    const endMonth = new Date(inv.period_end).toLocaleString('en-IN', options);

    const period = `${startMonth}-${endMonth}`;

    // const paymentId = (typeof paymentResult !== 'undefined' && paymentResult) ? paymentResult.insertId : null;

    // --- WHATSAPP NOTIFICATION ---
    try {
      const [[student]] = await pool.execute(`
        SELECT u.name, u.phone as student_phone, s.parent_contact, s.mother_contect, s.fathers_name,  ay.name as academic_year
        FROM students s
        JOIN users u ON u.id = s.user_id
        JOIN student_academic_records sar ON sar.student_id = s.id
        JOIN academic_years ay ON ay.id = sar.academic_year_id
        WHERE s.id = ?
      `, [inv.student_id]);

      if (student) {
        const token = generatePublicToken(invoiceId);
        const baseUrl = process.env.HOSTING_BACKEND_BASE_URL || process.env.LOCAL_BACKEND_BASE_URL || 'http://localhost:5000';

        let downloadLink = `${baseUrl}/api/fee/public/combined-pdf/${invoiceId}?token=${token}`;
        if (paymentId) {
          downloadLink += `&payment_id=${paymentId}`;
        }

        // const msg = `Dear ${student.name}, payment of ₹${paid} for Invoice INV-${String(invoiceId).padStart(4, '0')} has been received. Remaining balance: ₹${finalOutstanding}. Download receipt: ${downloadLink}`;

        const contacts = [student.student_phone, student.parent_contact].filter(Boolean);
        // Send to unique contacts
        const uniqueContacts = [...new Set(contacts)];
        for (const contact of uniqueContacts) {
          // Queue WhatsApp message instead of direct sending
          await whatsappQueue.add('paymentReceiptNotification', {
            contact,
            jobType: 'paymentReceiptNotification',
            message: {

              template: {
                name: "school_payment_receipt",
                language: {
                  code: "en"
                },
                components: [
                  {
                    type: "body",
                    parameters: [
                      {
                        type: "text",
                        text: student.fathers_name
                      },
                      {
                        type: "text",
                        text: paid
                      },
                      {
                        type: "text",
                        text: student.name
                      },
                      {
                        type: "text",
                        text: `INV-${String(invoiceId).padStart(4, '0')}`
                      },
                      {
                        type: "text",
                        text: finalOutstanding
                      },
                      {
                        type: "text",
                        text: downloadLink
                      },
                      {
                        type: "text",
                        text: "CMC"
                      },
                      {
                        type: "text",
                        text: student.academic_year
                      },
                      {
                        type: "text",
                        text: period
                      }
                    ]
                  }
                ]
              },

              // Fallback normal text
              fallbackText: `
            Dear ${student.fathers_name},\n

            Payment of ₹${paid} for Invoice INV-${String(invoiceId).padStart(4, '0')} has been received. For ${student.academic_year}\n
            Remaining balance: ₹${finalOutstanding}.\n

            Download receipt:\n
            ${downloadLink}\n
            Thank you.
            `
            }
          });
        }
      }
    } catch (msgErr) {
      console.error('Payment notification error:', msgErr);
    }
    // ----------------------------

    return res.json({
      message: 'Processed successfully',
      payment_id: paymentId,
      invoice: {
        ...inv,
        outstanding: finalOutstanding
      }
    });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('POST /api/fees/invoices/:id/pay error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



/**
 * GET /api/fees/payments
 * Query: ?invoice_id&student_id&limit&offset
 */

const GetPayments = async (req, res) => {
  try {
    const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;
    const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const invoiceId = req.query.invoice_id ? Number(req.query.invoice_id) : null;
    const studentId = req.query.student_id ? Number(req.query.student_id) : null;
    let limit = parseInt(req.query.limit || '200', 10);
    let offset = parseInt(req.query.offset || '0', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 200;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(limit, 2000);

    const where = []; const params = [];
    if (invoiceId) { where.push('sp.invoice_id = ?'); params.push(invoiceId); }
    if (studentId) { where.push('si.student_id = ?'); params.push(studentId); }
    if (academicYearId) { where.push('sar.academic_year_id = ?'); params.push(academicYearId); }
    if (gradeId) { where.push('si.grade_id = ?'); params.push(gradeId); }
    if (classId) { where.push('si.class_id = ?'); params.push(classId); }

    let baseSql = `
            FROM student_payments sp
            LEFT JOIN student_invoices si ON si.id = sp.invoice_id
            LEFT JOIN students st ON st.id = si.student_id
            LEFT JOIN users u ON u.id = st.user_id
            LEFT JOIN student_academic_records sar ON sar.id = si.student_academic_id
            LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
        `;
    if (where.length) baseSql += ' WHERE ' + where.join(' AND ');

    const countSql = `SELECT COUNT(*) AS total ${baseSql}`;
    const [cnt] = await pool.execute(countSql, params);
    const total = (Array.isArray(cnt) && cnt[0]) ? Number(cnt[0].total || 0) : 0;

    const dataSql = `
            SELECT sp.*, si.student_id, st.user_id AS student_user_id, u.name AS student_name, ay.name AS academic_year
            ${baseSql}
            ORDER BY sp.payment_date DESC
            LIMIT ${limit} OFFSET ${offset}
        `;
    const [rows] = await pool.execute(dataSql, params);

    return res.json({ total, limit, offset, payments: rows });
  } catch (err) {
    console.error('GET /api/fees/payments error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


/** ----------------------
 * UTILS / QUICK ENDPOINTS
 * ---------------------- */

/**
 * GET /api/fees/student-summary/:student_id
 * Returns student's invoices summary and outstanding amount
 */

const GetStudentFeeSummary = async (req, res) => {
  const studentId = toInt(req.params.student_id);
  const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;
  if (!studentId) return res.status(400).json({ error: 'Invalid student id' });
  try {
    const params = [studentId];
    let whereSql = '';
    if (academicYearId) {
      whereSql = ' AND sar.academic_year_id = ?';
      params.push(academicYearId);
    }

    const [invoices] = await pool.execute(
      `SELECT si.id, si.amount_due, si.amount_paid, si.status, si.period_start, si.period_end, 
        si.created_at, c.name as class_name, g.name as grade_name, u.name as student_name, ay.name as academic_year
        FROM student_invoices si 
        LEFT JOIN classes c ON c.id = si.class_id
        LEFT JOIN grades g ON g.id = si.grade_id
        LEFT JOIN students s ON s.id = si.student_id
        LEFT JOIN users u ON u.id = s.user_id 
        LEFT JOIN student_academic_records sar ON sar.id = si.student_academic_id
        LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
        WHERE si.student_id = ? ${whereSql}
        ORDER BY created_at DESC`,
      params
    );

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    for (const invoice of invoices) {
      const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);
      // const endMonth = new Date(invoice.period_end).toLocaleString('en-IN', options);

      invoice.period = `${startMonth}`;
    }

    const outstanding = invoices.reduce((s, inv) => s + Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0)), 0);
    return res.json({ invoices, outstanding: Number(outstanding.toFixed(2)) });
  } catch (err) {
    console.error('GET /api/fees/student-summary/:student_id error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}



const GetStudentFeeFullDetails = async (req, res) => {
  const userId = req.user.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;

    // 1. Get student profile and academic record
    let studentSql = `
       SELECT s.id, sar.id as academic_id, sar.grade_id, sar.class_id, 
              g.name as grade_name, c.name as class_name, ay.name as academic_year_name
       FROM students s
       JOIN student_academic_records sar ON sar.student_id = s.id
       LEFT JOIN grades g ON g.id = sar.grade_id
       LEFT JOIN classes c ON c.id = sar.class_id
       LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
       WHERE s.user_id = ?
    `;
    const studentParams = [userId];

    if (academicYearId) {
      studentSql += ' AND sar.academic_year_id = ? LIMIT 1';
      studentParams.push(academicYearId);
    } else {
      studentSql += ' ORDER BY sar.academic_year_id DESC, sar.id DESC LIMIT 1';
    }

    const [studentRows] = await pool.execute(studentSql, studentParams);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student academic record not found' });
    }

    const student = studentRows[0];

    // 2. Get class fee structure for student's grade
    const [feeStructure] = await pool.execute(
      `SELECT cfs.*, ft.name as fee_name, ft.code as fee_code
       FROM class_fee_structure cfs
       JOIN fee_types ft ON ft.id = cfs.fee_type_id
       WHERE cfs.grade_id = ?`,
      [student.grade_id]
    );

    // 3. Get all invoices for the student's latest academic profile
    const [invoices] = await pool.execute(
      `SELECT si.*
       FROM student_invoices si
       WHERE si.student_id = ? AND si.student_academic_id = ?
       ORDER BY si.created_at DESC`,
      [student.id, student.academic_id]
    );

    // 4. Get all payments and fines for these invoices
    const invoiceIds = invoices.map(inv => inv.id);
    let payments = [];
    let fines = [];
    let discounts = [];

    if (invoiceIds.length > 0) {
      const placeholders = invoiceIds.map(() => '?').join(',');

      const [paymentRows] = await pool.execute(
        `SELECT sp.*, si.amount_due
         FROM student_payments sp
         JOIN student_invoices si ON si.id = sp.invoice_id
         WHERE sp.invoice_id IN (${placeholders})
         ORDER BY sp.payment_date DESC`,
        invoiceIds
      );
      payments = paymentRows;

      const [fineRows] = await pool.execute(
        `SELECT * FROM invoice_fines WHERE invoice_id IN (${placeholders})`,
        invoiceIds
      );
      fines = fineRows;

      const [discountRows] = await pool.execute(
        `SELECT * FROM invoice_discounts WHERE invoice_id IN (${placeholders})`,
        invoiceIds
      );
      discounts = discountRows;
    }

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    for (const invoice of invoices) {
      const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);
      // const endMonth = new Date(invoice.period_end).toLocaleString('en-IN', options);

      invoice.period = `${startMonth}`;
    }

    return res.json({
      student,
      fee_structure: feeStructure,
      invoices,
      payments,
      fines,
      discounts
    });

  } catch (err) {
    console.error('GET /api/fees/student-fee-details error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/fees/invoices/:id/pdf
 */
const DownloadInvoicePDF = async (req, res) => {
  const id = toInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  try {
    // Fetch full invoice data (same as GetInvoiceById)
    const [rows] = await pool.execute(
      `SELECT si.*, u.name AS user_name, c.name AS class_name, g.name AS grade_name, st.fathers_name
             FROM student_invoices si
             JOIN users u ON u.id = si.student_id
             JOIN students st ON st.user_id = u.id
             JOIN classes c ON c.id = si.class_id
             JOIN grades g ON g.id = si.grade_id
             WHERE si.id = ?`,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const invoice = rows[0];

    const [student_academic] = await pool.execute(
      'SELECT roll_no, academic_year_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1',
      [invoice.student_id]
    );
    if (student_academic.length) {
      invoice.roll_no = student_academic[0].roll_no;
      const [ay] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [student_academic[0].academic_year_id]);
      if (ay.length) {
        invoice.academic_year_name = ay[0].name;
      }
    }

    const [lines] = await pool.execute(
      `SELECT il.*, ft.name AS fee_name
             FROM invoice_lines il
             JOIN fee_types ft ON ft.id = il.fee_type_id
             WHERE il.invoice_id = ?`,
      [id]
    );
    invoice.lines = lines;

    const [fines] = await pool.execute(
      `SELECT * FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0`,
      [id]
    );
    invoice.fines = fines;

    const [discounts] = await pool.execute(
      `SELECT * FROM invoice_discounts WHERE invoice_id = ?`,
      [id]
    );
    invoice.discounts = discounts;

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);
    // const endMonth = new Date(invoice.period_end).toLocaleString('en-IN', options);

    invoice.period = `${startMonth}`;

    // Create PDF
    const pdfBuffer = await generateInvoicePDF(invoice);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${id}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('DownloadInvoicePDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

const DownloadCombinedPDF = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const paymentId = req.query.payment_id ? Number(req.query.payment_id) : null;

  if (!invoiceId) return res.status(400).json({ error: 'Invoice ID is required' });

  try {
    // 1. Fetch Invoice Data
    const [[invoice]] = await pool.execute(
      `SELECT si.*, u.name AS user_name, c.name AS class_name, g.name AS grade_name, st.fathers_name
       FROM student_invoices si
       JOIN users u ON u.id = si.student_id
       JOIN students st ON st.user_id = u.id
       JOIN classes c ON c.id = si.class_id
       JOIN grades g ON g.id = si.grade_id
       WHERE si.id = ?`,
      [invoiceId]
    );

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Academic Info
    const [[academic]] = await pool.execute(
      'SELECT roll_no, academic_year_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1',
      [invoice.student_id]
    );
    if (academic) {
      invoice.roll_no = academic.roll_no;
      const [[ay]] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [academic.academic_year_id]);
      if (ay) invoice.academic_year_name = ay.name;
    }

    // Lines, Fines, Discounts
    const [lines] = await pool.execute(`SELECT il.*, ft.name AS fee_name FROM invoice_lines il JOIN fee_types ft ON ft.id = il.fee_type_id WHERE il.invoice_id = ?`, [invoiceId]);
    const [fines] = await pool.execute(`SELECT * FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0`, [invoiceId]);
    const [discounts] = await pool.execute(`SELECT * FROM invoice_discounts WHERE invoice_id = ?`, [invoiceId]);
    invoice.lines = lines;
    invoice.fines = fines;
    invoice.discounts = discounts;

    // 2. Fetch Payment Data
    let payment = null;
    if (paymentId) {
      const [[p]] = await pool.execute(`
        SELECT sp.*, u.name AS student_name, st.fathers_name, c.name AS class_name, g.name AS grade_name, si.amount_due, si.amount_paid, si.discount_amount, fine.amount AS fine_amount,
        fine.fine_type AS fine_type, fine.description AS fine_description, si.period_start, si.period_end
        FROM student_payments sp
        JOIN student_invoices si ON si.id = sp.invoice_id
        JOIN users u ON u.id = si.student_id
        JOIN students st ON st.user_id = u.id
        JOIN classes c ON c.id = si.class_id
        JOIN grades g ON g.id = si.grade_id
        LEFT JOIN invoice_fines fine ON fine.invoice_id = sp.invoice_id
        WHERE sp.id = ? AND sp.invoice_id = ?`, [paymentId, invoiceId]);
      payment = p;
    } else {
      // Get latest payment for this invoice
      const [[p]] = await pool.execute(`
        SELECT sp.*, u.name AS student_name, st.fathers_name, c.name AS class_name, g.name AS grade_name, si.amount_due, si.amount_paid, fine.amount AS fine_amount,
        si.discount_amount, fine.fine_type AS fine_type, fine.description AS fine_description, si.period_start, si.period_end
        FROM student_payments sp
        JOIN student_invoices si ON si.id = sp.invoice_id
        JOIN users u ON u.id = si.student_id
        JOIN students st ON st.user_id = u.id
        JOIN classes c ON c.id = si.class_id
        JOIN grades g ON g.id = si.grade_id
        LEFT JOIN invoice_fines fine ON fine.invoice_id = sp.invoice_id
        WHERE sp.invoice_id = ?
        ORDER BY sp.payment_date DESC LIMIT 1`, [invoiceId]);
      payment = p;
    }

    if (payment) {
      const [[pAcademic]] = await pool.execute('SELECT roll_no, academic_year_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1', [invoice.student_id]);
      if (pAcademic) {
        payment.roll_no = pAcademic.roll_no;
        const [[pAy]] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [pAcademic.academic_year_id]);
        if (pAy) payment.academic_year_name = pAy.name;
      }
    }

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    const startMonth = new Date(invoice.period_start).toLocaleString('en-IN', options);
    // const endMonth = new Date(invoice.period_end).toLocaleString('en-IN', options);

    invoice.period = `${startMonth}`;

    if (payment) {
      const paymentStartMonth = new Date(payment.period_start).toLocaleString('en-IN', options);
      // const paymentEndMonth = new Date(payment.period_end).toLocaleString('en-IN', options);
      payment.period = `${paymentStartMonth}`;
    }

    // 3. Generate PDF
    let pdfBuffer;
    if (payment) {
      pdfBuffer = await generateCombinedInvoiceReceiptPDF(invoice, payment);
    } else {
      pdfBuffer = await generateInvoicePDF(invoice);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_receipt_${invoiceId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('DownloadCombinedPDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
};

const AddPreviousDues = async (req, res) => {
  const invoiceId = Number(req.params.id);
  const { previous_month, payment_dues, fine_dues } = req.body;

  const payDues = Number(payment_dues) || 0;
  const fDues = Number(fine_dues) || 0;

  if (payDues <= 0 && fDues <= 0) {
    return res.status(400).json({ error: 'At least one previous due amount is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[invoice]] = await conn.execute(
      `SELECT amount_due, amount_paid FROM student_invoices WHERE id = ? FOR UPDATE`,
      [invoiceId]
    );

    if (!invoice) {
      await conn.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const totalToAdd = payDues + fDues;
    const newAmountDue = Number(invoice.amount_due) + totalToAdd;

    if (invoice.amount_paid > newAmountDue) {
      await conn.rollback();
      return res.status(400).json({ error: 'Paid amount exceeds new total' });
    }

    if (payDues > 0) {
      await conn.execute(
        `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
        [invoiceId, 'previous_dues', `Previous Payment Dues (${previous_month || 'N/A'})`, payDues]
      );
    }

    if (fDues > 0) {
      await conn.execute(
        `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
        [invoiceId, 'previous_fines', `Previous Fine Dues (${previous_month || 'N/A'})`, fDues]
      );
    }

    // Update invoice status based on new amount due
    let status = 'pending';
    if (invoice.amount_paid > 0 && invoice.amount_paid < newAmountDue) status = 'partially_paid';
    if (invoice.amount_paid >= newAmountDue && newAmountDue > 0) status = 'paid';
    if (newAmountDue === 0) status = 'paid';

    await conn.execute(
      `UPDATE student_invoices SET amount_due = ?, status = ? WHERE id = ?`,
      [newAmountDue, status, invoiceId]
    );

    await conn.commit();
    res.json({ success: true, new_amount_due: newAmountDue, status });
  } catch (err) {
    await conn.rollback();
    console.error('AddPreviousDues error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const BulkDeleteInvoices = async (req, res) => {
  const { invoiceIds } = req.body;
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({ error: 'invoiceIds array is required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const placeholders = invoiceIds.map(() => '?').join(',');

    // Check if any invoice has payments
    const [rows] = await conn.execute(
      `SELECT id, amount_paid FROM student_invoices WHERE id IN (${placeholders}) FOR UPDATE`,
      [...invoiceIds]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'No invoices found' });
    }

    // Optional: block if any have payments (currently commented out in single delete, keeping it consistent)
    // const withPayments = rows.filter(r => Number(r.amount_paid || 0) > 0);
    // if (withPayments.length > 0) { ... }

    await conn.execute(`DELETE FROM invoice_lines WHERE invoice_id IN (${placeholders})`, [...invoiceIds]);
    await conn.execute(`DELETE FROM invoice_fines WHERE invoice_id IN (${placeholders})`, [...invoiceIds]);
    await conn.execute(`DELETE FROM student_invoices WHERE id IN (${placeholders})`, [...invoiceIds]);

    await conn.commit();
    res.json({ success: true, deleted_count: rows.length });
  } catch (err) {
    await conn.rollback();
    console.error('BulkDeleteInvoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
};

const DownloadBulkInvoicePDF = async (req, res) => {
  const { invoiceIds } = req.body;
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    return res.status(400).json({ error: 'invoiceIds array is required' });
  }

  try {
    if (invoiceIds.length > 10) {
      return res.status(400).json({ error: 'Bulk print is limited to 10 invoices at a time' });
    }

    const placeholders = invoiceIds.map(() => '?').join(',');

    // Fetch all invoices
    const [invoiceRows] = await pool.execute(
      `SELECT si.*, u.name AS user_name, c.name AS class_name, g.name AS grade_name, st.fathers_name
       FROM student_invoices si
       JOIN users u ON u.id = si.student_id
       JOIN students st ON st.user_id = u.id
       JOIN classes c ON c.id = si.class_id
       JOIN grades g ON g.id = si.grade_id
       WHERE si.id IN (${placeholders})
       ORDER BY si.id DESC`,
      [...invoiceIds]
    );

    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoices not found' });
    }

    const fullInvoices = [];

    for (const inv of invoiceRows) {
      const invoice = { ...inv };

      // Academic Info
      const [[academic]] = await pool.execute(
        'SELECT roll_no, academic_year_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC, id DESC LIMIT 1',
        [invoice.student_id]
      );
      if (academic) {
        invoice.roll_no = academic.roll_no;
        const [[ay]] = await pool.execute('SELECT name FROM academic_years WHERE id = ?', [academic.academic_year_id]);
        if (ay) invoice.academic_year_name = ay.name;
      }

      // Lines, Fines, Discounts
      const [lines] = await pool.execute(`SELECT il.*, ft.name AS fee_name FROM invoice_lines il JOIN fee_types ft ON ft.id = il.fee_type_id WHERE il.invoice_id = ?`, [invoice.id]);
      const [fines] = await pool.execute(`SELECT * FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0`, [invoice.id]);
      const [discounts] = await pool.execute(`SELECT * FROM invoice_discounts WHERE invoice_id = ?`, [invoice.id]);

      invoice.lines = lines;
      invoice.fines = fines;
      invoice.discounts = discounts;

      fullInvoices.push(invoice);
    }

    const pdfBuffer = await generateBulkInvoicesPDF(fullInvoices);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bulk_invoices.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('DownloadBulkInvoicePDF error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
};

const DisableAutoGenerate = async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    await pool.execute('UPDATE student_invoices SET is_auto_generate = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DisableAutoGenerate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const ExportDueInvoicesCSV = async (req, res) => {
  try {
    const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;
    const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
    const classId = req.query.class_id ? Number(req.query.class_id) : null;

    const where = ['(si.amount_due - si.amount_paid) > 0', "si.status != 'carried_forward'"];
    const params = [];

    if (academicYearId) { where.push('sar.academic_year_id = ?'); params.push(academicYearId); }
    if (gradeId) { where.push('si.grade_id = ?'); params.push(gradeId); }
    if (classId) { where.push('si.class_id = ?'); params.push(classId); }

    let sql = `
        SELECT 
            u.name AS student_name,
            st.admission_no,
            c.name AS class_name,
            g.name AS grade_name,
            ay.name AS academic_year,
            si.period_start,
            si.period_end,
            si.amount_due,
            si.amount_paid,
            (si.amount_due - si.amount_paid) AS balance,
            si.status,
            si.created_at
        FROM student_invoices si
        LEFT JOIN students st ON st.id = si.student_id
        LEFT JOIN classes c ON c.id = si.class_id
        LEFT JOIN grades g ON g.id = si.grade_id
        LEFT JOIN users u ON u.id = st.id
        LEFT JOIN student_academic_records sar ON sar.id = si.student_academic_id
        LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
    `;

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY g.name, c.name, u.name';

    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No invoices with dues found for the selected criteria' });
    }

    const options = { month: 'long', timeZone: 'Asia/Kolkata' };

    // Generate CSV
    let csv = 'Student Name,Admission No,Class,Grade,Academic Year,Period,Amount Due,Amount Paid,Balance,Status,Created At\n';
    rows.forEach(row => {
      const createdAt = new Date(row.created_at).toLocaleDateString('en-IN');
      const startMonth = new Date(row.period_start).toLocaleString('en-IN', options);
      const endMonth = new Date(row.period_end).toLocaleString('en-IN', options);
      const period = `${startMonth} - ${endMonth}`;
      csv += `"${row.student_name}","${row.admission_no || ''}","${row.class_name}","${row.grade_name}","${row.academic_year}","${period}",${row.amount_due},${row.amount_paid},${row.balance},"${row.status}","${createdAt}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=due_invoices.csv');
    return res.status(200).send(csv);

  } catch (err) {
    console.error('ExportDueInvoicesCSV error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const ExportPaymentHistoryCSV = async (req, res) => {
  try {
    const academicYearId = req.query.academic_year_id ? Number(req.query.academic_year_id) : null;
    const gradeId = req.query.grade_id ? Number(req.query.grade_id) : null;
    const classId = req.query.class_id ? Number(req.query.class_id) : null;
    const startDate = req.query.start_date || null;
    const endDate = req.query.end_date || null;
    const paymentMethod = req.query.payment_method || null;
    const studentNameSearch = req.query.q || null;

    const where = [];
    const params = [];

    if (academicYearId) { where.push('sar.academic_year_id = ?'); params.push(academicYearId); }
    if (gradeId) { where.push('si.grade_id = ?'); params.push(gradeId); }
    if (classId) { where.push('si.class_id = ?'); params.push(classId); }
    if (startDate) { where.push('sp.payment_date >= ?'); params.push(startDate); }
    if (endDate) { where.push('sp.payment_date <= ?'); params.push(endDate); }
    if (paymentMethod && paymentMethod !== 'all') { where.push('sp.payment_method = ?'); params.push(paymentMethod); }
    if (studentNameSearch) { where.push('u.name LIKE ?'); params.push(`%${studentNameSearch}%`); }

    let sql = `
        SELECT 
            u.name AS student_name,
            st.admission_no,
            c.name AS class_name,
            g.name AS grade_name,
            ay.name AS academic_year,
            sp.payment_date,
            sp.paid_amount,
            sp.payment_method,
            sp.reference,
            sp.invoice_id
        FROM student_payments sp
        JOIN student_invoices si ON si.id = sp.invoice_id
        LEFT JOIN students st ON st.id = si.student_id
        LEFT JOIN classes c ON c.id = si.class_id
        LEFT JOIN grades g ON g.id = si.grade_id
        LEFT JOIN users u ON u.id = st.id
        LEFT JOIN student_academic_records sar ON sar.id = si.student_academic_id
        LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
    `;

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY sp.payment_date DESC, sp.id DESC';

    const [rows] = await pool.execute(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No payment records found for the selected criteria' });
    }

    // Generate CSV
    let csv = 'Payment Date,Student Name,Admission No,Class,Grade,Academic Year,Amount Paid,Method,Reference,Invoice ID\n';
    rows.forEach(row => {
      const paymentDate = new Date(row.payment_date).toLocaleDateString('en-IN');
      csv += `"${paymentDate}","${row.student_name}","${row.admission_no || ''}","${row.class_name}","${row.grade_name}","${row.academic_year}",${row.paid_amount},"${row.payment_method}","${row.reference || ''}","INV-${row.invoice_id.toString().padStart(4, '0')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=payment_history.csv');
    return res.status(200).send(csv);

  } catch (err) {
    console.error('ExportPaymentHistoryCSV error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createFeeType,
  GetFeeTypes,
  GetFeeTypeById,
  UpdateFeeType,
  DeleteFeeType,
  CreateClassFeeStructure,
  GetClassFeeStructure,
  UpdateClassFeeStructure,
  DeleteClassFeeStructure,
  CreateInvoice,
  CreateBulkInvoices,
  UpdateInvoiceWithFine,
  AddInvoiceFine,
  AddPreviousDues,
  AddInvoiceDiscount,
  ReverseInvoiceFine,
  GetInvoices,
  GetFinesByInvoiceId,
  GetInvoiceById,
  DownloadInvoicePDF,
  DownloadCombinedPDF,
  DownloadPaymentReceiptPDF,
  DeleteInvoice,
  AddPaymentToInvoice,
  GetPayments,
  GetStudentFeeSummary,
  GetStudentFeeFullDetails,
  computeInvoiceLinesForClass,
  DisableAutoGenerate,
  BulkDeleteInvoices,
  DownloadBulkInvoicePDF,
  ExportDueInvoicesCSV,
  ExportPaymentHistoryCSV
};