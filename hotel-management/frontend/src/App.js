import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Signup from './pages/Signup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminAudits from './pages/SuperAdminAudits';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import RoomManagement from './pages/RoomManagement';
import RoomTypeManagement from './pages/RoomTypeManagement';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import KhaltiCallback from './pages/KhaltiCallback';
import Settings from './pages/Settings';
import GuestProfile from './pages/GuestProfile';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ListYourHotelPage from './pages/ListYourHotelPage';
import SubmitHotelPage from './pages/SubmitHotelPage';
import ChatBot from './components/ChatBot';

import Bookings from './pages/Bookings';

const RootRedirect = () => {
    const userData = localStorage.getItem('user');
    if (!userData) return <Home />;
    
    try {
        const user = JSON.parse(userData);
        if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (user.role === 'superadmin') return <Navigate to="/superadmin/dashboard" replace />;
        return <Navigate to="/guest/dashboard" replace />;
    } catch (e) {
        return <Home />;
    }
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/registry" element={<SuperAdminDashboard />} />
        <Route path="/superadmin/audits" element={<SuperAdminAudits />} />
        <Route path="/superadmin/settings" element={<Settings />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/bookings" element={<Bookings />} />
        <Route path="/guest/dashboard" element={<UserDashboard />} />
        <Route path="/guest/list-your-hotel" element={<ListYourHotelPage />} />
        <Route path="/guest/submit-hotel" element={<SubmitHotelPage />} />
        <Route path="/guest/profile" element={<GuestProfile />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
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