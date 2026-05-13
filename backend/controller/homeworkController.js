const db = require("../db");
const whatsappQueue = require("../queues/whatsappQueue");

const createHomework = async (req, res) => {
    const { title, grade_id, class_id, homework_date, academic_year_id, subject_homeworks } = req.body;

    // Parse subject_homeworks if it's a string (from FormData)
    let parsedSubjectHomeworks = subject_homeworks;
    if (typeof subject_homeworks === "string") {
        try {
            parsedSubjectHomeworks = JSON.parse(subject_homeworks);
        } catch (e) {
            console.error("Error parsing subject_homeworks:", e);
            return res.status(400).json({ error: "Invalid subject_homeworks format" });
        }
    }

    if (!title || !grade_id || !homework_date || !Array.isArray(parsedSubjectHomeworks)) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. Insert into homeworks
        const targetClassId = (class_id === "all" || !class_id) ? null : class_id;
        const attachment_url = req.file ? req.file.path : null;

        const [hwResult] = await conn.execute(
            "INSERT INTO homeworks (title, grade_id, class_id, academic_year_id, homework_date, attachment_url, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [title, grade_id, targetClassId, academic_year_id || null, homework_date, attachment_url]
        );
        const homeworkId = hwResult.insertId;

        // 2. Insert subject details
        const detailValues = [];
        const detailParams = [];
        for (const shw of parsedSubjectHomeworks) {
            if (shw.subject_id && shw.description) {
                detailValues.push("(?, ?, ?)");
                detailParams.push(homeworkId, shw.subject_id, shw.description);
            }
        }

        if (detailValues.length > 0) {
            await conn.execute(
                `INSERT INTO homework_details (homework_id, subject_id, description) VALUES ${detailValues.join(", ")}`,
                detailParams
            );
        }

        await conn.commit();

        // 3. Send WhatsApp Notifications (Async)
        // Fetch students in this class to get parent contacts
        // sendNotifications(homeworkId, title, grade_id, class_id, homework_date, subject_homeworks);



        return res.status(201).json({ message: "Homework created successfully", homeworkId });
    } catch (err) {
        await conn.rollback();
        console.error("createHomework error:", err);
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        conn.release();
    }
};

