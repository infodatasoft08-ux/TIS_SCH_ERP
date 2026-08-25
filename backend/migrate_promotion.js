const db = require('./db');

async function migratePromotion() {
    const conn = await db.getConnection();
    try {
        console.log("🔍 [PROD SAFETY CHECK] Starting production migration for student_academic_records...");

        // 0. Pre-flight check: Detect potential duplicate (student_id, academic_year_id) rows in existing production data
        const [duplicates] = await conn.query(`
            SELECT student_id, academic_year_id, COUNT(*) as count_records 
            FROM student_academic_records 
            WHERE student_id IS NOT NULL AND academic_year_id IS NOT NULL
            GROUP BY student_id, academic_year_id 
            HAVING count_records > 1
        `);

        if (duplicates.length > 0) {
            console.warn(`⚠️ Warning: Found ${duplicates.length} duplicate (student_id, academic_year_id) records in production.`);
            console.log("Cleaning up duplicate records keeping the latest entry for each student/session...");
            
            // Deduplicate: Keep the latest record (MAX id) for each student_id & academic_year_id pair
            for (const dup of duplicates) {
                await conn.query(`
                    DELETE FROM student_academic_records 
                    WHERE student_id = ? AND academic_year_id = ? 
                      AND id NOT IN (
                          SELECT max_id FROM (
                              SELECT MAX(id) as max_id 
                              FROM student_academic_records 
                              WHERE student_id = ? AND academic_year_id = ?
                          ) as tmp
                      )
                `, [dup.student_id, dup.academic_year_id, dup.student_id, dup.academic_year_id]);
            }
            console.log("✅ Duplicate cleanup complete.");
        } else {
            console.log("✅ Pre-flight check passed: No duplicate (student_id, academic_year_id) pairs found.");
        }

        // 1. Find existing foreign keys on student_id in student_academic_records
        const [fks] = await conn.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'student_academic_records' 
              AND COLUMN_NAME = 'student_id'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);

        for (const fk of fks) {
            try {
                await conn.query(`ALTER TABLE student_academic_records DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
                console.log(`Dropped FK constraint: ${fk.CONSTRAINT_NAME}`);
            } catch (e) {
                console.log(`Notice dropping FK ${fk.CONSTRAINT_NAME}:`, e.message);
            }
        }

        // 2. Check existing indexes
        const [indexes] = await conn.query(`SHOW INDEX FROM student_academic_records`);
        const indexMap = new Map();
        for (const idx of indexes) {
            if (!indexMap.has(idx.Key_name)) {
                indexMap.set(idx.Key_name, []);
            }
            indexMap.get(idx.Key_name).push(idx);
        }

        // Drop single 'student_id' unique constraint if present
        if (indexMap.has('student_id')) {
            try {
                await conn.query(`ALTER TABLE student_academic_records DROP INDEX student_id`);
                console.log("Dropped index: student_id");
            } catch (e) {
                console.log("Notice dropping index student_id:", e.message);
            }
        }

        // Add non-unique index on student_id if not existing
        if (!indexMap.has('idx_student_id')) {
            try {
                await conn.query(`ALTER TABLE student_academic_records ADD INDEX idx_student_id (student_id)`);
                console.log("Added index: idx_student_id");
            } catch (e) {
                console.log("Notice adding idx_student_id:", e.message);
            }
        }

        // Re-attach foreign key ON DELETE CASCADE
        try {
            await conn.query(`
                ALTER TABLE student_academic_records ADD CONSTRAINT fk_sar_student 
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            `);
            console.log("Attached Foreign Key constraint: fk_sar_student");
        } catch (e) {
            console.log("Notice adding FK fk_sar_student:", e.message);
        }

        // Add Composite UNIQUE index idx_student_academic_year (student_id, academic_year_id)
        if (!indexMap.has('idx_student_academic_year')) {
            try {
                await conn.query(`
                    ALTER TABLE student_academic_records ADD UNIQUE KEY idx_student_academic_year (student_id, academic_year_id)
                `);
                console.log("Added Composite UNIQUE index: idx_student_academic_year");
            } catch (e) {
                console.log("Notice adding idx_student_academic_year:", e.message);
            }
        } else {
            console.log("Composite UNIQUE index idx_student_academic_year already exists.");
        }

        console.log("🎉 Production DB Migration finished successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    } finally {
        conn.release();
    }
}

migratePromotion();
