const db = require("../db");
const { deleteFromCloudinary } = require("../helper/cloudinaryHelper");

const toInt = v => (v === undefined || v === null ? null : Number(v));

/**
 * Add a new note
 */
const AddNote = async (req, res) => {
    const { subject_id, teacher_id, grade_id, class_id, note_name, description, uploaded_date } = req.body;
    const file_url = req.file ? req.file.path : null;

    if (!subject_id || !teacher_id || !grade_id || !class_id || !note_name || !file_url) {
        if (file_url) await deleteFromCloudinary(file_url);
        // If file was uploaded but validation failed, we should ideally delete it, but for simplicity:
        return res.status(400).json({ error: "Required fields: subject_id, teacher_id, grade_id, class_id, note_name, and file" });
    }

    // Determine file type based on extension
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let file_type = 'image';
    if (ext === 'pdf') file_type = 'pdf';
    else if (['doc', 'docx'].includes(ext)) file_type = 'word';

    try {
        const [result] = await db.execute(
            `INSERT INTO notes (subject_id, teacher_id, grade_id, class_id, note_name, description, file_url, file_type, uploaded_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [subject_id, teacher_id, grade_id, class_id, note_name, description || null, file_url, file_type, uploaded_date || new Date()]
        );

        res.status(201).json({ success: true, message: "Note uploaded successfully", note_id: result.insertId });
    } catch (err) {
        console.error("AddNote Error:", err);
        if (file_url) await deleteFromCloudinary(file_url);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get notes with filters
 */
const GetNotes = async (req, res) => {
    const { subject_id, class_id, grade_id, teacher_id } = req.query;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    let query = `
        SELECT n.*, s.name as subject_name, t_u.name as teacher_name, g.name as grade_name, c.name as class_name
        FROM notes n
        JOIN subjects s ON n.subject_id = s.id
        JOIN teachers t ON n.teacher_id = t.id
        JOIN users t_u ON t.user_id = t_u.id
        JOIN grades g ON n.grade_id = g.id
        JOIN classes c ON n.class_id = c.id
        WHERE 1=1
    `;
    const params = [];

    if (subject_id) { query += " AND n.subject_id = ?"; params.push(subject_id); }
    if (class_id) { query += " AND n.class_id = ?"; params.push(class_id); }
    if (grade_id) { query += " AND n.grade_id = ?"; params.push(grade_id); }
    if (teacher_id) { query += " AND n.teacher_id = ?"; params.push(teacher_id); }

    query += ` ORDER BY n.uploaded_date DESC, n.id DESC LIMIT ${limit} OFFSET ${offset}`;
    
    try {
        const [rows] = await db.execute(query, params);
        res.json({ notes: rows });
    } catch (err) {
        console.error("GetNotes Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Update a note
 */
const UpdateNote = async (req, res) => {
    const id = req.params.id;
    const { subject_id, grade_id, class_id, note_name, description, uploaded_date } = req.body;

    try {
        const [existing] = await db.execute("SELECT * FROM notes WHERE id = ?", [id]);
        if (existing.length === 0) return res.status(404).json({ error: "Note not found" });

        const oldFileUrl = existing[0].file_url;
        let newFileUrl = oldFileUrl;
        let newFileType = existing[0].file_type;

        if (req.file) {
            newFileUrl = req.file.path;
            const ext = req.file.originalname.split('.').pop().toLowerCase();
            newFileType = 'image';
            if (ext === 'pdf') newFileType = 'pdf';
            else if (['doc', 'docx'].includes(ext)) newFileType = 'word';
            // We shouldn't delete the old file immediately, we should delete it after DB update is successful.
        }

        await db.execute(
            `UPDATE notes SET subject_id=?, grade_id=?, class_id=?, note_name=?, description=?, file_url=?, file_type=?, uploaded_date=?
             WHERE id=?`,
            [
                subject_id || existing[0].subject_id,
                grade_id || existing[0].grade_id,
                class_id || existing[0].class_id,
                note_name || existing[0].note_name,
                description !== undefined ? description : existing[0].description,
                newFileUrl,
                newFileType,
                uploaded_date || existing[0].uploaded_date,
                id
            ]
        );

        // Then delete the old file after updating successfully
        if (req.file && oldFileUrl) {
            await deleteFromCloudinary(oldFileUrl);
        }

        res.json({ success: true, message: "Note updated successfully" });
    } catch (err) {
        console.error("UpdateNote Error:", err);
        if (req.file && req.file.path) await deleteFromCloudinary(req.file.path);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Delete a note
 */
const DeleteNote = async (req, res) => {
    const id = req.params.id;
    try {
        const [existing] = await db.execute("SELECT file_url FROM notes WHERE id = ?", [id]);
        if (existing.length === 0) return res.status(404).json({ error: "Note not found" });

        const fileUrl = existing[0].file_url;

        // Delete from DB
        await db.execute("DELETE FROM notes WHERE id = ?", [id]);

        // Delete from Cloudinary
        await deleteFromCloudinary(fileUrl);

        res.json({ success: true, message: "Note deleted successfully" });
    } catch (err) {
        console.error("DeleteNote Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    AddNote,
    GetNotes,
    UpdateNote,
    DeleteNote
};
