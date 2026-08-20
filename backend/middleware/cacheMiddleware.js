// In-memory cache store
const cacheStore = new Map();

/**
 * In-memory caching middleware for Express routes.
 * @param {number} durationSeconds - Cache expiration time in seconds (default 300s / 5 mins)
 */
const cacheMiddleware = (durationSeconds = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build unique cache key including user role if present
    const roleId = req.user?.role_id || req.user?.role || 'public';
    const cacheKey = `${req.baseUrl}${req.url}_role:${roleId}`;
    
    const cachedItem = cacheStore.get(cacheKey);

    if (cachedItem && Date.now() < cachedItem.expiry) {
      // Return cached JSON response instantly from Node RAM
      return res.json(cachedItem.data);
    }

    // Capture standard res.json call to save response in cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(cacheKey, {
          data: body,
          expiry: Date.now() + durationSeconds * 1000
        });
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Clear cached keys matching a specific path pattern (use when updating data)
 * @param {string} keyPattern - Substring to match in cache keys
 */
const clearCachePattern = (keyPattern = '') => {
  if (!keyPattern) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(keyPattern)) {
      cacheStore.delete(key);
    }
  }
};

module.exports = {
  cacheMiddleware,
  clearCachePattern
};
