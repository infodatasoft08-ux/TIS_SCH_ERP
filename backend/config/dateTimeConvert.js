function formatSQLDateTime(dateTime) {
    if (!dateTime) return null;

    // If it's already a string in the correct format, return it
    if (typeof dateTime === 'string' && dateTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        return dateTime;
    }

    // If it's a Date object or ISO string, format it
    const date = new Date(dateTime);

    // Get local time components
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

module.exports = formatSQLDateTime;