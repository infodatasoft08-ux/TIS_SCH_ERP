const axios = require('axios');
require('dotenv').config();

const sendWhatsAppMessage = async (to, message) => {

    if (!to) {
        console.warn('No phone number provided');
        return;
    }

    // Clean phone number
    let cleanTo = to.replace(/\D/g, '');

    if (cleanTo.length === 10) {
        cleanTo = '91' + cleanTo;
    }

    // Base payload creator
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

        let textBody = typeof msg === 'string' ? msg : JSON.stringify(msg);
        if (typeof msg === 'object' && !msg.template && msg.fallbackText) {
            textBody = msg.fallbackText;
        }

        // Text message
        return {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: "text",
            text: {
                body: textBody
            }
        };
    };

    try {

        // Try sending original message
        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
            createPayload(message),
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

        console.error(
            `❌ WhatsApp Error for ${cleanTo}:`,
            JSON.stringify(errorData, null, 2)
        );

        // -----------------------------------
        // FALLBACK TO NORMAL TEXT MESSAGE
        // -----------------------------------

        const isTemplateError =
            typeof message === 'object' &&
            message.template;

        if (isTemplateError) {

            console.log('⚠️ Template failed. Sending normal text message...');

            try {

                // Create fallback text
                const fallbackText =
                    message.fallbackText ||
                    'Fee invoice generated successfully.';

                const fallbackResponse = await axios.post(
                    `https://graph.facebook.com/v25.0/${process.env.PHONE_NUMBER_ID}/messages`,
                    createPayload(fallbackText),
                    {
                        headers: {
                            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
                            "Content-Type": "application/json"
                        }
                    }
                );

                console.log(`✅ Fallback text sent to ${cleanTo}`);

                return fallbackResponse.data;

            } catch (fallbackError) {

                console.error(
                    `❌ Fallback message failed for ${cleanTo}:`,
                    fallbackError.response?.data || fallbackError.message
                );

                return {
                    error: fallbackError.response?.data || fallbackError.message
                };
            }
        }

        return { error: errorData };
    }
};

module.exports = { sendWhatsAppMessage };