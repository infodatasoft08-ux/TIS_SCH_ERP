function formatMySQLDate(date) {
  if (!date) return null;

  // If date is already a string in yyyy-mm-dd format
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // If it's a Date object
  if (date instanceof Date) {
    // Get date components directly (no timezone conversion)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

module.exports = formatMySQLDate;