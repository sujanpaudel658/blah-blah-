import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
  const navigate  = useNavigate();
  
  // keeping state simple and separate
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
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
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // handle google login success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setError('');

      // send the credential directly to backend
      const response = await axios.post('http://localhost:5000/api/auth/google', {
        credential: credentialResponse.credential
      });

      // save token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // redirect based on role
      const redirectPath = response.data.redirectPath || '/guest/dashboard';
      navigate(redirectPath);
      
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // handle google login failure
  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#10182F]">
      {/* Left: Login Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 py-12 md:py-0 md:min-h-screen bg-[#10182F] text-white relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Header */}
          <div className="mb-10 flex items-center gap-3">
            
            <div>
              <h2 className="text-xl font-bold leading-tight">Nepal Stay</h2>
              <span className="text-xs tracking-widest text-[#F6C768] font-semibold">Login PortaL</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="mb-8 text-[#B0B8D1]">Please enter your credentials to access the webapp.</p>

          {/* Login Form */}
          <div className="bg-[#181F36] rounded-2xl shadow-xl p-8">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest"> EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
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
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center text-[#B0B8D1] text-xs">
                  <input type="checkbox" className="w-4 h-4 text-[#6C63FF] border-[#232B47] rounded focus:ring-[#6C63FF]" />
                  <span className="ml-2">Remember me</span>
                </label>
                <button type="button" className="text-xs text-[#6C63FF] hover:underline font-semibold">Forgot Password?</button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'LOG IN'}
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-[#B0B8D1]">
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#F6C768] hover:underline font-semibold">Register Now</Link>
            </p>
            <div className="mt-8 flex items-center justify-between text-xs text-[#B0B8D1]">
              <span>Terms and Condition</span>
              <span className="hover:underline cursor-pointer">Help & Support</span>
            </div>
          </div>
        </div>
      </div>
      {/* Right: Image & Quote */}
      <div className="hidden md:flex w-1/2 min-h-screen relative items-center justify-center bg-[#181F36]">
        <img src="/images/unnamed.png" alt="Hotel Lobby" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="relative z-10 flex flex-col items-start justify-center h-full px-16">
          <div className="mb-8">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-[#F6C768] text-lg">&#9733;</span>
              ))}
            </div>
            <p className="text-2xl font-bold text-white max-w-md mb-4">"Experience hospitality redefined through seamless management."</p>
            <span className="text-[#F6C768] font-semibold tracking-widest text-xs">EXCELLENCE IN SERVICE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
