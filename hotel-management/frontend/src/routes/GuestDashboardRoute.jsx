import React from 'react';
import { Navigate } from 'react-router-dom';
import UserDashboardView from '../pages/userDashboard/UserDashboardView';

/**
 * Redirects hotel staff before the guest dashboard mounts so they never briefly
 * see explore/hotel modals while useEffect runs.
 */
export default function GuestDashboardRoute() {
  const token = localStorage.getItem('token');
  const raw = localStorage.getItem('user');
  if (!token || !raw) {
    return <Navigate to="/login" replace />;
  }
  try {
    const u = JSON.parse(raw);
    if (u.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (u.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
  return <UserDashboardView />;
}
