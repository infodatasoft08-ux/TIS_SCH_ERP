/**
 * License Service - Handles all license server communication
 * This service connects your School ERP to the central License Server
 */

const axios = require('axios');
const crypto = require('crypto');

class LicenseService {
  constructor() {
    this.enabled = process.env.LICENSE_CHECK_ENABLED !== 'false';
    this.licenseServerUrl = process.env.LICENSE_SERVER_URL || 'http://localhost:5500';
    this.apiKey = process.env.LICENSE_API_KEY;
    this.apiSecret = process.env.LICENSE_API_SECRET;
    this.installationId = process.env.LICENSE_INSTALLATION_ID;
    this.cache = new Map();
    // Cache valid status for 1 hour by default (can be overridden via env) to avoid hammering the license server
    this.cacheTimeout = parseInt(process.env.LICENSE_CACHE_TIMEOUT_MS) || (60 * 60 * 1000); 
    // Wait 10 minutes before retrying if license server is offline / timing out
    this.failureRetryTimeout = parseInt(process.env.LICENSE_FAILURE_RETRY_MS) || (10 * 60 * 1000); 

    // Check if fully configured
    this.isConfigured = Boolean(this.apiKey && this.apiSecret && this.installationId);
    if (!this.enabled) {
      console.log('ℹ️ License verification is disabled via LICENSE_CHECK_ENABLED=false');
    } else if (!this.isConfigured) {
      console.warn('⚠️  License service not fully configured (missing API key/secret/installationId). Running in unverified bypass mode.');
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
    // If license checking is disabled or not configured, bypass check immediately
    if (!this.enabled || !this.isConfigured) {
      return {
        is_valid: true,
        license_status: 'ACTIVE',
        subscription_status: 'ACTIVE',
        days_until_expiry: 999,
        grace_period_active: false,
        status_message: this.enabled ? 'Unconfigured license mode (bypass)' : 'License check disabled',
        offline_mode: true,
      };
    }

    try {
      // Check cache first
      const cached = this.cache.get('license_status');
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Check if we are in a failure cooldown window to prevent blocking every request
      const failedCache = this.cache.get('license_failed_cooldown');
      if (failedCache && Date.now() - failedCache.timestamp < this.failureRetryTimeout) {
        return failedCache.data;
      }

      // Call License Server
      const url = `${this.licenseServerUrl}/api/v1/license/status`;
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 3000, // 3 second timeout
      });

      const licenseData = response.data.data;

      // Store last known verified status
      this.lastKnownStatus = licenseData;

      // Cache the result
      this.cache.set('license_status', {
        data: licenseData,
        timestamp: Date.now(),
      });
      // Clear failure cooldown if previous call succeeded
      this.cache.delete('license_failed_cooldown');

      return licenseData;
    } catch (error) {
      console.error('❌ License verification failed:', error.message);

      const fallbackData = this.lastKnownStatus ? {
        ...this.lastKnownStatus,
        offline_mode: true,
        status_message: `Offline mode - ${this.lastKnownStatus.status_message || ''}`,
      } : {
        is_valid: true,
        license_status: 'UNKNOWN',
        subscription_status: 'UNKNOWN',
        days_until_expiry: 0,
        grace_period_active: false,
        status_message: 'Offline mode - license check unavailable',
        offline_mode: true,
      };

      // Crucial: Cache the fallback status during failure so requests don't hang for 3000-5000ms repeatedly
      this.cache.set('license_failed_cooldown', {
        data: fallbackData,
        timestamp: Date.now(),
      });

      return fallbackData;
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
