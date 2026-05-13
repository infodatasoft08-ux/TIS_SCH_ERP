const db = require("../db");
const ExcelJS = require('exceljs');
const moment = require('moment');

/**
 * Helper function to generate pristine premium Excel/CSV spreadsheets
 */
const generateSpreadsheet = async (res, sheetName, columns, data, filename, format = 'xlsx') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] // Freeze top row
  });

  // Define structured columns mapping exactly to Bulk Upload inputs
  sheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: 15
  }));

  // Style header row for a beautiful, premium visual presentation
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Deep rich royal blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  // Insert records row by row ensuring dates/nulls are processed nicely
  data.forEach(item => {
    const rowValues = {};
    columns.forEach(col => {
      let val = item[col.key];
      if (val instanceof Date) {
        val = moment(val).format('YYYY-MM-DD');
      }
      rowValues[col.key] = val !== null && val !== undefined ? val : '';
    });
    sheet.addRow(rowValues);
  });

  // Implement auto-fit columns logic to guarantee all content is fully legible
  sheet.columns.forEach(column => {
    let maxLen = column.header ? column.header.length : 10;
    column.eachCell({ includeEmpty: false }, cell => {
      const cellLen = cell.value ? cell.value.toString().length : 0;
      if (cellLen > maxLen) {
        maxLen = cellLen;
      }
    });
    column.width = Math.min(Math.max(maxLen + 3, 12), 60);
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    await workbook.csv.write(res);
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
  }
  res.end();
};

/**
 * Export Students matching bulk upload template exactly
 */
const exportStudents = async (req, res) => {
  try {
    const { ids, format } = req.query;
    let whereClause = "";
    const params = [];

    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        whereClause = `WHERE s.user_id IN (${idArray.map(() => '?').join(',')})`;
        params.push(...idArray);
      }
    }

    const query = `
      SELECT 
        u.name, u.email, '' AS password, u.phone, u.gender, 
        s.admission_no, g.name AS grade, c.name AS class, ay.name AS academic_year,
        u.address, s.admission_date, s.date_of_birth, sar.roll_no, u.adhar_no,
        s.blood_group, s.fathers_name, s.mothers_name, s.father_occupation,
        s.mother_contect, s.parent_contact
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_academic_records sar ON sar.student_id = s.id
      LEFT JOIN grades g ON sar.grade_id = g.id
      LEFT JOIN classes c ON sar.class_id = c.id
      LEFT JOIN academic_years ay ON sar.academic_year_id = ay.id
      ${whereClause}
      ORDER BY s.created_at DESC
    `;

    const [rows] = await db.query(query, params);

    const columns = [
      { header: 'name', key: 'name' },
      { header: 'email', key: 'email' },
      { header: 'password', key: 'password' },
      { header: 'phone', key: 'phone' },
      { header: 'gender', key: 'gender' },
      { header: 'admission_no', key: 'admission_no' },
      { header: 'grade', key: 'grade' },
      { header: 'class', key: 'class' },
      { header: 'academic_year', key: 'academic_year' },
      { header: 'address', key: 'address' },
      { header: 'admission_date', key: 'admission_date' },
      { header: 'date_of_birth', key: 'date_of_birth' },
      { header: 'roll_no', key: 'roll_no' },
      { header: 'adhar_no', key: 'adhar_no' },
      { header: 'blood_group', key: 'blood_group' },
      { header: 'fathers_name', key: 'fathers_name' },
      { header: 'mothers_name', key: 'mothers_name' },
      { header: 'father_occupation', key: 'father_occupation' },
      { header: 'mother_contect', key: 'mother_contect' },
      { header: 'parent_contact', key: 'parent_contact' }
    ];

    await generateSpreadsheet(res, 'Students', columns, rows, 'Students_Export', format);
  } catch (err) {
    console.error("exportStudents error:", err);
    res.status(500).json({ error: "Internal server error exporting students." });
  }
};

/**
 * Export Teachers matching bulk upload template exactly
 */
const exportTeachers = async (req, res) => {
  try {
    const { ids, format } = req.query;
    let whereClause = "";
    const params = [];

    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        whereClause = `WHERE t.user_id IN (${idArray.map(() => '?').join(',')})`;
        params.push(...idArray);
      }
    }

    const query = `
      SELECT 
        u.name, u.email, '' AS password, u.phone, u.gender,
        t.employee_code, t.hire_date, t.qualification, u.address, u.adhar_no, t.bio
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
    `;

    const [rows] = await db.query(query, params);

    const columns = [
      { header: 'name', key: 'name' },
      { header: 'email', key: 'email' },
      { header: 'password', key: 'password' },
      { header: 'phone', key: 'phone' },
      { header: 'gender', key: 'gender' },
      { header: 'employee_code', key: 'employee_code' },
      { header: 'hire_date', key: 'hire_date' },
      { header: 'qualification', key: 'qualification' },
      { header: 'address', key: 'address' },
      { header: 'adhar_no', key: 'adhar_no' },
      { header: 'bio', key: 'bio' }
    ];

    await generateSpreadsheet(res, 'Teachers', columns, rows, 'Teachers_Export', format);
  } catch (err) {
    console.error("exportTeachers error:", err);
    res.status(500).json({ error: "Internal server error exporting teachers." });
  }
};

/**
 * Export Staff matching bulk upload template exactly
 */
const exportStaff = async (req, res) => {
  try {
    const { ids, format } = req.query;
    let whereClause = "";
    const params = [];

    if (ids) {
      const idArray = ids.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (idArray.length > 0) {
        whereClause = `WHERE st.user_id IN (${idArray.map(() => '?').join(',')})`;
        params.push(...idArray);
      }
    }

    const query = `
      SELECT 
        u.name, u.email, '' AS password, u.phone, u.gender,
        st.employee_code, st.department, u.address, u.adhar_no, u.sub_role, u.role_id
      FROM staff st
      JOIN users u ON st.user_id = u.id
      ${whereClause}
      ORDER BY u.created_at DESC
    `;

    const [rows] = await db.query(query, params);

    const columns = [
      { header: 'name', key: 'name' },
      { header: 'email', key: 'email' },
      { header: 'password', key: 'password' },
      { header: 'phone', key: 'phone' },
      { header: 'gender', key: 'gender' },
      { header: 'employee_code', key: 'employee_code' },
      { header: 'department', key: 'department' },
      { header: 'sub_role', key: 'sub_role' },
      { header: 'role_id', key: 'role_id' },
      { header: 'address', key: 'address' },
      { header: 'adhar_no', key: 'adhar_no' }
    ];

    await generateSpreadsheet(res, 'Staff', columns, rows, 'Staff_Export', format);
  } catch (err) {
    console.error("exportStaff error:", err);
    res.status(500).json({ error: "Internal server error exporting staff." });
  }
};

module.exports = {
  exportStudents,
  exportTeachers,
  exportStaff
};
