import React from 'react';
import { Navigate } from 'react-router-dom';
import GuestProfile from '../pages/GuestProfile';

export default function GuestProfileRoute() {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) {
    return <Navigate to="/login" replace />;
  }
  try {
    const u = JSON.parse(raw);
    if (u.role === 'admin') return <Navigate to="/admin/settings" replace />;
    if (u.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
    if (u.role !== 'guest') return <Navigate to="/login" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
  return <GuestProfile />;
}
