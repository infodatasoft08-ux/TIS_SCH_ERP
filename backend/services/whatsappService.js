const axios = require('axios');
require('dotenv').config();

/**
 * Service to handle sending WhatsApp Template messages using Meta Cloud API.
 * This abstracts the API logic away from the queue worker.
 */
class WhatsAppService {
    /**
     * Sends a WhatsApp message (template or text)
     * @param {string} to - The recipient phone number
     * @param {object|string} message - The message object (template) or string
     * @returns {Promise<object>} API response
     */
    async sendWhatsAppTemplate(to, message) {
        if (!to) {
            throw new Error('No phone number provided');
        }

        // Clean phone number
        let cleanTo = to.replace(/\D/g, '');
        if (cleanTo.length === 10) {
            cleanTo = '91' + cleanTo;
        }

        const createPayload = (msg) => {
            // Template message
            if (typeof msg === 'object' && msg.template) {
                return {
                    messaging_product: "whatsapp",
                    to: cleanTo,
                    type: "template",
                    template: msg.template
                };
            }

            // Text message fallback
            return {
                messaging_product: "whatsapp",
                to: cleanTo,
                type: "text",
                text: {
                    body: typeof msg === 'string' ? msg : JSON.stringify(msg)
                }
            };
        };

        try {
            // Try sending original message
            const response = await axios.post(
                `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
                createPayload(message),
                {
                    headers: {
                        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            return response.data;
        } catch (error) {
            const errorData = error.response?.data || error.message;
            console.error(`❌ WhatsApp Error for ${cleanTo}:`, JSON.stringify(errorData, null, 2));

            // -----------------------------------
            // FALLBACK TO NORMAL TEXT MESSAGE
            // -----------------------------------
            const isTemplateError = typeof message === 'object' && message.template;

            if (isTemplateError && message.fallbackText) {
                console.log('⚠️ Template failed. Sending fallback text message...');
                try {
                    const fallbackResponse = await axios.post(
                        `https://graph.facebook.com/v22.0/${process.env.PHONE_NUMBER_ID}/messages`,
                        createPayload(message.fallbackText),
                        {
                            headers: {
                                Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                                "Content-Type": "application/json"
                            }
                        }
                    );
                    return fallbackResponse.data;
                } catch (fallbackError) {
                    throw new Error(`Fallback failed: ${JSON.stringify(fallbackError.response?.data || fallbackError.message)}`);
                }
            }

            throw new Error(`Meta API Error: ${JSON.stringify(errorData)}`);
        }
    }
}

module.exports = new WhatsAppService();