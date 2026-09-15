/**
 * License Check Middleware
 * Option 2: Read-Only Mode when License is Expired & Grace Period is ended.
 * - GET requests: Allowed (Read-Only access to existing records & reports)
 * - POST / PUT / DELETE / PATCH requests: Blocked with HTTP 403 LICENSE_EXPIRED_READ_ONLY
 */

const licenseService = require('../services/licenseService');

async function licenseCheckMiddleware(req, res, next) {
  try {
    // Skip license check for health, auth, and public endpoints
    const publicPaths = [
      '/health',
      '/api/v1/health',
      '/ping',
      '/status',
    ];

    if (
      publicPaths.includes(req.path) ||
      req.path.startsWith('/api/v1/auth') ||
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/auth')
    ) {
      return next();
    }

    // Verify license
    const status = await licenseService.verifyLicense();

    // Attach response headers for frontend status awareness
    res.setHeader('X-License-Valid', String(status.is_valid));
    res.setHeader('X-License-Status', status.license_status || 'VALID');
    res.setHeader('X-Grace-Period-Active', String(Boolean(status.grace_period_active)));

    if (!status.is_valid) {
      // Option 2: Read-Only Mode
      // Allow GET requests (viewing records, reports, etc.)
      if (req.method === 'GET') {
        res.setHeader('X-License-Read-Only', 'true');
        req.licenseValid = false;
        req.readOnlyMode = true;
        req.licenseStatus = status;
        return next();
      }

      // Block mutating actions (POST, PUT, DELETE, PATCH)
      return res.status(403).json({
        status: 'error',
        statusCode: 403,
        error: 'LICENSE_EXPIRED_READ_ONLY',
        message: 'Your school license has expired. You are currently in Read-Only Mode. Please renew maintenance to add, edit, or delete data.',
        action: 'RENEW_LICENSE',
        readOnly: true,
        daysOverdue: Math.abs(status.days_until_expiry || 0),
        renewalUrl: process.env.LICENSE_PORTAL_URL || 'https://license.yourdomain.com/dashboard',
      });
    }

    // License is fully valid or in grace period
    req.licenseValid = true;
    req.readOnlyMode = false;
    req.licenseStatus = status;
    req.gracePeriodActive = Boolean(status.grace_period_active);
    next();
  } catch (error) {
    console.error('❌ License middleware error:', error.message);
    // In case of server error, allow graceful degradation
    req.licenseValid = true;
    req.readOnlyMode = false;
    next();
  }
}

module.exports = licenseCheckMiddleware;

