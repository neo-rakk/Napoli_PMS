import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuthStore();
  
  if (!token || !user) {
    return <Navigate to="/reception/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/reception" replace />;
  }
  
  return children;
};
