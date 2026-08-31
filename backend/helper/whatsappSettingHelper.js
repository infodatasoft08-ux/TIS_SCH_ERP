const pool = require('../db');
require('dotenv').config();

/**
 * Checks if WhatsApp notifications are enabled in school settings AND credentials exist in .env
 * @returns {Promise<boolean>}
 */
const isWhatsAppEnabled = async () => {
    // 1. Check if Meta Graph API credentials exist in .env
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneId || token.trim() === '' || phoneId.trim() === '' || token.includes('your_') || phoneId.includes('your_')) {
        return false;
    }

    // 2. Check if whatsapp_enabled setting is turned on in school_settings table
    try {
        const [rows] = await pool.query('SELECT setting_value FROM school_settings WHERE setting_key = "whatsapp_enabled"');
        if (rows && rows.length > 0) {
            const val = String(rows[0].setting_value).toLowerCase().trim();
            if (val === '0' || val === 'false' || val === 'off' || val === 'disabled') {
                return false;
            }
            if (val === '1' || val === 'true' || val === 'on' || val === 'enabled') {
                return true;
            }
        }
        // Default to false if setting is not present or not set to 1/true/on/enabled
        return false;
    } catch (err) {
        console.error('Error checking whatsapp_enabled setting:', err.message);
        return false;
    }
};

module.exports = { isWhatsAppEnabled };
