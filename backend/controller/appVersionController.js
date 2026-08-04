const Joi = require('joi');
const appVersionService = require('../services/appVersionService');

class AppVersionController {
  // Public endpoint for mobile
  async getLatestVersion(req, res) {
    try {
      const platform = req.query.platform || 'android';
      const versionInfo = await appVersionService.getLatestVersion(platform);
      
      if (!versionInfo) {
        return res.status(404).json({ success: false, message: 'Version info not found for the specified platform.' });
      }

      res.status(200).json({
        success: true,
        data: versionInfo
      });
    } catch (error) {
      console.error('Error in getLatestVersion:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin endpoint
  async getAllVersions(req, res) {
    try {
      const versions = await appVersionService.getAllVersions();
      res.status(200).json({ success: true, data: versions });
    } catch (error) {
      console.error('Error in getAllVersions:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Admin endpoint
  async updateVersion(req, res) {
    try {
      const { id } = req.params;
      const schema = Joi.object({
        latest_version: Joi.string().required(),
        minimum_supported_version: Joi.string().required(),
        force_update: Joi.boolean().required(),
        play_store_url: Joi.string().uri().required(),
        release_notes: Joi.string().allow('').optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
      }

      const userId = req.user?.id || null; // Extracted from JWT
      const updated = await appVersionService.updateVersion(id, value, userId);

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Version record not found' });
      }

      res.status(200).json({ success: true, message: 'App version updated successfully' });
    } catch (error) {
      console.error('Error in updateVersion:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new AppVersionController();
