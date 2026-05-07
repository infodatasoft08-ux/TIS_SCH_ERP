// --- Admin-check middleware
function adminOnly(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  // assuming admin role_id = 3
  if (!allowedRoles.includes(req.user.role_id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}


module.exports = adminOnly;