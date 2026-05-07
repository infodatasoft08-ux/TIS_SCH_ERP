const pool = require('../db');
const { deleteFromCloudinary } = require('../helper/cloudinaryHelper');

/**
 * POST /api/school-gallery/upload
 * Handles both logo and gallery uploads.
 */
const uploadImage = async (req, res) => {
    const { type } = req.body; // 'logo' or 'gallery'
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });
    if (!['logo', 'gallery'].includes(type)) {
        await deleteFromCloudinary(req.file.path);
        return res.status(400).json({ error: 'Invalid image type' });
    }

    const imageUrl = req.file.path;
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        if (type === 'logo') {
            // Delete old logo from Cloudinary and DB
            const [oldLogo] = await conn.execute('SELECT id, image_url FROM school_galleries WHERE image_type = "logo"');
            if (oldLogo.length > 0) {
                await deleteFromCloudinary(oldLogo[0].image_url);
                await conn.execute('DELETE FROM school_galleries WHERE id = ?', [oldLogo[0].id]);
            }
        }

        const [result] = await conn.execute(
            'INSERT INTO school_galleries (image_url, image_type) VALUES (?, ?)',
            [imageUrl, type]
        );

        await conn.commit();
        return res.status(201).json({
            id: result.insertId,
            image_url: imageUrl,
            image_type: type
        });
    } catch (err) {
        await conn.rollback();
        await deleteFromCloudinary(imageUrl);
        console.error('Upload Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        conn.release();
    }
};

/**
 * GET /api/school-gallery
 */
const getImages = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM school_galleries ORDER BY created_at DESC');
        return res.json({ images: rows });
    } catch (err) {
        console.error('Fetch Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * DELETE /api/school-gallery/:id
 */
const deleteImage = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.execute('SELECT * FROM school_galleries WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Image not found' });

        const image = rows[0];
        await deleteFromCloudinary(image.image_url);
        await pool.execute('DELETE FROM school_galleries WHERE id = ?', [id]);

        return res.json({ success: true, deleted_id: id });
    } catch (err) {
        console.error('Delete Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM school_settings');
        const settings = rows.reduce((acc, row) => {
            acc[row.setting_key] = row.setting_value;
            return acc;
        }, {});
        res.json({ settings });
    } catch (error) {
        console.error('Get Settings Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateSettings = async (req, res) => {
    const { settings } = req.body; // Expecting { school_name: "..." }
    if (!settings) return res.status(400).json({ message: "Settings required" });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        for (const [key, value] of Object.entries(settings)) {
            await conn.query(
                'INSERT INTO school_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, value, value]
            );
        }

        await conn.commit();
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Update Settings Error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        conn.release();
    }
};

module.exports = {
    uploadImage,
    getImages,
    deleteImage,
    getSettings,
    updateSettings
};
