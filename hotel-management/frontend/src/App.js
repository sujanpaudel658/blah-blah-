import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import RoomManagement from './pages/RoomManagement';
import RoomTypeManagement from './pages/RoomTypeManagement';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import KhaltiCallback from './pages/KhaltiCallback';
import Settings from './pages/Settings';
import ChatBot from './components/ChatBot';

import Bookings from './pages/Bookings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* ... existing routes ... */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/registry" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/audits" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/settings" element={<SuperAdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<Bookings />} />
        <Route path="/guest/dashboard" element={<UserDashboard />} />
        <Route path="/admin/rooms" element={<RoomManagement />} />
        <Route path="/admin/rooms/:roomId" element={<RoomManagement />} />
        <Route path="/admin/room-types" element={<RoomTypeManagement />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/payment/callback" element={<KhaltiCallback />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ChatBot />
    </Router>
  );
}


export default App;