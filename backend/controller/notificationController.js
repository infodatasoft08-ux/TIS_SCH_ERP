const pool = require("../db");

const getTodayNotifications = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { role_id } = req.user;

        // Map role_id to audience list
        let audiences = ["all"];
        if (role_id === 1) audiences.push("students", "parents");
        else if (role_id === 2) audiences.push("teachers");
        else if (role_id === 4) audiences.push("parents");
        else if (role_id === 3) audiences.push("staff");

        // Fetch notices for today
        const noticeSql = `
            SELECT id, title, 'notice' as type, created_at 
            FROM notices 
            WHERE audience IN (${audiences.map(() => "?").join(",")}) 
            AND is_published = 1 
            AND DATE(publish_at) = ?
            ORDER BY created_at DESC
        `;

        // Fetch events for today
        const eventSql = `
            SELECT id, title, 'event' as type, created_at 
            FROM events 
            WHERE DATE(event_date) = ?
            ORDER BY created_at DESC
        `;

        const [notices] = await pool.query(noticeSql, [...audiences, today]);
        const [events] = await pool.query(eventSql, [today]);

        const notifications = [...notices, ...events].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return res.json({
            success: true,
            notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error("Notification Error:", error);
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

module.exports = {
    getTodayNotifications
};
