// --- Role checking middlewares
const restrictRoles = (blockedRoles = [1, 5]) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = req.user.role_id;
    if (blockedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Access forbidden for this role' });
    }
    next();
  };
};

const requireRoles = (allowedRoles = [3, 6, 12]) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const userRole = req.user.role_id;
    const isAllowed = allowedRoles.includes(userRole) || req.user.sub_role === 'staff' || req.user.sub_role === 'developer';
    if (!isAllowed) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

function adminOnly(req, res, next) {
  return requireRoles([3, 6, 12])(req, res, next);
}

module.exports = {
  adminOnly,
  requireRoles,
  restrictRoles
};