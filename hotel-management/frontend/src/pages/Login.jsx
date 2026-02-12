import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

/**
 * Login Component
 * 
 * Handles user authentication through email/password and Google OAuth.
 * Uses the original dark-themed aesthetic with a dual-pane layout.
 */
const Login = () => {
  const navigate = useNavigate();

  // Standard authentication states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Protocol modes for password management
  const [showPasswordSet, setShowPasswordSet] = useState(false);
  const [passwordSetEmail, setPasswordSetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetError, setPasswordSetError] = useState('');

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  /**
   * Google Sign-In Initialization
   * Loads the GSI client and prepares the button.
   */
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
            {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              shape: 'rectangular',
              text: 'signin_with',
              logo_alignment: 'left'
            }
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

  /* 
     AUTHENTICATION HANDLERS
     -----------------------
     v1.0: Added standard email/pass auth.
     v1.2: Integrated Google OAuth sync for regional admins.
  */

  const handleGoogleAuth = async (response) => {
    try {
      setLoading(true);
      setError('');

      // Sync Google identity with our local registry
      const res = await axios.post('http://localhost:5000/api/auth/google', {
        credential: response.credential
      });

      // PERSISTENCE: Keep both for different session checks across the legacy modules
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Use redirect path provided by backend to ensure role-based landing
      navigate(res.data.redirectPath || '/guest/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Standard Login Submission
   * Handles local registry credentials and legacy password-set redirects.
   */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email, password
      });

      // Standard session storage pattern
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      navigate(res.data.redirectPath || '/guest/dashboard');
    } catch (err) {
      // Logic for first-time Google users who need to set a local passphrase
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

    if (newPassword !== confirmPassword) {
      setPasswordSetError('Passwords mismatch.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/set-password', {
        email: passwordSetEmail, newPassword
      });
      alert('Password established successfully. You may now log in.');
      setShowPasswordSet(false);
    } catch (err) {
      setPasswordSetError(err.response?.data?.message || 'Failed to update credentials.');
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
      const res = await axios.post('http://localhost:5000/api/auth/request-password-reset', {
        email: forgotPasswordEmail
      });
      setForgotPasswordSuccess(res.data.message || 'Check your email for recovery instructions.');
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Could not initiate recovery process.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-[#10182F]">
      {/* Form Section */}
      <div className="w-full md:w-1/2 h-screen flex flex-col justify-center px-6 md:px-12 py-10 bg-[#10182F] text-white">
        <div className="max-w-md w-full mx-auto">
          {/* Header/Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold">Nepal Stay</h2>
              <span className="text-[10px] tracking-[.3em] text-[#F6C768] font-bold uppercase">Management Portal</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Welcome Back</h1>
          <p className="mb-10 text-[#B0B8D1] text-sm leading-relaxed">System authentication required for regional hub operations.</p>

          <div className="bg-[#181F36] rounded-2xl shadow-2xl p-8 border border-white/5">
            {error && (
              <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded text-red-200 text-xs font-bold uppercase tracking-wider">
                {error}
              </div>
            )}

            {showPasswordSet ? (
              <form onSubmit={handleSetPasswordSubmit} className="space-y-6">
                <h2 className="text-xl font-bold mb-4">Establish Password</h2>
                {passwordSetError && <p className="text-red-400 text-xs mb-4">{passwordSetError}</p>}

                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Verified Email</label>
                  <input type="email" value={passwordSetEmail} disabled className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white/50 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Confirm Key</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#6C63FF] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#5548C8] transition-all">
                  {loading ? 'Processing...' : 'Set Password'}
                </button>
                <button type="button" onClick={() => setShowPasswordSet(false)} className="w-full text-center text-xs text-[#B0B8D1] mt-4 hover:text-white underline underline-offset-4 decoration-[#6C63FF]">Back to Entry</button>
              </form>
            ) : showForgotPassword ? (
              <form onSubmit={handlePasswordRecovery} className="space-y-6">
                <h2 className="text-xl font-bold mb-2">Recover Access</h2>
                <p className="text-xs text-[#B0B8D1] mb-6">Credential recovery instructions will be dispatched to your registry email.</p>

                {forgotPasswordError && <p className="text-red-400 text-xs mb-4">{forgotPasswordError}</p>}
                {forgotPasswordSuccess && <p className="text-emerald-400 text-xs mb-4">{forgotPasswordSuccess}</p>}

                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Registry Email</label>
                  <input type="email" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF]" placeholder="Enter your email address" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#6C63FF] py-3 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-[#5548C8] transition-all">
                  {loading ? 'Syncing...' : 'Dispatch Request'}
                </button>
                <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full text-center text-xs text-[#B0B8D1] mt-4 hover:text-white underline underline-offset-4">Return to Login</button>
              </form>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Your Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Enter your email" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Enter your password" required />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center text-xs text-[#B0B8D1] cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 bg-[#232B47] border-none rounded focus:ring-[#6C63FF]" />
                    <span className="ml-2 group-hover:text-white transition-colors">Session Persistence</span>
                  </label>
                  <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-[#6C63FF] font-bold hover:underline underline-offset-4">Forget Password?</button>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-[#6C63FF] py-4 rounded-lg font-extrabold text-sm tracking-[.2em] uppercase shadow-lg shadow-[#6C63FF]/20 hover:bg-[#5548C8] active:scale-[0.98] transition-all">
                  {loading ? 'Authenticating...' : 'Login'}
                </button>

                <div className="relative pt-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#232B47]"></div></div>
                  <div className="relative flex justify-center"><span className="px-4 bg-[#181F36] text-[10px] text-[#B0B8D1] font-bold uppercase tracking-widest">Protocol Sync</span></div>
                </div>

                <div className="flex justify-center" id="google-signin-button"></div>

                <p className="text-center text-xs text-[#B0B8D1] pt-4">
                  New User? {' '}
                  <Link to="/signup" className="text-[#F6C768] font-bold hover:underline underline-offset-4">Join Now</Link>
                </p>
              </form>
            )}

            <div className="mt-8 flex justify-between text-[8px] font-bold text-[#B0B8D1] uppercase tracking-[0.3em] pt-6 border-t border-[#232B47]">
              <span>StayNepal Core v1.0</span>
              <span className="cursor-help hover:text-white transition-colors">Technical Query</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Section */}
      <div className="hidden md:flex md:w-1/2 h-screen relative items-center justify-center bg-[#181F36] overflow-hidden">
        <img src="/images/unnamed.png" alt="Operational Environment" className="absolute inset-0 w-full h-full object-cover object-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10182F] via-[#10182F]/10 to-transparent"></div>

        <div className="relative z-10 px-10 lg:px-20 space-y-8">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#F6C768] text-xl">★</span>)}
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold text-white max-w-lg mb-6 leading-tight italic">
              "Excellence in regional hospitality management through integrated logistical systems."
            </p>
            <span className="text-[12px] font-extrabold tracking-[.4em] text-[#F6C768] uppercase">Nepalized Hospitality Paradigm</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
