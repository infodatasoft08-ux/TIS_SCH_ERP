require('dotenv').config();
const db = require('../db');

async function up() {
  try {
    console.log('🔄 Creating export_logs table if not exists...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS export_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        export_id VARCHAR(100) NOT NULL UNIQUE,
        school_name VARCHAR(255) DEFAULT 'Times International School',
        user_id INT NOT NULL,
        user_name VARCHAR(255) DEFAULT 'Admin',
        export_type ENUM('xlsx', 'zip', 'raw_zip') DEFAULT 'xlsx',
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        progress INT DEFAULT 0,
        current_step VARCHAR(255) DEFAULT 'Initializing...',
        record_counts JSON DEFAULT NULL,
        file_path VARCHAR(500) DEFAULT NULL,
        file_name VARCHAR(255) DEFAULT NULL,
        file_size BIGINT DEFAULT 0,
        error_message TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await db.query(createTableQuery);
    console.log('✅ export_logs table created or verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating export_logs table:', err);
    process.exit(1);
  }
}

up();
