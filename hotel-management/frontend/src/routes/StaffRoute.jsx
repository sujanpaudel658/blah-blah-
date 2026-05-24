import React from 'react';
import { Navigate } from 'react-router-dom';

/** Requires an authenticated hotel manager or platform administrator. */
export default function StaffRoute({ children }) {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) {
    return <Navigate to="/login" replace />;
  }
  try {
    const u = JSON.parse(raw);
    if (u.role !== 'admin' && u.role !== 'superadmin') {
      return <Navigate to="/guest/dashboard" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }
  return children;
}
