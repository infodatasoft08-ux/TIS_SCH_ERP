// const cron = require('node-cron');
// const pool = require('../db');
// const { computeInvoiceLinesForClass } = require('../controller/feeController');

// const runAutoGenerateInvoices = async () => {
//   console.log('[CRON] Starting Auto-Generate Invoices job...');
//   const conn = await pool.getConnection();
//   try {
//     // find eligible invoices
//     const [invoices] = await conn.execute(
//       `SELECT * FROM student_invoices 
//        WHERE is_auto_generate = 1 
//        AND next_auto_invoice_id IS NULL 
//        AND period_end <= CURRENT_DATE`
//     );

//     if (invoices.length === 0) {
//       console.log('[CRON] No invoices to auto-generate today.');
//       return;
//     }

//     for (const oldInv of invoices) {
//       await conn.beginTransaction();
//       try {
//         // get fee types from old invoice lines
//         const [lines] = await conn.execute(
//           `SELECT fee_type_id FROM invoice_lines WHERE invoice_id = ?`,
//           [oldInv.id]
//         );
//         const feeTypeIds = lines.map(l => l.fee_type_id);

//         if (feeTypeIds.length === 0) {
//           console.log(`[CRON] Skipping invoice ${oldInv.id} - no fee types found.`);
//           await conn.rollback();
//           continue;
//         }

//         const months = oldInv.months_count;
//         const start = new Date(oldInv.period_end);
//         start.setDate(start.getDate() + 1); // Start next day
//         const startStr = start.toISOString().slice(0, 10);

//         const endDate = new Date(startStr + 'T00:00:00');
//         endDate.setMonth(endDate.getMonth() + months);
//         endDate.setDate(endDate.getDate() - 1);
//         const period_end = endDate.toISOString().slice(0, 10);

//         const { lines: computedLines, total } = await computeInvoiceLinesForClass(conn, oldInv.grade_id, months, feeTypeIds);

//         if (!computedLines || computedLines.length === 0) {
//            console.log(`[CRON] Skipping invoice ${oldInv.id} - no computed lines.`);
//            await conn.rollback();
//            continue;
//         }

//         const [prevInvoices] = await conn.execute(
//           `SELECT id, amount_due, amount_paid, period_start FROM student_invoices 
//            WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
//           [oldInv.student_id]
//         );

//         let prev_payment_dues = 0;
//         let prev_fine_dues = 0;
//         let prev_months = [];

//         for (const pinv of prevInvoices) {
//           const bal = Math.max(0, Number(pinv.amount_due) - Number(pinv.amount_paid));
//           if (bal > 0) {
//             const [fRows] = await conn.execute(`SELECT amount FROM invoice_fines WHERE invoice_id = ? AND is_reversed = 0 AND fine_type NOT LIKE 'previous_%'`, [pinv.id]);
//             const totalFines = fRows.reduce((acc, f) => acc + Number(f.amount), 0);

//             const unpaidFines = Math.min(bal, totalFines);
//             const unpaidFees = bal - unpaidFines;

//             prev_fine_dues += unpaidFines;
//             prev_payment_dues += unpaidFees;

//             const pinvDate = new Date(pinv.period_start);
//             const monthName = pinvDate.toLocaleString('en-IN', { month: 'long' });
//             if (!prev_months.includes(monthName)) {
//                prev_months.push(monthName);
//             }
//           }
//         }

//         const totalAmountDue = total + prev_payment_dues + prev_fine_dues;

//         // Insert new invoice
//         const [newInvResult] = await conn.execute(
//           `INSERT INTO student_invoices (student_id, student_academic_id, class_id, grade_id, period_start, period_end, months_count, amount_due, amount_paid, status, is_auto_generate, created_at)
//            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'pending', 1, NOW())`,
//           [oldInv.student_id, oldInv.student_academic_id, oldInv.class_id, oldInv.grade_id, startStr, period_end, months, totalAmountDue]
//         );

//         const newInvoiceId = newInvResult.insertId;

//         // Insert lines
//         const vals = computedLines.map(() => '(?, ?, ?)').join(', ');
//         const params = [];
//         computedLines.forEach(l => { params.push(newInvoiceId, l.fee_type_id, l.amount); });
//         await conn.execute(`INSERT INTO invoice_lines (invoice_id, fee_type_id, amount) VALUES ${vals}`, params);

//         // Insert carry forward fines
//         const monthStr = prev_months.length > 0 ? ` (${prev_months.join(', ')})` : '';

//         if (prev_payment_dues > 0) {
//           await conn.execute(
//             `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
//             [newInvoiceId, 'previous_dues', `Previous Payment Dues${monthStr}`, prev_payment_dues]
//           );
//         }
//         if (prev_fine_dues > 0) {
//           await conn.execute(
//             `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
//             [newInvoiceId, 'previous_fines', `Previous Fine Dues${monthStr}`, prev_fine_dues]
//           );
//         }

