const db = require("../db");

/**
 * Validates supplied academic_year_id or fetches the active academic year (status = 'active').
 * @param {number|string|null} requestedAyId - Optional requested academic year ID.
 * @param {object} connection - Optional DB connection or pool (defaults to db pool).
 * @returns {Promise<{ id: number, name: string, status: string }>} Valid active academic year object.
 * @throws {Error} Throws explicit Error if requested academic year is inactive/invalid, or if no active academic year exists.
 */
async function getActiveAcademicYear(requestedAyId = null, connection = db) {
  if (requestedAyId !== undefined && requestedAyId !== null && requestedAyId !== "") {
    const ayIdNum = Number(requestedAyId);
    if (isNaN(ayIdNum)) {
      throw new Error("Invalid Academic Year ID.");
    }

    const [rows] = await connection.execute(
      "SELECT id, name, status FROM academic_years WHERE id = ? AND status = 'active' LIMIT 1",
      [ayIdNum]
    );

    if (rows.length > 0) {
      return rows[0];
    }

    // Check if it exists but is inactive
    const [allRows] = await connection.execute(
      "SELECT id, name, status FROM academic_years WHERE id = ? LIMIT 1",
      [ayIdNum]
    );

    if (allRows.length > 0) {
      throw new Error(`Academic year '${allRows[0].name}' is inactive. Please select an active academic year.`);
    } else {
      throw new Error("Selected academic year does not exist.");
    }
  } else {
    // Fetch the active academic year automatically
    const [rows] = await connection.execute(
      "SELECT id, name, status FROM academic_years WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );

    if (rows.length === 0) {
      throw new Error("No active academic year found in the system. Please activate an academic year first.");
    }

    return rows[0];
  }
}

async function ensureAcademicYearInFeeStructure(connection = db) {
  try {
    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'class_fee_structure' AND COLUMN_NAME = 'academic_year_id'`
    );
    if (cols.length === 0) {
      await connection.execute(`ALTER TABLE class_fee_structure ADD COLUMN academic_year_id INT NULL AFTER grade_id`);
    }
  } catch (err) {
    console.error("ensureAcademicYearInFeeStructure error:", err.message);
  }
}

module.exports = {
  getActiveAcademicYear,
  ensureAcademicYearInFeeStructure
};
