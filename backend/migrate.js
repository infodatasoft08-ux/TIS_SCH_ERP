const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Check if image_url exists in subjects
        const [subjectsCols] = await db.query('SHOW COLUMNS FROM subjects LIKE "image_url"');
        if (subjectsCols.length === 0) {
            await db.query('ALTER TABLE subjects ADD COLUMN image_url VARCHAR(255) DEFAULT NULL');
            console.log('Added image_url column to subjects table');
        } else {
            console.log('image_url column already exists in subjects table');
        }

        // Check if image_url exists in events
        const [eventsCols] = await db.query('SHOW COLUMNS FROM events LIKE "image_url"');
        if (eventsCols.length === 0) {
            await db.query('ALTER TABLE events ADD COLUMN image_url VARCHAR(255) DEFAULT NULL');
            console.log('Added image_url column to events table');
        } else {
            console.log('image_url column already exists in events table');
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
