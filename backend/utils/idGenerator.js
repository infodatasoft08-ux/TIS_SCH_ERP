const db = require('../db');

/**
 * Generates the next sequential ID based on a prefix and the current maximum ID in the specified table/column.
 * @param {string} prefix The prefix to use (e.g., 'ADMS', 'EMP').
 * @param {string} tableName The name of the table to check.
 * @param {string} columnName The name of the column to check.
 * @param {number} padding The number of digits for the sequential part (default: 3).
 * @returns {Promise<string>} The generated ID.
 */
async function generateNextId(prefix, tableName, columnName, padding = 4) {
    if (!prefix) return null;

    try {
        // Query to find the highest existing ID with this prefix
        const [rows] = await db.execute(
            `SELECT ${columnName} FROM ${tableName} WHERE ${columnName} LIKE ? ORDER BY ${columnName} DESC LIMIT 1`,
            [`${prefix}%`]
        );

        let nextNumber = 1;

        if (rows.length > 0) {
            const lastId = rows[0][columnName];
            // Extract the numeric part after the prefix
            const numericPart = lastId.substring(prefix.length);
            const lastNumber = parseInt(numericPart, 10);

            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }

        // Format: PREFIX0001
        const sequentialPart = nextNumber.toString().padStart(padding, '0');
        return `${prefix}${sequentialPart}`;
    } catch (error) {
        console.error(`Error generating ID for ${tableName}.${columnName}:`, error);
        throw error;
    }
}

module.exports = { generateNextId };
