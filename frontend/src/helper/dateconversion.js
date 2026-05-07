const convertToYYYYMMDD = (dateValue) => {
  if (!dateValue) return null;

  // If already in yyyy-mm-dd format
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  // If it's an ISO string
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
}

const formatDateTimeTo12Hour = (datetimeString) => {
  if (!datetimeString) return '';

  try {
    const date = new Date(datetimeString);
    // Extract just the time part and format
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return datetimeString;
  }
};

const DateTimeTo12Hour = (datetimeString) => {
  if (!datetimeString) return '';

  try {
    const date = new Date(datetimeString);
    // Extract just the time part and format
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${year}/${month}/${day}${hours}:${minutes} ${ampm}`;
  } catch {
    return datetimeString;
  }
};
export { convertToYYYYMMDD, formatDateTimeTo12Hour, DateTimeTo12Hour };