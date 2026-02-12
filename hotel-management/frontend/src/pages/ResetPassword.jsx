import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

/**
 * ResetPassword Component
 * 
 * Secure terminal for credential re-establishment.
 * Pairs with the Login portal's dark aesthetic.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Security states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Submit New Credentials
   */
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
      const res = await axios.post('http://localhost:5000/api/auth/reset-password', {
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#10182F]">
      {/* Form Interface */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-12 py-10 bg-[#10182F] text-white">
        <div className="max-w-md w-full mx-auto">
          {/* Header */}
          <div className="mb-10 flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold">Nepal Stay</h2>
              <span className="text-[10px] tracking-[.3em] text-[#F6C768] font-bold uppercase">Security Gateway</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Restore Access</h1>
          <p className="mb-10 text-[#B0B8D1] text-sm">Synchronize new security parameters for your account node.</p>

          <div className="bg-[#181F36] rounded-2xl shadow-2xl p-8 border border-white/5">
            {error && (
              <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded text-red-200 text-xs font-bold uppercase tracking-widest">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded text-emerald-200 text-xs font-bold uppercase tracking-widest">
                {success}
                <p className="text-[9px] mt-2 opacity-60">Redirecting to login portal...</p>
              </div>
            )}

            {!token ? (
              <div className="text-center py-6">
                <p className="text-[#B0B8D1] text-sm mb-6 uppercase tracking-widest font-bold">Invalid or Expired Token.</p>
                <Link to="/login" className="text-[#6C63FF] font-bold hover:underline underline-offset-4">Return to Entry</Link>
              </div>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">New Security Key</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Confirm Key</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all"
                    placeholder="Verify new password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full bg-[#6C63FF] py-4 rounded-lg font-extrabold text-sm tracking-[.2em] uppercase shadow-lg shadow-[#6C63FF]/20 hover:bg-[#5548C8] active:scale-[0.98] transition-all"
                >
                  {loading ? 'Resynchronizing...' : 'Update Credentials'}
                </button>

                <p className="mt-8 text-center text-xs text-[#B0B8D1]">
                  Identity remembered? {' '}
                  <Link to="/login" className="text-[#F6C768] font-bold hover:underline transition-all underline-offset-4">Login</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Asset Pane */}
      <div className="hidden md:flex md:w-1/2 h-screen relative items-center justify-center bg-[#181F36] overflow-hidden">
        <img src="/images/unnamed.png" alt="Security Background" className="absolute inset-0 w-full h-full object-cover object-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10182F] via-transparent to-transparent"></div>

        <div className="relative z-10 px-10 lg:px-20 space-y-8">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#F6C768] text-xl">★</span>)}
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold text-white max-w-lg mb-6 leading-tight italic">
              "System stability is anchored in rigorous security protocols and verified access control."
            </p>
            <span className="text-[12px] font-extrabold tracking-[.4em] text-[#F6C768] uppercase">Integrity in Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
