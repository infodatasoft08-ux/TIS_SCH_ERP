const pool = require("../db");

const getTodayNotifications = async (req, res) => {
    try {
        const { role_id, id: userId } = req.user || {};
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Map role_id to audience list
        let audiences = ["all"];
        if (role_id === 1) audiences.push("students");
        else if (role_id === 2) audiences.push("teachers");
        else if (role_id === 4) audiences.push("parents", "students");
        else if (role_id === 3) audiences.push("staff");

        const audiencePlaceholders = audiences.map(() => "?").join(",");

        let notices = [];
        let events = [];
        let exams = [];
        let feeDues = [];

        // 1. Fetch Active Non-Expired Notices
        try {
            const noticeSql = `
                SELECT id, title, body, audience, 'notice' as type, publish_at, expire_at, image_url, created_at
                FROM notices
                WHERE audience IN (${audiencePlaceholders})
                  AND is_published = 1
                  AND (expire_at IS NULL OR expire_at >= NOW())
                  AND (publish_at IS NULL OR publish_at <= NOW())
                ORDER BY created_at DESC
                LIMIT 10
            `;
            const [rows] = await pool.query(noticeSql, audiences);
            notices = rows;
        } catch (err) {
            console.error("Notice notification error:", err.message);
        }

        // 2. Fetch Active / Upcoming Events
        try {
            const eventSql = `
                SELECT id, title, description as body, 'event' as type, event_date, start_time, end_time, location, image_url, created_at
                FROM events
                WHERE DATE(event_date) >= CURDATE()
                ORDER BY event_date ASC
                LIMIT 10
            `;
            const [rows] = await pool.query(eventSql);
            events = rows;
        } catch (err) {
            console.error("Event notification error:", err.message);
        }

        // 3. Fetch Published Exams
        try {
            let examSql = ``;
            let examParams = [];

            if (role_id === 1 || role_id === 4) {
                examSql = `
                    SELECT DISTINCT eg.id, COALESCE(NULLIF(TRIM(eg.custom_exam_name), ''), eg.name) as title, eg.name, eg.custom_exam_name, eg.exam_type, 'exam' as type, eg.start_date, eg.end_date, eg.is_results_published, eg.status, eg.created_at
                    FROM exam_groups eg
                    JOIN student_academic_records sar ON (eg.academic_year_id = sar.academic_year_id OR eg.academic_year_id IS NULL)
                      AND (
                        eg.class_id = sar.class_id 
                        OR (JSON_VALID(eg.section_ids) AND JSON_CONTAINS(eg.section_ids, CAST(sar.class_id AS CHAR)))
                        OR (eg.class_id IS NULL AND (eg.section_ids IS NULL OR eg.section_ids = '' OR eg.section_ids = '[]') AND eg.grade_id = sar.grade_id)
                      )
                    JOIN students s ON s.id = sar.student_id
                    LEFT JOIN parent_children pc ON pc.student_id = s.id
                    LEFT JOIN parents p ON p.id = pc.parent_id
                    WHERE (s.user_id = ? OR p.user_id = ?)
                      AND eg.status IN ('Published', 'Over')
                      AND (
                          -- 1. Upcoming or ongoing exams (end_date is today or in future)
                          ((eg.end_date IS NULL OR eg.end_date >= CURDATE()) AND eg.is_results_published = 0)
                          OR
                          -- 2. Recently published results (within last 14 days of publishing)
                          (eg.is_results_published = 1 AND eg.created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))
                      )
                    ORDER BY eg.created_at DESC
                    LIMIT 5
                `;
                examParams = [userId, userId];
            } else {
                examSql = `
                    SELECT id, COALESCE(NULLIF(TRIM(custom_exam_name), ''), name) as title, name, custom_exam_name, exam_type, 'exam' as type, start_date, end_date, is_results_published, status, created_at
                    FROM exam_groups
                    WHERE status IN ('Published', 'Over')
                      AND (
                        ((end_date IS NULL OR end_date >= CURDATE()) AND is_results_published = 0)
                        OR
                        (is_results_published = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY))
                    )
                    ORDER BY created_at DESC
                    LIMIT 5
                `;
            }
            const [rows] = await pool.query(examSql, examParams);
            exams = rows;
        } catch (err) {
            console.error("Exam notification error:", err.message);
        }

        // 4. Fetch Fee Dues for Student / Parent
        if (role_id === 1 || role_id === 4) {
            try {
                const feeSql = `
                    SELECT 
                        si.id, 
                        CONCAT('Payment Due: ₹', ROUND(GREATEST(si.amount_due - si.amount_paid, 0))) as title,
                        CONCAT('Outstanding balance of ₹', ROUND(GREATEST(si.amount_due - si.amount_paid, 0)), ' (Status: ', UPPER(si.status), ')') as body,
                        si.amount_due,
                        si.amount_paid,
                        si.status as fee_status,
                        'fee_due' as type,
                        si.created_at
                    FROM student_invoices si
                    JOIN students s ON s.id = si.student_id
                    LEFT JOIN parent_children pc ON pc.student_id = s.id
                    LEFT JOIN parents p ON p.id = pc.parent_id
                    WHERE (s.user_id = ? OR p.user_id = ?)
                      AND si.status IN ('pending', 'partially_paid', 'overdue')
                      AND (si.amount_due - si.amount_paid) > 0
                    ORDER BY si.created_at DESC
                    LIMIT 3
                `;
                const [rows] = await pool.query(feeSql, [userId, userId]);
                feeDues = rows;
            } catch (feeErr) {
                console.error("Fee dues notification error:", feeErr.message);
            }
        }

        const notifications = [...feeDues, ...notices, ...events, ...exams].sort((a, b) => new Date(b.created_at || b.event_date || 0) - new Date(a.created_at || a.event_date || 0));

        return res.json({
            success: true,
            notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error("Notification Controller Top-level Error:", error);
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

module.exports = {
    getTodayNotifications
};
