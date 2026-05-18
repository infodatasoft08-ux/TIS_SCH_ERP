const db = require('../db');
const storageService = require('../services/storageService');
const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const cloudinary = require('../config/cloudinary');

// Helper to upload a buffer directly to Cloudinary via native stream uploader
const uploadToCloudinary = (buffer, folder = 'school/templates') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        access_mode: 'public',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

class DocumentController {
  // --- Template Management ---

  uploadTemplate = async (req, res) => {
    try {
      const { name, type, user_type, template_type, field_config } = req.body;

      const templateFile = req.files && req.files['template'] ? req.files['template'][0] : null;
      const bgFile = req.files && req.files['background_image'] ? req.files['background_image'][0] : null;

      if (!templateFile) return res.status(400).json({ message: 'Template file is required' });

      // Check limit (max 3 per type/user_type) using the correct table name
      const [countResult] = await db.query(
        'SELECT COUNT(*) as count FROM document_templates WHERE type = ? AND user_type = ?',
        [type, user_type]
      );

      if (countResult[0].count >= 3) {
        return res.status(400).json({ message: `Maximum 3 templates allowed for ${type} - ${user_type}` });
      }

      // Upload background image to Cloudinary if provided
      let background_image_url = null;
      if (bgFile) {
        try {
          const uploadResult = await uploadToCloudinary(bgFile.buffer);
          background_image_url = uploadResult.secure_url;
        } catch (uploadErr) {
          console.error('Cloudinary template background upload failed:', uploadErr.message);
          return res.status(500).json({ message: 'Failed to upload background image to Cloudinary' });
        }
      }

      // Save file
      const relativePath = await storageService.saveFile(templateFile.buffer, templateFile.originalname, 'templates');

      const configToStore = typeof field_config === 'object' ? JSON.stringify(field_config) : field_config;

      // Extract PDF dimensions for the designer
      let width = 345;
      let height = 570;
      if (template_type === 'pdf') {
        try {
          const pdfDoc = await PDFDocument.load(templateFile.buffer);
          const firstPage = pdfDoc.getPages()[0];
          const size = firstPage.getSize();
          width = Math.round(size.width);
          height = Math.round(size.height);
        } catch (err) {
          console.error('Error detecting PDF size:', err);
        }
      } else if (template_type === 'hbs') {
        if (type === 'certificate') {
          width = 842;
          height = 595;
        } else {
          width = 345;
          height = 570;
        }
      }

      const [result] = await db.query(
        `INSERT INTO document_templates (name, type, user_type, template_type, file_path, field_config, width, height, background_image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, type, user_type, template_type, relativePath, configToStore, width, height, background_image_url]
      );

      res.status(201).json({ id: result.insertId, message: 'Template uploaded successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  updateTemplate = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, user_type, template_type, field_config, hbs_code } = req.body;

      const templateFile = req.files && req.files['template'] ? req.files['template'][0] : null;
      const bgFile = req.files && req.files['background_image'] ? req.files['background_image'][0] : null;

      const configToStore = typeof field_config === 'object' ? JSON.stringify(field_config) : field_config;

      // Construct dynamic update fields
      const updateFields = ['name = ?', 'type = ?', 'user_type = ?', 'template_type = ?', 'field_config = ?'];
      const queryParams = [name, type, user_type, template_type, configToStore];

      let newFilePath = null;

      // Handle template file update if uploaded
      if (templateFile) {
        const [oldRows] = await db.query('SELECT file_path FROM document_templates WHERE id = ?', [id]);
        if (oldRows.length > 0) {
          await storageService.deleteFile(oldRows[0].file_path);
        }
        newFilePath = await storageService.saveFile(templateFile.buffer, templateFile.originalname, 'templates');
        updateFields.push('file_path = ?');
        queryParams.push(newFilePath);

        // Also update PDF dimensions if template is PDF
        if (template_type === 'pdf') {
          try {
            const pdfDoc = await PDFDocument.load(templateFile.buffer);
            const firstPage = pdfDoc.getPages()[0];
            const size = firstPage.getSize();
            const width = Math.round(size.width);
            const height = Math.round(size.height);
            updateFields.push('width = ?', 'height = ?');
            queryParams.push(width, height);
          } catch (err) {
            console.error('Error detecting PDF size on update:', err);
          }
        }
      }

      // Handle custom background image update if uploaded
      if (bgFile) {
        const [oldRows] = await db.query('SELECT background_image FROM document_templates WHERE id = ?', [id]);
        if (oldRows.length > 0 && oldRows[0].background_image) {
          const { deleteFromCloudinary } = require('../helper/cloudinaryHelper');
          await deleteFromCloudinary(oldRows[0].background_image);
        }
        try {
          const uploadResult = await uploadToCloudinary(bgFile.buffer);
          updateFields.push('background_image = ?');
          queryParams.push(uploadResult.secure_url);
        } catch (uploadErr) {
          console.error('Cloudinary background update failed:', uploadErr.message);
          return res.status(500).json({ message: 'Failed to upload background image to Cloudinary' });
        }
      }

      // If it's HBS and code is provided, update/write the file content
      if (template_type === 'hbs' && hbs_code) {
        const [rows] = await db.query('SELECT file_path FROM document_templates WHERE id = ?', [id]);
        if (rows.length > 0) {
          const fileToModify = newFilePath || rows[0].file_path;
          const fullPath = storageService.getFullPath(fileToModify);
          fs.writeFileSync(fullPath, hbs_code);
        }
      }

      queryParams.push(id);

      await db.query(
        `UPDATE document_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        queryParams
      );

      res.json({ message: 'Template updated successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  getTemplates = async (req, res) => {
    try {
      const [rows] = await db.query('SELECT * FROM document_templates ORDER BY created_at DESC');

      // Auto-read HBS code for HBS templates to avoid fragile static file fetching on VPS
      for (const row of rows) {
        if (row.template_type === 'hbs') {
          try {
            const fullPath = storageService.getFullPath(row.file_path);
            if (fs.existsSync(fullPath)) {
              row.hbs_code = fs.readFileSync(fullPath, 'utf8');
            }
          } catch (err) {
            console.error(`Failed to read HBS code for template ${row.id}:`, err.message);
          }
        }
      }

      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  deleteTemplate = async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT file_path, background_image FROM document_templates WHERE id = ?', [id]);

      if (rows.length > 0) {
        // Delete local template file
        await storageService.deleteFile(rows[0].file_path);

        // Delete background image from Cloudinary if it exists
        if (rows[0].background_image) {
          const { deleteFromCloudinary } = require('../helper/cloudinaryHelper');
          await deleteFromCloudinary(rows[0].background_image);
        }

        await db.query('DELETE FROM document_templates WHERE id = ?', [id]);
      }

      res.json({ message: 'Template deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- Document Generation ---

  generate = async (req, res) => {
    try {
      const { template_id, user_ids, user_type } = req.body;
      const generated_by = req.user?.id || 1;

      // Get template using the correct table name
      const [templates] = await db.query('SELECT * FROM document_templates WHERE id = ?', [template_id]);
      if (templates.length === 0) return res.status(404).json({ message: 'Template not found' });
      const template = templates[0];

      // Get user data based on user_type
      console.log(`Generating documents for ${user_type}. IDs:`, user_ids);

      let users = [];
      if (user_type === 'student') {
        [users] = await db.query(`
          SELECT 
            s.*, 
            c.name as class_name, 
            g.name as grade_name, 
            u.avatar_url as photo, 
            u.name as name, 
            u.email as email, 
            u.phone as phone,
            ay.name as academic_year
          FROM students s
          JOIN users u ON s.id = u.id
          LEFT JOIN student_academic_records sar ON s.id = sar.student_id
          LEFT JOIN classes c ON sar.class_id = c.id
          LEFT JOIN grades g ON sar.grade_id = g.id
          LEFT JOIN academic_years ay ON ay.id = sar.academic_year_id
          WHERE s.id IN (?)
          AND (sar.id = (SELECT MAX(id) FROM student_academic_records WHERE student_id = s.id) OR sar.id IS NULL)
        `, [user_ids]);
      } else if (user_type === 'teacher') {
        [users] = await db.query(`
          SELECT t.*, u.name, u.email, u.phone, u.avatar_url as photo
          FROM teachers t
          JOIN users u ON t.user_id = u.id
          WHERE t.id IN (?)
        `, [user_ids]);
      } else {
        [users] = await db.query(`
          SELECT st.*, u.name, u.email, u.phone, u.avatar_url as photo
          FROM staff st
          JOIN users u ON st.user_id = u.id
          WHERE st.id IN (?)
        `, [user_ids]);
      }

      console.log(`Found ${users.length} users in database.`);

      // Parse field_config safely
      let fieldConfig = {};
      try {
        fieldConfig = typeof template.field_config === 'string'
          ? JSON.parse(template.field_config)
          : (template.field_config || {});
      } catch (e) {
        console.error("Failed to parse field_config:", e);
      }

      const pdfBuffers = [];
      for (const userData of users) {
        let pdfBuffer;
        const mappedData = this.mapUserData(userData, user_type);

        // Pass custom background image from template
        if (template.background_image) {
          mappedData.background_image = template.background_image;
        }

        if (template.template_type === 'pdf') {
          pdfBuffer = await pdfService.overlayOnPdf(template.file_path, mappedData, fieldConfig);
        } else {
          pdfBuffer = await pdfService.renderHbsTemplate(template.file_path, mappedData, {
            width: template.width,
            height: template.height
          });
        }
        pdfBuffers.push(pdfBuffer);
      }

      if (pdfBuffers.length === 0) {
        return res.status(400).json({ success: false, message: 'No documents generated' });
      }

      let finalBuffer;
      if (pdfBuffers.length === 1) {
        finalBuffer = pdfBuffers[0];
      } else {
        finalBuffer = await pdfService.mergePdfs(pdfBuffers);
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${template.type}_bulk_${Date.now()}.pdf`);
      return res.send(Buffer.from(finalBuffer));
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Helper: Map database record to standard field keys
   */
  mapUserData(user, type) {
    return {
      name: user.name || user.user_name || '',
      admission_number: user.admission_no || user.employee_code || '',
      employee_id: user.employee_code || user.id || '',
      class_name: user.class_name || user.department || '',
      academic_year: user.academic_year || '',
      course: user.class_name || '',
      grade_name: user.grade_name || '',
      dob: user.date_of_birth || user.dob || '',
      phone: user.phone || '',
      email: user.email || '',
      photo: user.photo || '',
    };
  }

  getTemplatePreview = async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT * FROM document_templates WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Template not found' });
      const template = rows[0];

      if (template.template_type === 'pdf') {
        const imageBuffer = await pdfService.renderPdfToImage(template.file_path);
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);
      } else {
        // Render HBS to HTML for preview
        const dummyData = {
          name: "Sample Student",
          admission_number: "ADM-2024-001",
          academic_year: "2024-25",
          class_name: "10th",
          grade_name: "A",
          user_type: "Student",
          phone: "9876543210",
          photo: "https://via.placeholder.com/150",
          background_image: template.background_image
        };
        const html = await pdfService.compileHbsToHtml(template.file_path, dummyData);
        res.set('Content-Type', 'text/html');
        res.send(html);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }

  downloadDocument = async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await db.query('SELECT file_path FROM generated_documents WHERE id = ?', [id]);

      if (rows.length === 0) return res.status(404).json({ message: 'Document not found' });

      const fullPath = storageService.getFullPath(rows[0].file_path);
      const fileName = path.basename(fullPath);

      res.download(fullPath, fileName, async (err) => {
        if (!err) {
          try {
            // Delete file after successful download
            await storageService.deleteFile(rows[0].file_path);
            // Optionally remove from DB too
            await db.query('DELETE FROM generated_documents WHERE id = ?', [id]);
          } catch (e) {
            console.error("Error deleting temporary file:", e);
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
}

module.exports = new DocumentController();
