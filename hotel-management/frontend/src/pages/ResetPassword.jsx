import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/api';

// Password reset from emailed token (?token=).
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Key requirements failed: Minimum 6 characters required.');
      return;
    }

    if (!token) {
      setError('Invalid protocol: Missing authorization token.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        newPassword
      });

      setSuccess(res.data.message || 'Identity record updated successfully.');

      // Auto-redirect to entry terminal
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Access synchronization aborted.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg text-[#2C3E50] text-[14px] outline-none focus:ring-2 focus:ring-[#C4993E]/30 focus:border-[#C4993E] transition-all placeholder-[#A0A89C]";
  const labelClass = "block text-[12px] font-semibold text-[#6B7B8D] mb-2 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#FAF8F5] overflow-hidden">
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center px-6 md:px-12 bg-[#FAF8F5] overflow-hidden">
        <div className="max-w-[420px] w-full mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-16 w-44 overflow-hidden flex items-center">
                <img
                  src="/images/website_logo.png"
                  alt="StayNepal"
                  className="h-full w-auto object-contain origin-left scale-[2.2]"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-[#1A2332] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Restore Access</h1>
            <p className="text-[15px] text-[#6B7B8D]">Set a new secure password to regain access to your account.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DE] p-8">
            {error && (
              <div className="mb-6 bg-[#FDEDED] border-l-3 border-[#C0392B] p-4 rounded-lg text-[#C0392B] text-[13px] font-medium">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-[#EDFDF5] border-l-3 border-[#2D8659] p-4 rounded-lg text-[#2D8659] text-[13px] font-medium">
                {success}
                <p className="text-[11px] mt-1 opacity-80">Redirecting to login portal...</p>
              </div>
            )}

            {!token ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-[#6B7B8D] text-[14px]">Invalid or expired security token.</p>
                <Link to="/login" className="inline-block text-[#C4993E] font-semibold hover:underline">Return to Sign In</Link>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div>
                  <label className={labelClass}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Create a new password"
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Verify your new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full bg-[#C4993E] text-white py-3.5 rounded-lg font-semibold text-[14px] hover:bg-[#AE872E] active:scale-[0.99] transition-all shadow-sm"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>

                <p className="text-center text-[14px] text-[#6B7B8D] pt-2">
                  Remembered your password?{' '}
                  <Link to="/login" className="text-[#C4993E] font-semibold hover:underline">Sign In</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 h-full relative items-end justify-start overflow-hidden">
        <img src="/images/unnamed.png" alt="Hotel" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332] via-[#1A2332]/30 to-transparent"></div>

        <div className="relative z-10 px-12 pb-16 space-y-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#C4993E] text-lg">★</span>)}
          </div>
          <p className="text-2xl font-bold text-white max-w-lg leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            "Security is our priority. Your data is protected with enterprise-grade encryption."
          </p>
          <div>
            <p className="text-[14px] text-white/80 font-medium">— StayNepal Security Team</p>
            <p className="text-[12px] text-[#C4993E] font-semibold mt-1">Trusted By 1000+ Properties</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
