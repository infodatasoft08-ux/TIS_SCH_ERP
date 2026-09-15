/**
 * Usage Tracking Middleware
 * Log API usage for metering and analytics
 */

const licenseService = require('../services/licenseService');

async function usageTrackingMiddleware(req, res, next) {
  const startTime = Date.now();

  // Capture original send to track response
  const originalSend = res.send;
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Record usage asynchronously (don't block request)
    recordUsageAsync(req, duration, statusCode, data).catch(err => {
      console.warn('Failed to record usage:', err.message);
    });

    return originalSend.call(this, data);
  };

  next();
}

async function recordUsageAsync(req, duration, statusCode, response) {
  try {
    const endpoint = req.path;
    const method = req.method;

    // Categorize the endpoint
    let eventType = 'api_call';
    let metricKey = `${method}_${endpoint.replace(/\//g, '_')}`;

    // Map common endpoints to specific event types
    if (endpoint.includes('student')) {
      eventType = 'student_operation';
    } else if (endpoint.includes('fee') || endpoint.includes('invoice')) {
      eventType = 'fee_operation';
    } else if (endpoint.includes('attendance')) {
      eventType = 'attendance_operation';
    } else if (endpoint.includes('exam')) {
      eventType = 'exam_operation';
    } else if (endpoint.includes('export') || endpoint.includes('report')) {
      eventType = 'export_operation';
    }

    // Record the usage
    await licenseService.recordUsage(
      eventType,
      metricKey,
      1,
      `${method} ${endpoint} - ${statusCode} (${duration}ms)`
    );
  } catch (error) {
    // Silently fail - don't interrupt the request
  }
}

module.exports = usageTrackingMiddleware;
