import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate  = useNavigate();
  
  // keeping state simple and separate
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // State for password set mode
  const [showPasswordSet, setShowPasswordSet] = useState(false);
  const [passwordSetEmail, setPasswordSetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSetError, setPasswordSetError] = useState('');

  // State for forgot password mode
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');

  useEffect(() => {
    // Initialize Google Sign-In
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Wait for Google script to load and initialize
    const checkGoogle = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '18463607092-ft28c7n4m37451pav1v5dnhq97harv5v.apps.googleusercontent.com',
            callback: handleGoogleCredential,
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

          // Also prompt for One Tap if user is not signed in
          window.google.accounts.id.prompt();
        } catch (error) {
          console.error('Google initialization error:', error);
          setError('Google sign-in is not available. Please try regular login.');
        }
      } else {
        setTimeout(checkGoogle, 100);
      }
    };
    checkGoogle();

    // Cleanup function
    return () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.cancel();
      }
    };
  }, []);

  const handleGoogleCredential = async (response) => {
    // Handle Google OAuth response and authenticate user
    try {
      setLoading(true);
      setError('');

      const res = await axios.post('http://localhost:5000/api/auth/google', {
        credential: response.credential
      });

      // save token and user data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // redirect based on role
      const redirectPath = res.data.redirectPath || '/guest/dashboard';
      navigate(redirectPath);
      
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    // Handle regular email/password login
    e.preventDefault();
    setError('');
    
    // quick validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: email,
        password: password
      });

      // save token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // redirect based on role
      const redirectPath = response.data.redirectPath || '/user/dashboard';
      navigate(redirectPath);
      
    } catch (err) {
      console.error('Login error:', err);
      
      // Check if user needs to set password (Google user)
      if (err.response?.data?.requiresPasswordSet) {
        setError(err.response.data.message);
        setPasswordSetEmail(email);
        setShowPasswordSet(true);
      } else {
        setError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    // Handle password set for Google users
    e.preventDefault();
    setPasswordSetError('');

    if (!newPassword || !confirmPassword) {
      setPasswordSetError('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordSetError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordSetError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/set-password', {
        email: passwordSetEmail,
        newPassword: newPassword
      });

      // Reset form and show success
      alert('Password set successfully! You can now log in with your email and password.');
      setShowPasswordSet(false);
      setNewPassword('');
      setConfirmPassword('');
      setPassword('');
      
    } catch (err) {
      console.error('Set password error:', err);
      setPasswordSetError(err.response?.data?.message || 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordSuccess('');

    if (!forgotPasswordEmail) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/request-password-reset', {
        email: forgotPasswordEmail
      });

      setForgotPasswordSuccess(response.data.message || 'Password reset link has been sent to your email.');
      
    } catch (err) {
      console.error('Forgot password error:', err);
      setForgotPasswordError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#10182F]">
      {/* Left: Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-0 md:min-h-screen bg-[#10182F] text-white relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Header */}
          <div className="mb-6 sm:mb-10 flex items-center gap-3">
            
            <div>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">Nepal Stay</h2>
              <span className="text-xs tracking-widest text-[#F6C768] font-semibold">Login PortaL</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="mb-6 sm:mb-8 text-sm sm:text-base text-[#B0B8D1]">Please enter your credentials to access the webapp.</p>

          {/* Set Password Form */}
          {showPasswordSet ? (
            <div className="bg-[#181F36] rounded-2xl shadow-xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Set Password</h2>
              <p className="text-sm text-[#B0B8D1] mb-6">Your Google account doesn't have a password yet. Set one now to use email/password login.</p>
              
              {passwordSetError && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded">
                  <p className="text-xs sm:text-sm text-red-700">{passwordSetError}</p>
                </div>
              )}

              <form onSubmit={handleSetPassword} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">EMAIL</label>
                  <input
                    type="email"
                    value={passwordSetEmail}
                    disabled
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-[#999] placeholder-[#B0B8D1] outline-none"
                  />
                </div>

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
                  disabled={loading}
                  className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-2 sm:py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Setting Password...' : 'SET PASSWORD'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSet(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordSetError('');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 sm:py-3 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base"
                >
                  Back to Login
                </button>
              </form>
            </div>
          ) : showForgotPassword ? (
            // Forgot Password Form
            <div className="bg-[#181F36] rounded-2xl shadow-xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Forgot Password</h2>
              <p className="text-sm text-[#B0B8D1] mb-6">Enter your email address and we'll send you a link to reset your password.</p>
              
              {forgotPasswordError && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded">
                  <p className="text-xs sm:text-sm text-red-700">{forgotPasswordError}</p>
                </div>
              )}

              {forgotPasswordSuccess && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-3 sm:p-4 rounded">
                  <p className="text-xs sm:text-sm text-green-700">{forgotPasswordSuccess}</p>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">EMAIL</label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-2 sm:py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Sending...' : 'SEND RESET LINK'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordError('');
                    setForgotPasswordSuccess('');
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 sm:py-3 rounded-lg font-bold transition-all duration-200 text-sm sm:text-base"
                >
                  Back to Login
                </button>
              </form>
            </div>
          ) : (
            // Login Form
            <div className="bg-[#181F36] rounded-2xl shadow-xl p-6 sm:p-8">
              {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 rounded">
                  <p className="text-xs sm:text-sm text-red-700">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest"> EMAIL</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder=" Enter your mail"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-sm sm:text-base text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <label className="flex items-center text-[#B0B8D1] text-xs">
                    <input type="checkbox" className="w-4 h-4 text-[#6C63FF] border-[#232B47] rounded focus:ring-[#6C63FF]" />
                    <span className="ml-2">Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotPasswordEmail(email);
                      setForgotPasswordError('');
                      setForgotPasswordSuccess('');
                    }}
                    className="text-xs text-[#6C63FF] hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-2 sm:py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {loading ? 'Signing in...' : 'LOG IN'}
                </button>
              </form>
              <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-[#B0B8D1]">
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#F6C768] hover:underline font-semibold">Register Now</Link>
              </p>

              {/* Google Login */}
              <div className="mt-4 sm:mt-6">
                <div className="relative mb-4 sm:mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#232B47]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-[#181F36] text-[#B0B8D1]">OR</span>
                  </div>
                </div>
                <div className="flex justify-center">
                  <div id="google-signin-button"></div>
                </div>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center sm:justify-between text-xs text-[#B0B8D1] gap-2 sm:gap-0">
                <span>Terms and Condition</span>
                <span className="hover:underline cursor-pointer">Help & Support</span>
              </div>
            </div>
          )}
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
            <p className="text-xl lg:text-2xl font-bold text-white max-w-md mb-4">"Experience hospitality redefined through seamless management."</p>
            <span className="text-[#F6C768] font-semibold tracking-widest text-xs">EXCELLENCE IN SERVICE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
