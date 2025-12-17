import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

const GOOGLE_CLIENT_ID = '18463607092-ft28c7n4m37451pav1v5dnhq97harv5v.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/guest/dashboard" element={<UserDashboard />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;