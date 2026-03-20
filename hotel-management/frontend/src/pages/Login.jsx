import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPasswordSet, setShowPasswordSet] = useState(false);
  const [passwordSetEmail, setPasswordSetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetError, setPasswordSetError] = useState('');

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  useEffect(() => {
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initializeGoogleButton = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '18463607092-ft28c7n4m37451pav1v5dnhq97harv5v.apps.googleusercontent.com',
            callback: handleGoogleAuth,
            context: 'signin',
            ux_mode: 'popup',
            auto_select: false
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', text: 'signin_with', logo_alignment: 'left' }
          );
        } catch (err) {
          console.error('Google Auth Init Failed:', err);
        }
      } else {
        setTimeout(initializeGoogleButton, 100);
      }
    };
    initializeGoogleButton();

    return () => {
      if (window.google?.accounts?.id) window.google.accounts.id.cancel();
    };
  }, []);

  const handleGoogleAuth = async (response) => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.post('http://localhost:5000/api/auth/google', { credential: response.credential });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.redirectPath || '/guest/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(res.data.redirectPath || '/guest/dashboard');
    } catch (err) {
      if (err.response?.data?.requiresPasswordSet) {
        setError(err.response.data.message);
        setPasswordSetEmail(email);
        setShowPasswordSet(true);
      } else {
        setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSetError('');
    if (newPassword !== confirmPassword) { setPasswordSetError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/set-password', { email: passwordSetEmail, newPassword });
      alert('Password set successfully! You can now sign in.');
      setShowPasswordSet(false);
    } catch (err) {
      setPasswordSetError(err.response?.data?.message || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordRecovery = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/request-password-reset', { email: forgotPasswordEmail });
      setForgotPasswordSuccess(res.data.message || 'Check your email for recovery instructions.');
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Could not send recovery email.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-[#F4F3F0] border border-[#E8E4DE] rounded-lg text-[#2C3E50] text-[14px] outline-none focus:ring-2 focus:ring-[#C4993E]/30 focus:border-[#C4993E] transition-all placeholder-[#A0A89C]";
  const labelClass = "block text-[12px] font-semibold text-[#6B7B8D] mb-2 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#FAF8F5] overflow-hidden">
      {/* Left: Form Section */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center px-6 md:px-12 bg-[#FAF8F5] overflow-hidden">
        <div className="max-w-[420px] w-full mx-auto">
          {/* Brand */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[#C4993E] text-[22px]">apartment</span>
              <span className="font-bold text-[16px] text-[#1A2332]" style={{ fontFamily: "'Playfair Display', serif" }}>StayNepal</span>
            </div>
            <h1 className="text-3xl font-bold text-[#1A2332] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Welcome back</h1>
            <p className="text-[15px] text-[#6B7B8D]">Sign in to manage your bookings and explore new destinations.</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DE] p-8">
            {error && (
              <div className="mb-6 bg-[#FDEDED] border-l-3 border-[#C0392B] p-4 rounded-lg text-[#C0392B] text-[13px] font-medium">
                {error}
              </div>
            )}

            {showPasswordSet ? (
              <form onSubmit={handleSetPasswordSubmit} className="space-y-5">
                <h2 className="text-lg font-bold text-[#1A2332] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Set Your Password</h2>
                <p className="text-[13px] text-[#6B7B8D] mb-4">Create a password for your account to sign in with email.</p>
                {passwordSetError && <p className="text-[#C0392B] text-[13px]">{passwordSetError}</p>}
                <div><label className={labelClass}>Email</label><input type="email" value={passwordSetEmail} disabled className={`${inputClass} opacity-60`} /></div>
                <div><label className={labelClass}>New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} required /></div>
                <div><label className={labelClass}>Confirm Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} required /></div>
                <button type="submit" disabled={loading} className="w-full bg-[#C4993E] text-white py-3.5 rounded-lg font-semibold text-[14px] hover:bg-[#AE872E] transition-all">
                  {loading ? 'Setting password...' : 'Set Password'}
                </button>
                <button type="button" onClick={() => setShowPasswordSet(false)} className="w-full text-center text-[13px] text-[#6B7B8D] mt-3 hover:text-[#1A2332]">← Back to sign in</button>
              </form>
            ) : showForgotPassword ? (
              <form onSubmit={handlePasswordRecovery} className="space-y-5">
                <h2 className="text-lg font-bold text-[#1A2332] mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Reset Password</h2>
                <p className="text-[13px] text-[#6B7B8D] mb-4">Enter your email and we'll send you instructions to reset your password.</p>
                {forgotPasswordError && <p className="text-[#C0392B] text-[13px]">{forgotPasswordError}</p>}
                {forgotPasswordSuccess && <p className="text-[#2D8659] text-[13px]">{forgotPasswordSuccess}</p>}
                <div><label className={labelClass}>Email Address</label><input type="email" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} className={inputClass} placeholder="you@example.com" required /></div>
                <button type="submit" disabled={loading} className="w-full bg-[#C4993E] text-white py-3.5 rounded-lg font-semibold text-[14px] hover:bg-[#AE872E] transition-all">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full text-center text-[13px] text-[#6B7B8D] mt-3 hover:text-[#1A2332]">← Back to sign in</button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div><label className={labelClass}>Email Address</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" required /></div>
                <div><label className={labelClass}>Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Enter your password" required /></div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center text-[13px] text-[#6B7B8D] cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#E8E4DE] text-[#C4993E] focus:ring-[#C4993E] mr-2" />
                    <span className="group-hover:text-[#2C3E50] transition-colors">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[13px] text-[#C4993E] font-medium hover:underline">Forgot password?</button>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#1A2332] text-white py-3.5 rounded-lg font-semibold text-[14px] hover:bg-[#263345] active:scale-[0.99] transition-all shadow-sm">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="relative py-3">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8E4DE]"></div></div>
                  <div className="relative flex justify-center"><span className="px-3 bg-white text-[12px] text-[#6B7B8D]">or continue with</span></div>
                </div>

                <div className="flex justify-center" id="google-signin-button"></div>

                <p className="text-center text-[14px] text-[#6B7B8D] pt-2">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-[#C4993E] font-semibold hover:underline">Create account</Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right: Visual Section */}
      <div className="hidden md:flex md:w-1/2 h-full relative items-end justify-start overflow-hidden">
        <img src="/images/unnamed.png" alt="Hotel" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332] via-[#1A2332]/30 to-transparent"></div>

        <div className="relative z-10 px-12 pb-16 space-y-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#C4993E] text-lg">★</span>)}
          </div>
          <p className="text-2xl font-bold text-white max-w-lg leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            "The most seamless hotel booking experience in Nepal. Absolutely loved our stay."
          </p>
          <div>
            <p className="text-[14px] text-white/80 font-medium">— Happy Guest</p>
            <p className="text-[12px] text-[#C4993E] font-semibold mt-1">StayNepal Partner Hotel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
