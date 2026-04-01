import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import AdminLayout from '../components/admin/AdminLayout';
import { getImageUrl } from '../utils/helpers';

const Settings = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [user, setUser] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const sync = async () => {
            try {
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success && res.data.user) {
                    const u = res.data.user;
                    localStorage.setItem('user', JSON.stringify(u));
                    setUser(u);
                    setFormData((prev) => ({
                        ...prev,
                        fullName: u.fullName || '',
                        email: u.email || '',
                        phone: u.phone || ''
                    }));
                    return;
                }
            } catch {
                /* fall through */
            }
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/login');
                return;
            }
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setFormData((prev) => ({
                ...prev,
                fullName: parsedUser.fullName || parsedUser.name || '',
                email: parsedUser.email || '',
                phone: parsedUser.phone || ''
            }));
        };
        sync();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingPhoto(true);
        try {
            const token = localStorage.getItem('token');
            const fd = new FormData();
            fd.append('photo', file);
            const res = await axios.post(`${API_URL}/auth/profile-photo`, fd, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success && res.data.user) {
                localStorage.setItem('user', JSON.stringify(res.data.user));
                setUser(res.data.user);
                showNotification('Profile photo updated.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Upload failed.');
        } finally {
            setUploadingPhoto(false);
            e.target.value = '';
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(
                `${API_URL}/auth/profile`,
                {
                    fullName: formData.fullName,
                    email: formData.email,
                    phone: formData.phone
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

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
            const res = await axios.put(
                `${API_URL}/auth/password`,
                {
                    currentPassword: formData.currentPassword,
                    newPassword: formData.newPassword
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setFormData((prev) => ({
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

    const avatarSrc = user?.profileImage ? getImageUrl(user.profileImage) : null;

    return (
        <AdminLayout user={user} title="SYSTEM SETTINGS" subtitle="MANAGE SETTINGS" onLogout={handleLogout}>
            <div className="max-w-4xl space-y-8 pb-12">
                {successMessage && (
                    <div className="bg-[#E7F3ED] border border-[#108548] p-4 text-[#108548] font-bold text-xs uppercase tracking-widest fade-in">
                        {successMessage}
                    </div>
                )}

                <div className="admin-card bg-white flex flex-col md:flex-row md:items-center gap-8 p-8">
                    <div className="w-28 h-28 rounded-full bg-[#F9FAFB] border-2 border-[#E2E2E2] overflow-hidden flex items-center justify-center shrink-0">
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined text-5xl text-[#A0AEC0]">person</span>
                        )}
                    </div>
                    <div>
                        <span className="admin-label">Profile picture</span>
                        <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight mb-3">Photo</h3>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handlePhotoChange}
                        />
                        <button
                            type="button"
                            disabled={uploadingPhoto}
                            onClick={() => fileInputRef.current?.click()}
                            className="admin-button admin-button-secondary h-10 uppercase tracking-widest text-[11px]"
                        >
                            {uploadingPhoto ? 'UPLOADING…' : 'UPLOAD PHOTO'}
                        </button>
                        <p className="text-[10px] text-[#64748B] mt-2">JPEG, PNG, GIF or WebP · max 3 MB</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="admin-card bg-white flex flex-col">
                        <div className="p-6 border-b border-[#F1F1F1]">
                            <span className="admin-label">User Identity</span>
                            <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Main Profile</h3>
                        </div>
                        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                            <div className="form-group">
                                <label className="admin-label">Full Name</label>
                                <input
                                    required
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="admin-label">Email Address</label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                />
                            </div>
                            <div className="form-group">
                                <label className="admin-label">Phone</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="admin-input"
                                    placeholder="+977 …"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="admin-button admin-button-primary w-full h-11 uppercase tracking-widest text-[11px]"
                            >
                                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>

                    <div className="admin-card bg-white flex flex-col">
                        <div className="p-6 border-b border-[#F1F1F1]">
                            <span className="admin-label">Access Control</span>
                            <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">Change Password</h3>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                            <div className="form-group">
                                <label className="admin-label">Current Password</label>
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
                                <label className="admin-label">New Password</label>
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
                                <label className="admin-label">Confirm New Password</label>
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
                                {isSaving ? 'SAVING...' : 'UPDATE PASSWORD'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="admin-card bg-white">
                    <div className="p-6 border-b border-[#F1F1F1]">
                        <span className="admin-label">Technical Environment</span>
                        <h3 className="text-lg font-bold text-[#1B2B41] uppercase tracking-tight">System Info</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <span className="admin-label">Protocol Version</span>
                            <p className="text-xs font-bold text-[#1B2B41]">v4.5.12</p>
                        </div>
                        <div>
                            <span className="admin-label">Cloud Status</span>
                            <p className="text-xs font-bold text-[#108548]">CONNECTED</p>
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