const sendHomeworkWhatsApp = async (req, res) => {
    const { id } = req.params;
    try {
        const [hwRows] = await db.execute("SELECT * FROM homeworks WHERE id = ?", [id]);
        if (hwRows.length === 0) return res.status(404).json({ error: "Homework not found" });
        const homework = hwRows[0];

        const [details] = await db.execute(
            `SELECT hd.*, s.name as subject_name 
             FROM homework_details hd 
             JOIN subjects s ON s.id = hd.subject_id 
             WHERE hd.homework_id = ?`,
            [id]
        );

        await sendNotifications(
            id,
            homework.title,
            homework.grade_id,
            homework.class_id,
            homework.homework_date,
            details,
            homework.attachment_url
        );

        return res.json({ message: "WhatsApp messages sent successfully" });
    } catch (err) {
        console.error("sendHomeworkWhatsApp error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const sendNotifications = async (homeworkId, title, grade_id, class_id, homework_date, subject_homeworks, attachment_url = null) => {
    try {
        // Fetch students and their parents
        let sql = `
            SELECT u.name as student_name, u.phone as student_phone, 
                   s.parent_contact, s.mother_contect,
                   c.name as class_name,
                   g.name as grade_name,
                   ay.name as academic_year
            FROM student_academic_records sar
            JOIN students s ON s.id = sar.student_id
            JOIN classes c ON c.id = sar.class_id
            JOIN grades g ON g.id = sar.grade_id
            JOIN academic_years ay ON ay.id = sar.academic_year_id
            JOIN users u ON u.id = s.user_id
            WHERE sar.grade_id = ?
        `;
        const params = [grade_id];
        if (class_id && class_id !== "all") {
            sql += " AND sar.class_id = ?";
            params.push(class_id);
        }

        const [students] = await db.execute(sql, params);

        const homeworkSummary = subject_homeworks.map(shw => `*${shw.subject_name || 'Subject'}*: ${shw.description}`).join("\n");
        const attachmentMsg = attachment_url ? `\n\n📄 *Download Material:* ${attachment_url}` : "";

        const messageTemplate = `📚 *HOMEWORK ASSIGNMENT*

Dear Parent,
Homework for *{student_name}* has been assigned for ${new Date(homework_date).toDateString()}.

*Title:* ${title}
*Details:*
${homeworkSummary}${attachmentMsg}

Please ensure the homework is completed.
- CMC`;

        for (const student of students) {
            // Collect all unique phone numbers
            const contacts = [
                student.student_phone,
                student.parent_contact
            ].filter(Boolean).map(num => num.trim());

            const uniqueContacts = [...new Set(contacts)];

            for (const phone of uniqueContacts) {
                const personalizedMessage = messageTemplate.replace("{student_name}", student.student_name);
                // await sendWhatsAppMessage(phone, personalizedMessage);
                await whatsappQueue.add('homeworkNotification', {
                    contact: phone,
                    jobType: 'homeworkNotification',
                    message: {
                        template: {
                            name: "student_homework_alert",
                            language: {
                                code: "en"
                            },
                            components: [
                                {
                                    type: "body",
                                    parameters: [
                                        {
                                            type: "text",
                                            text: student.student_name
                                        },
                                        {
                                            type: "text",
                                            text: student.class_name
                                        },
                                        {
                                            type: "text",
                                            text: homeworkSummary
                                        },
                                        {
                                            type: "text",
                                            text: new Date(homework_date).toDateString()
                                        },
                                        {
                                            type: "text",
                                            text: "TIMES INTERNATIONAL SCHOOL"
                                        },
                                        {
                                            type: "text",
                                            text: student.academic_year
                                        },
                                        {
                                            type: "text",
                                            text: attachment_url || ""
                                        }
                                    ]
                                }
                            ]
                        },
                        // Fallback normal text
                        fallbackText: personalizedMessage
                    }
                });
            }
        }
    } catch (err) {
        console.error("sendNotifications error:", err);
    }
};

const getHomeworks = async (req, res) => {
    try {
        const { grade_id, class_id, date } = req.query;
        let sql = `
            SELECT h.*, g.name as grade_name, c.name as class_name
            FROM homeworks h
            JOIN grades g ON g.id = h.grade_id
            LEFT JOIN classes c ON c.id = h.class_id
            WHERE 1=1
        `;
        const params = [];

        if (grade_id) {
            sql += " AND h.grade_id = ?";
            params.push(grade_id);
        }
        if (class_id) {
            sql += " AND h.class_id = ?";
            params.push(class_id);
        }
        if (date) {
            sql += " AND h.homework_date = ?";
            params.push(date);
        }

        sql += " ORDER BY h.homework_date DESC, h.id DESC";

        const [rows] = await db.execute(sql, params);

        // Fetch details for each homework (or do it in a separate call if rows are many)
        for (let row of rows) {
            const [details] = await db.execute(
                `SELECT hd.*, s.name as subject_name 
                 FROM homework_details hd 
                 JOIN subjects s ON s.id = hd.subject_id 
                 WHERE hd.homework_id = ?`,
                [row.id]
            );
            row.details = details;
        }

        return res.json({ homeworks: rows });
    } catch (err) {
        console.error("getHomeworks error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const updateHomework = async (req, res) => {
    const { id } = req.params;
    const { title, homework_date, subject_homeworks } = req.body;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // Parse subject_homeworks if it's a string (from FormData)
        let parsedSubjectHomeworks = subject_homeworks;
        if (typeof subject_homeworks === "string") {
            try {
                parsedSubjectHomeworks = JSON.parse(subject_homeworks);
            } catch (e) {
                console.error("Error parsing subject_homeworks:", e);
                return res.status(400).json({ error: "Invalid subject_homeworks format" });
            }
        }

        const attachment_url = req.file ? req.file.path : null;
        let updateSql = "UPDATE homeworks SET title = ?, homework_date = ?, updated_at = NOW()";
        const updateParams = [title, homework_date];

        if (attachment_url) {
            updateSql += ", attachment_url = ?";
            updateParams.push(attachment_url);
        }

        updateSql += " WHERE id = ?";
        updateParams.push(id);

        await conn.execute(updateSql, updateParams);

        // Simple approach: delete existing details and re-insert
        await conn.execute("DELETE FROM homework_details WHERE homework_id = ?", [id]);

        const detailValues = [];
        const detailParams = [];
        for (const shw of parsedSubjectHomeworks) {
            if (shw.subject_id && shw.description) {
                detailValues.push("(?, ?, ?)");
                detailParams.push(id, shw.subject_id, shw.description);
            }
        }

        if (detailValues.length > 0) {
            await conn.execute(
                `INSERT INTO homework_details (homework_id, subject_id, description) VALUES ${detailValues.join(", ")}`,
                detailParams
            );
        }

        await conn.commit();
        return res.json({ message: "Homework updated successfully" });
    } catch (err) {
        await conn.rollback();
        console.error("updateHomework error:", err);
        return res.status(500).json({ error: "Internal server error" });
    } finally {
        conn.release();
    }
};

const deleteHomework = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM homeworks WHERE id = ?", [id]);
        return res.json({ message: "Homework deleted successfully" });
    } catch (err) {
        console.error("deleteHomework error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const getStudentHomework = async (req, res) => {
    const { student_id } = req.params;
    try {
        // Get student's current grade and class
        const [studentRecs] = await db.execute(
            "SELECT grade_id, class_id FROM student_academic_records WHERE student_id = ? ORDER BY academic_year_id DESC LIMIT 1",
            [student_id]
        );

        if (studentRecs.length === 0) return res.json({ homeworks: [] });

        const { grade_id, class_id } = studentRecs[0];

        const [homeworks] = await db.execute(
            `SELECT h.*, g.name as grade_name, c.name as class_name
             FROM homeworks h
             JOIN grades g ON g.id = h.grade_id
             LEFT JOIN classes c ON c.id = h.class_id
             WHERE h.grade_id = ? AND (h.class_id IS NULL OR h.class_id = ?)
             ORDER BY h.homework_date DESC LIMIT 30`,
            [grade_id, class_id]
        );

        for (let row of homeworks) {
            const [details] = await db.execute(
                `SELECT hd.*, s.name as subject_name 
                 FROM homework_details hd 
                 JOIN subjects s ON s.id = hd.subject_id 
                 WHERE hd.homework_id = ?`,
                [row.id]
            );
            row.details = details;
        }

        return res.json({ homeworks });
    } catch (err) {
        console.error("getStudentHomework error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    createHomework,
    getHomeworks,
    updateHomework,
    deleteHomework,
    getStudentHomework,
    sendHomeworkWhatsApp
};
