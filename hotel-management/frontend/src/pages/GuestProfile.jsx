import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';
import { getImageUrl } from '../utils/helpers';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const GuestProfile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
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
    const raw = localStorage.getItem('user');
    if (!token || !raw) {
      navigate('/login');
      return;
    }
    const parsed = JSON.parse(raw);
    setUser(parsed);
    setFormData((prev) => ({
      ...prev,
      fullName: parsed.fullName || parsed.full_name || '',
      email: parsed.email || '',
      phone: parsed.phone || ''
    }));

    const loadHotels = async () => {
      try {
        const res = await axios.get(`${API_URL}/hotels`);
        if (res.data.success && res.data.hotels) {
          setHotels(
            res.data.hotels.map((h) => ({
              id: h.id,
              title: h.name,
              description: h.city || h.description,
              images: h.image ? [h.image] : []
            }))
          );
        }
      } catch {
        /* optional */
      }
    };
    loadHotels();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
        showNote('Profile photo updated.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not upload photo.');
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
        showNote('Profile saved.');
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
      alert('Passwords do not match.');
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/auth/password`,
        { currentPassword: formData.currentPassword, newPassword: formData.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      showNote('Password updated.');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update password.');
    } finally {
      setIsSaving(false);
    }
  };

  const showNote = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const avatarSrc = user?.profileImage ? getImageUrl(user.profileImage) : null;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      <Navbar user={user} onLogout={handleLogout} hotelSuggestions={hotels} onSearch={() => {}} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12">
        <button
          type="button"
          onClick={() => navigate('/guest/dashboard')}
          className="text-[12px] font-semibold text-[#C4993E] mb-6 hover:underline"
        >
          ← Back to dashboard
        </button>

        <h1 className="text-2xl font-bold text-[#1A2332] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          My profile
        </h1>
        <p className="text-[14px] text-[#6B7B8D] mb-8">Update your photo, contact details, and password.</p>

        {successMessage && (
          <div className="mb-6 bg-[#E7F3ED] border border-[#108548] text-[#108548] text-[13px] font-medium px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div className="bg-white border border-[#E8E4DE] rounded-2xl p-8 shadow-sm mb-8">
          <p className="text-[11px] font-semibold text-[#6B7B8D] uppercase tracking-wider mb-4">Profile photo</p>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-[#F4F3F0] border-2 border-[#E8E4DE] overflow-hidden flex items-center justify-center shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-4xl text-[#A0A89C]">person</span>
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handlePhotoChange} />
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[#1A2332] text-white text-[13px] font-semibold rounded-lg hover:bg-[#263345] disabled:opacity-50"
              >
                {uploadingPhoto ? 'Uploading…' : 'Choose photo'}
              </button>
              <p className="text-[11px] text-[#6B7B8D] mt-2">JPEG, PNG, GIF or WebP · max 3 MB</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="bg-white border border-[#E8E4DE] rounded-2xl p-8 shadow-sm space-y-4 mb-8">
          <p className="text-[11px] font-semibold text-[#6B7B8D] uppercase tracking-wider mb-2">Contact</p>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">Full name</label>
            <input
              required
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg text-[#2C3E50] outline-none focus:ring-2 focus:ring-[#C4993E]/30"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">Email</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg text-[#2C3E50] outline-none focus:ring-2 focus:ring-[#C4993E]/30"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">Phone</label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg text-[#2C3E50] outline-none focus:ring-2 focus:ring-[#C4993E]/30"
              placeholder="+977 …"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-[#1A2332] text-white font-semibold rounded-lg hover:bg-[#263345] disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form onSubmit={handleUpdatePassword} className="bg-white border border-[#E8E4DE] rounded-2xl p-8 shadow-sm space-y-4">
          <p className="text-[11px] font-semibold text-[#6B7B8D] uppercase tracking-wider mb-2">Change password</p>
          <p className="text-[12px] text-[#6B7B8D] mb-2">Skip if you sign in with Google only.</p>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">Current password</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">New password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#6B7B8D] mb-1">Confirm new password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 border-2 border-[#1A2332] text-[#1A2332] font-semibold rounded-lg hover:bg-[#1A2332] hover:text-white disabled:opacity-50"
          >
            Update password
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default GuestProfile;
