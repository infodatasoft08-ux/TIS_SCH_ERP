const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '../uploads/documents');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class StorageService {
  /**
   * Save a file locally
   * @param {Buffer|String} content File content
   * @param {String} fileName Original file name
   * @param {String} subDir Subdirectory under uploads
   * @returns {Promise<String>} Relative path to the saved file
   */
  async saveFile(content, fileName, subDir = '') {
    const targetDir = path.join(UPLOADS_DIR, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const extension = path.extname(fileName);
    const uniqueName = `${uuidv4()}${extension}`;
    const filePath = path.join(targetDir, uniqueName);

    fs.writeFileSync(filePath, content);
    
    // Return relative path for database storage
    return path.join('uploads/documents', subDir, uniqueName).replace(/\\/g, '/');
  }

  /**
   * Get full path from relative path
   * @param {String} relativePath 
   * @returns {String}
   */
  getFullPath(relativePath) {
    return path.join(__dirname, '..', relativePath);
  }

  /**
   * Delete a file
   * @param {String} relativePath 
   */
  async deleteFile(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  /**
   * Read file content
   * @param {String} relativePath 
   * @returns {Buffer}
   */
  readFile(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    return fs.readFileSync(fullPath);
  }
}

module.exports = new StorageService();