//         // update old invoice to prevent regeneration
//         await conn.execute(
//           `UPDATE student_invoices SET is_auto_generate = 0, next_auto_invoice_id = ? WHERE id = ?`,
//           [newInvoiceId, oldInv.id]
//         );

//         await conn.commit();
//         console.log(`[CRON] Auto-generated invoice ${newInvoiceId} from old invoice ${oldInv.id}`);
//       } catch (err) {
//         await conn.rollback();
//         console.error(`[CRON] Error processing invoice ${oldInv.id}:`, err);
//       }
//     }

//   } catch (err) {
//     console.error('[CRON] Auto-Generate Invoices job failed:', err);
//   } finally {
//     conn.release();
//   }
// };

// // Schedule it to run daily at 00:01 AM
// cron.schedule('1 0 * * *', () => {
//   runAutoGenerateInvoices();
// });

// module.exports = {
//   runAutoGenerateInvoices
// };




const cron = require('node-cron');
const pool = require('../db');
const { computeInvoiceLinesForClass } = require('../controller/feeController');

const runAutoGenerateInvoices = async () => {
  console.log('[CRON] Starting Auto-Generate Invoices job...');
  const conn = await pool.getConnection();
  try {
    // find eligible invoices
    const [invoices] = await conn.execute(
      `SELECT * FROM student_invoices 
            WHERE is_auto_generate = 1 
            AND next_auto_invoice_id IS NULL 
            AND period_end <= CURRENT_DATE`
    );

    if (invoices.length === 0) {
      console.log('[CRON] No invoices to auto-generate today.');
      return;
    }

    for (const oldInv of invoices) {
      await conn.beginTransaction();
      try {
        // get fee types from old invoice lines
        const [lines] = await conn.execute(
          `SELECT fee_type_id FROM invoice_lines WHERE invoice_id = ?`,
          [oldInv.id]
        );
        const feeTypeIds = lines.map(l => l.fee_type_id);

        if (feeTypeIds.length === 0) {
          console.log(`[CRON] Skipping invoice ${oldInv.id} - no fee types found.`);
          await conn.rollback();
          continue;
        }

        const months = oldInv.months_count;
        const start = new Date(oldInv.period_end);
        start.setDate(start.getDate() + 1); // Start next day
        const startStr = start.toISOString().slice(0, 10);

        const endDate = new Date(startStr + 'T00:00:00');
        endDate.setMonth(endDate.getMonth() + months);
        endDate.setDate(endDate.getDate() - 1);
        const period_end = endDate.toISOString().slice(0, 10);

        const { lines: computedLines, total } = await computeInvoiceLinesForClass(conn, oldInv.grade_id, months, feeTypeIds);

        if (!computedLines || computedLines.length === 0) {
          console.log(`[CRON] Skipping invoice ${oldInv.id} - no computed lines.`);
          await conn.rollback();
          continue;
        }

        const [prevInvoices] = await conn.execute(
          `SELECT id, amount_due, amount_paid, period_start, period_end FROM student_invoices 
                     WHERE student_id = ? AND status IN ('pending', 'partially_paid', 'overdue')`,
          [oldInv.student_id]
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

        // Insert new invoice
        const [newInvResult] = await conn.execute(
          `INSERT INTO student_invoices (student_id, student_academic_id, class_id, grade_id, period_start, period_end, months_count, amount_due, amount_paid, status, is_auto_generate, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 'pending', 1, NOW())`,
          [oldInv.student_id, oldInv.student_academic_id, oldInv.class_id, oldInv.grade_id, startStr, period_end, months, totalAmountDue]
        );

        const newInvoiceId = newInvResult.insertId;

        // Insert lines
        const vals = computedLines.map(() => '(?, ?, ?)').join(', ');
        const params = [];
        computedLines.forEach(l => { params.push(newInvoiceId, l.fee_type_id, l.amount); });
        await conn.execute(`INSERT INTO invoice_lines (invoice_id, fee_type_id, amount) VALUES ${vals}`, params);

        // Insert carried forward fines
        for (const cf of carried_fines) {
          await conn.execute(
            `INSERT INTO invoice_fines (invoice_id, fine_type, description, amount) VALUES (?, ?, ?, ?)`,
            [newInvoiceId, cf.type, cf.description, cf.amount]
          );
        }

        // update old invoice to prevent regeneration
        await conn.execute(
          `UPDATE student_invoices SET is_auto_generate = 0, next_auto_invoice_id = ? WHERE id = ?`,
          [newInvoiceId, oldInv.id]
        );

        await conn.commit();
        console.log(`[CRON] Auto-generated invoice ${newInvoiceId} from old invoice ${oldInv.id}`);
      } catch (err) {
        await conn.rollback();
        console.error(`[CRON] Error processing invoice ${oldInv.id}:`, err);
      }
    }

  } catch (err) {
    console.error('[CRON] Auto-Generate Invoices job failed:', err);
  } finally {
    conn.release();
  }
};

// Schedule it to run daily at 00:01 AM
cron.schedule('1 0 * * *', () => {
  runAutoGenerateInvoices();
});

module.exports = {
  runAutoGenerateInvoices
};