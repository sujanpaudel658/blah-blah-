import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/admin/AdminLayout';

const Settings = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token || !userData) {
            navigate('/login');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setFormData(prev => ({
            ...prev,
            name: parsedUser.name || '',
            email: parsedUser.email || ''
        }));
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:5000/api/auth/profile', {
                name: formData.name,
                email: formData.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setUser(res.data.user);
                showNotification('Profile synchronization complete.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Profile update failed.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            alert('Password mismatch detected.');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:5000/api/auth/password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
                showNotification('Security credentials updated.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Credential update failed.');
        } finally {
            setIsSaving(false);
        }
    };

    const showNotification = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AdminLayout
            user={user}
            title="SYSTEM SETTINGS"
            subtitle="ADMINISTRATIVE CONFIGURATION"
            onLogout={handleLogout}
        >
            <div className="max-w-4xl space-y-8 pb-12">
                {successMessage && (
                    <div className="bg-[#E7F3ED] border border-[#108548] p-4 text-[#108548] font-bold text-xs uppercase tracking-widest fade-in">
                        {successMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Profile Settings */}
                    <div className="admin-card bg-white flex flex-col">
                        <div className="p-6 border-b border-[#F1F1F1]">
                            <span className="admin-label">User Identity</span>
                            <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Administrative Profile</h3>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                            <div className="form-group">
                                <label className="admin-label">Full Legal Name</label>
                                <input
                                    required
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="admin-label">System Email Address</label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="admin-button admin-button-primary w-full h-11 uppercase tracking-widest text-[11px]"
                            >
                                {isSaving ? 'SYNCHRONIZING...' : 'COMMIT PROFILE UPDATES'}
                            </button>
                        </form>
                    </div>

                    {/* Security Settings */}
                    <div className="admin-card bg-white flex flex-col">
                        <div className="p-6 border-b border-[#F1F1F1]">
                            <span className="admin-label">Access Control</span>
                            <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Security Credentials</h3>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                            <div className="form-group">
                                <label className="admin-label">Current Passkey</label>
                                <input
                                    required
                                    type="password"
                                    name="currentPassword"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="admin-label">New Passkey</label>
                                <input
                                    required
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="admin-label">Re-verify New Passkey</label>
                                <input
                                    required
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="admin-button admin-button-secondary w-full h-11 uppercase tracking-widest text-[11px]"
                            >
                                {isSaving ? 'VERIFYING...' : 'UPDATE ACCESS CREDENTIALS'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* System Information */}
                <div className="admin-card bg-white">
                    <div className="p-6 border-b border-[#F1F1F1]">
                        <span className="admin-label">Technical Environment</span>
                        <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Node Topology</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <span className="admin-label">Protocol Version</span>
                            <p className="text-xs font-bold text-[#1B2B41]">4.5.12-FINAL</p>
                        </div>
                        <div>
                            <span className="admin-label">Cloud Status</span>
                            <p className="text-xs font-bold text-[#108548]">SYNCHRONIZED</p>
                        </div>
                        <div>
                            <span className="admin-label">Account Role</span>
                            <p className="text-xs font-bold text-[#B88E2F] uppercase">{user?.role || 'ADMIN'}</p>
                        </div>
                        <div>
                            <span className="admin-label">Association ID</span>
                            <p className="text-xs font-bold text-[#1B2B41]">PROP-{user?.hotel_id || '000'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Settings;
