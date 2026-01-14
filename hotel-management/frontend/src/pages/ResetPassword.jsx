import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/reset-password', {
        token,
        newPassword
      });

      setSuccess(response.data.message || 'Password reset successfully!');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#10182F]">
      {/* Left: Reset Password Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-0 md:min-h-screen bg-[#10182F] text-white relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Header */}
          <div className="mb-6 sm:mb-10 flex items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">Nepal Stay</h2>
              <span className="text-xs tracking-widest text-[#F6C768] font-semibold">Password Reset</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Reset Your Password</h1>
          <p className="mb-6 sm:mb-8 text-sm sm:text-base text-[#B0B8D1]">Enter your new password below.</p>

          {/* Reset Password Form */}
          <div className="bg-[#181F36] rounded-2xl shadow-xl p-6 sm:p-8">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded">
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 rounded">
                <p className="text-xs sm:text-sm text-green-700">{success}</p>
                <p className="text-xs text-green-600 mt-2">Redirecting to login page...</p>
              </div>
            )}

            {!token ? (
              <div className="text-center">
                <p className="text-[#B0B8D1] mb-4">Invalid or missing reset token.</p>
                <Link 
                  to="/login" 
                  className="text-[#6C63FF] hover:underline font-semibold"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">NEW PASSWORD</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder="Confirm password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-2 sm:py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Resetting...' : 'RESET PASSWORD'}
                </button>

                <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-[#B0B8D1]">
                  Remember your password?{' '}
                  <Link to="/login" className="text-[#F6C768] hover:underline font-semibold">Login</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right: Image & Quote */}
      <div className="hidden md:flex w-1/2 min-h-screen relative items-center justify-center bg-[#181F36]">
        <img src="/images/unnamed.png" alt="Hotel Lobby" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="relative z-10 flex flex-col items-start justify-center h-full px-8 lg:px-16">
          <div className="mb-8">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#F6C768] text-lg">&#9733;</span>
              ))}
            </div>
            <p className="text-xl lg:text-2xl font-bold text-white max-w-md mb-4">"Your security is our priority."</p>
            <span className="text-[#F6C768] font-semibold tracking-widest text-xs">SECURE PASSWORD RESET</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
