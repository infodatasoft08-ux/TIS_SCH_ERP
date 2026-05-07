import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function NotFoundFallback() {
  const { token, user } = useAuth();

  // If the user has a token or user object, they are logged in.
  if (token || (user && user.id)) {
    return <Navigate to="/school/dashboard" replace />;
  }

  // Otherwise, fallback to the landing page.
  return <Navigate to="/login" replace />;
}
