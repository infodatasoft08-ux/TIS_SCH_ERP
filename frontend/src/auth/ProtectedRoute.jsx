import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PropTypes from 'prop-types';

/**
 * Wrap protected routes:
 * <Route path="/school" element={<ProtectedRoute><MainLayout/></ProtectedRoute>} />
 * <Route path="announcement/add" element={<ProtectedRoute blockedRoles={[1, 5]} redirectTo="/school/announcement/list"><CreateAnouncementDatable /></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children, allowedRoles, blockedRoles, redirectTo = '/school/dashboard' }) {
  const { token, user } = useAuth();
  const loc = useLocation();

  if (!token) {
    // no token -> not logged in
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  if (user) {
    const roleId = Number(user.role_id);
    const subRole = user.sub_role;
    const isDev = Boolean(
      roleId === 12 || 
      subRole === 'developer' || 
      user.is_developer || 
      user.developer ||
      user.email?.toLowerCase().includes('developer')
    );

    // Developers have universal access
    if (!isDev) {
      if (blockedRoles && blockedRoles.length > 0) {
        const isBlocked = blockedRoles.some(
          r => r === roleId || r === String(roleId) || (subRole && r === subRole)
        );
        if (isBlocked) {
          return <Navigate to={redirectTo} replace />;
        }
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const isAllowed = allowedRoles.some(
          r => r === roleId || r === String(roleId) || (subRole && r === subRole)
        );
        if (!isAllowed) {
          return <Navigate to={redirectTo} replace />;
        }
      }
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node,
  allowedRoles: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  blockedRoles: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  redirectTo: PropTypes.string
};