const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');

        // Check if image_url exists in subjects
        // const [subjectsCols] = await db.query('SHOW COLUMNS FROM subjects LIKE "image_url"');
        // if (subjectsCols.length === 0) {
        //     await db.query('ALTER TABLE subjects ADD COLUMN image_url VARCHAR(255) DEFAULT NULL');
        //     console.log('Added image_url column to subjects table');
        // }

        // Check if image_url exists in events
        // const [eventsCols] = await db.query('SHOW COLUMNS FROM events LIKE "image_url"');
        // if (eventsCols.length === 0) {
        //     await db.query('ALTER TABLE events ADD COLUMN image_url VARCHAR(255) DEFAULT NULL');
        //     console.log('Added image_url column to events table');
        // }

        // Check if section_ids exists in exam_groups
        const [examGroupsCols] = await db.query('SHOW COLUMNS FROM exam_groups LIKE "section_ids"');
        if (examGroupsCols.length === 0) {
            await db.query('ALTER TABLE exam_groups ADD COLUMN section_ids JSON DEFAULT NULL');
            console.log('Added section_ids column to exam_groups table');
        }

        // Check total_working_days in exam_groups
        const [twdCols] = await db.query('SHOW COLUMNS FROM exam_groups LIKE "total_working_days"');
        if (twdCols.length === 0) {
            await db.query('ALTER TABLE exam_groups ADD COLUMN total_working_days INT DEFAULT NULL');
            console.log('Added total_working_days to exam_groups');
        }

        // Check ptm_date in exam_groups
        const [ptmCols] = await db.query('SHOW COLUMNS FROM exam_groups LIKE "ptm_date"');
        if (ptmCols.length === 0) {
            await db.query('ALTER TABLE exam_groups ADD COLUMN ptm_date DATE DEFAULT NULL');
            console.log('Added ptm_date to exam_groups');
        }

        // Check next_class in exam_group_results
        const [ncCols] = await db.query('SHOW COLUMNS FROM exam_group_results LIKE "next_class"');
        if (ncCols.length === 0) {
            await db.query('ALTER TABLE exam_group_results ADD COLUMN next_class VARCHAR(100) DEFAULT NULL');
            console.log('Added next_class to exam_group_results');
        }

        // Check principal_remark in exam_group_results
        const [prCols] = await db.query('SHOW COLUMNS FROM exam_group_results LIKE "principal_remark"');
        if (prCols.length === 0) {
            await db.query('ALTER TABLE exam_group_results ADD COLUMN principal_remark VARCHAR(500) DEFAULT NULL');
            console.log('Added principal_remark to exam_group_results');
        }

        // Sub-fields for exam_group_subjects
        const newSubjectCols = [
            { col: 'has_written', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'has_reading', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'has_writing_comp', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'has_dictation', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'has_recitation', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'has_ia_pr', def: 'TINYINT(1) DEFAULT 0' },
            { col: 'written_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'reading_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'writing_comp_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'dictation_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'recitation_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'ia_pr_max_marks', def: 'DECIMAL(6,2) DEFAULT NULL' },
        ];
        for (const { col, def } of newSubjectCols) {
            const [colExists] = await db.query(`SHOW COLUMNS FROM exam_group_subjects LIKE "${col}"`);
            if (colExists.length === 0) {
                await db.query(`ALTER TABLE exam_group_subjects ADD COLUMN ${col} ${def}`);
                console.log(`Added ${col} to exam_group_subjects`);
            }
        }

        // Add new result mark columns to exam_group_results
        const newResultCols = [
            { col: 'written_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'reading_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'writing_comp_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'dictation_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'recitation_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
            { col: 'ia_pr_marks_obtained', def: 'DECIMAL(6,2) DEFAULT NULL' },
        ];
        for (const { col, def } of newResultCols) {
            const [colExists] = await db.query(`SHOW COLUMNS FROM exam_group_results LIKE "${col}"`);
            if (colExists.length === 0) {
                await db.query(`ALTER TABLE exam_group_results ADD COLUMN ${col} ${def}`);
                console.log(`Added ${col} to exam_group_results`);
            }
        }

        console.log('Migration completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
