import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import PropTypes from 'prop-types';

/**
 * Wrap protected routes:
 * <Route path="/admin" element={<ProtectedRoute><AdminLayout/></ProtectedRoute>} />
 */
export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const loc = useLocation();

  if (!token) {
    // no token -> not logged in
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node
};