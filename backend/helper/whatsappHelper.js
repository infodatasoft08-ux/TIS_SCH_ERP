const axios = require('axios');
require('dotenv').config();

/**
 * Sends a WhatsApp message using a configured API or logs it to console.
 * @param {string} to - The recipient's phone number (with country code).
 * @param {string|object} message - The message content (string for text, object for template).
 */
const sendWhatsAppMessage = async (to, message) => {
    if (!to) {
        console.warn('No phone number provided');
        return;
    }

    // Clean number
    let cleanTo = to.replace(/\D/g, '');
    if (cleanTo.length === 10) {
        cleanTo = '91' + cleanTo;
    }

    let payload;
    if (typeof message === 'object' && message.template) {
        // Template message
        payload = {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: "template",
            template: message.template
        };
    } else {
        // Plain text message
        payload = {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: "text",
            text: {
                body: message
            }
        };
    }

    try {
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
            payload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(`✅ WhatsApp sent to ${cleanTo}`);
        return response.data;
    } catch (error) {
        const errorData = error.response?.data || error.message;
        console.error(`❌ WhatsApp Error for ${cleanTo}:`, JSON.stringify(errorData, null, 2));

        if (error.response?.data?.error?.code === 131030) {
            console.warn(`💡 TIP: The number ${cleanTo} is not in your Meta App's "Allowed numbers" list. Add it in the Meta Developer Dashboard to fix this.`);
        }
        return { error: errorData };
    }
};

module.exports = { sendWhatsAppMessage };
