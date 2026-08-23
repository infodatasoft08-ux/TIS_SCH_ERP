/**
 * Utility to sanitize phone numbers and phone-based passwords.
 * Strips leading/trailing whitespace, all internal spaces and hyphens,
 * and removes leading '+91', '+', or 12-digit '91' country code prefixes.
 *
 * Examples:
 *   "+91 9128102151"  -> "9128102151"
 *   "+919128102151"   -> "9128102151"
 *   " 9128102151 "    -> "9128102151"
 *   "+91-9128102151"  -> "9128102151"
 *   "+91 91281 02151" -> "9128102151"
 *   "919128102151"    -> "9128102151"
 */
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let str = String(phone).trim().replace(/\D/g, '');
  if (str.length > 10) {
    str = str.slice(-10);
  }
  return str;
}

module.exports = {
  cleanPhoneNumber
};
