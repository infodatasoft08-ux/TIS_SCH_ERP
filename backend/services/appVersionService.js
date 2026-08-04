const db = require('../db');

class AppVersionService {
  async getLatestVersion(platform = 'android') {
    const [rows] = await db.query(
      'SELECT latest_version, minimum_supported_version, force_update, play_store_url, release_notes FROM app_versions WHERE platform = ? AND is_active = TRUE LIMIT 1',
      [platform]
    );
    return rows[0] || null;
  }

  async getAllVersions() {
    const [rows] = await db.query(
      'SELECT id, platform, latest_version, minimum_supported_version, force_update, play_store_url, release_notes, is_active FROM app_versions ORDER BY id DESC'
    );
    return rows;
  }

  async updateVersion(id, data, userId) {
    const { latest_version, minimum_supported_version, force_update, play_store_url, release_notes } = data;
    const [result] = await db.query(
      `UPDATE app_versions 
       SET latest_version = ?, minimum_supported_version = ?, force_update = ?, play_store_url = ?, release_notes = ?, updated_by = ? 
       WHERE id = ?`,
      [latest_version, minimum_supported_version, force_update, play_store_url, release_notes, userId, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = new AppVersionService();
