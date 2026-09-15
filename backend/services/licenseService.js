/**
 * License Service - Handles all license server communication
 * This service connects your School ERP to the central License Server
 */

const axios = require('axios');
const crypto = require('crypto');

class LicenseService {
  constructor() {
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:5500';
    this.apiKey = process.env.LICENSE_API_KEY;
    this.apiSecret = process.env.LICENSE_API_SECRET;
    this.installationId = process.env.LICENSE_INSTALLATION_ID;
    this.cache = new Map();
    this.cacheTimeout = 15 * 1000; // 15 seconds for quick sync

    // Validate required config
    if (!this.apiKey || !this.apiSecret || !this.installationId) {
      console.warn('⚠️  License service not fully configured. Check .env file.');
    }
  }

  /**
   * Generate HMAC-SHA256 signature for API requests
   */
  generateSignature() {
    if (!this.apiSecret || !this.installationId) return '';
    const timestamp = Date.now().toString();
    const message = `${this.installationId}:${timestamp}`;
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
    return signature;
  }

  /**
   * Build headers for license server requests
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-API-SECRET': this.apiSecret,
      'X-Signature': this.generateSignature(),
      'X-Installation-ID': this.installationId,
      'User-Agent': 'School-ERP/1.0',
    };
  }

  /**
   * Verify license status
   * Returns: { is_valid, license_status, subscription_status, days_until_expiry, ... }
   */
  async verifyLicense() {
    try {
      // Check cache first
      const cached = this.cache.get('license_status');
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('✓ License status from cache');
        return cached.data;
      }

      // Call License Server
      const url = `${this.licenseServerUrl}/api/v1/license/status`;
      console.log(`📞 Calling license server: ${url}`);

      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 5000, // 5 second timeout
      });

      const licenseData = response.data.data;

      // Store last known verified status
      this.lastKnownStatus = licenseData;

      // Cache the result
      this.cache.set('license_status', {
        data: licenseData,
        timestamp: Date.now(),
      });

      console.log('✓ License verified:', licenseData.status_message);
      return licenseData;
    } catch (error) {
      console.error('❌ License verification failed:', error.message);

      // If we previously fetched a valid/invalid status, preserve last known status during connection drops
      if (this.lastKnownStatus) {
        console.log('⚠️ Preserving last known license status during connection drop:', this.lastKnownStatus.status_message);
        return {
          ...this.lastKnownStatus,
          offline_mode: true,
          status_message: `Offline mode - ${this.lastKnownStatus.status_message || ''}`,
        };
      }

      // Default fallback if no prior check was ever made
      return {
        is_valid: true,
        license_status: 'UNKNOWN',
        subscription_status: 'UNKNOWN',
        days_until_expiry: 0,
        grace_period_active: false,
        status_message: 'Offline mode - license check unavailable',
        offline_mode: true,
      };
    }
  }

  /**
   * Check if license is currently valid (including Grace Period)
   */
  async isLicenseValid() {
    const status = await this.verifyLicense();
    return Boolean(status.is_valid);
  }

  /**
   * Get billing options available for this installation
   */
  async getBillingOptions() {
    try {
      const url = `${this.licenseServerUrl}/api/v1/billing-options/${this.installationId}`;
      const response = await axios.get(url, {
        headers: {
          'X-API-Key': this.apiKey,
          'X-Installation-ID': this.installationId,
        },
        timeout: 5000,
      });
      return response.data.data;
    } catch (error) {
      console.error('❌ Failed to get billing options:', error.message);
      return { billing_options: [] };
    }
  }

  /**
   * Record usage event (e.g., document export, user login, etc.)
   */
  async recordUsage(eventType, metricKey, metricValue, notes = '') {
    try {
      const url = `${this.licenseServerUrl}/api/v1/installations/${this.installationId}/usage`;

      const response = await axios.post(url, {
        event_type: eventType,
        metric_key: metricKey,
        metric_value: metricValue,
        unit: 'count',
        notes: notes,
      }, {
        headers: this.getHeaders(),
        timeout: 5000,
      });

      console.log(`✓ Usage recorded: ${metricKey}`);
      return response.data.data;
    } catch (error) {
      console.error('⚠️  Failed to record usage:', error.message);
      // Don't block the application if usage recording fails
      return null;
    }
  }

  /**
   * Get license status for display (e.g., on admin dashboard)
   */
  async getLicenseInfo() {
    const status = await this.verifyLicense();
    return {
      isValid: status.is_valid,
      licenseStatus: status.license_status,
      subscriptionStatus: status.subscription_status,
      daysUntilExpiry: status.days_until_expiry,
      billingPeriod: status.billing_period,
      billingAmount: status.billing_amount,
      message: status.status_message,
      lastCheck: status.last_check_at,
    };
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache() {
    this.cache.clear();
    console.log('License cache cleared');
  }
}

module.exports = new LicenseService();
