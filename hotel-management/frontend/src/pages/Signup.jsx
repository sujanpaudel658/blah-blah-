import React, { useState } from "react";
import { Link } from "react-router-dom";

const Signup = () => {
  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  // Handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your registration logic here
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#10182F] overflow-hidden">
      {/* Left: Signup Form */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 py-12 md:py-0 md:min-h-screen bg-[#10182F] text-white relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Logo/Header */}
          <div className="mb-10 flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight">Nepal Stay</h2>
              <span className="text-xs tracking-widest text-[#F6C768] font-semibold">Registration PortaL</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="mb-8 text-[#B0B8D1]">Please fill in your details to join the platform.</p>

          {/* Signup Form */}
          <div className="bg-[#181F36] rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">FULL NAME</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">EMAIL</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">PASSWORD</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Create a password"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#B0B8D1] mb-2 tracking-widest">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white placeholder-[#B0B8D1] focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent outline-none transition"
                  placeholder="Repeat your password"
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  className="h-4 w-4 text-[#6C63FF] border-[#232B47] rounded focus:ring-[#6C63FF] bg-[#232B47]"
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={form.terms}
                  onChange={handleChange}
                  required
                />
                <label className="ml-2 block text-xs text-[#B0B8D1]" htmlFor="terms">
                  I agree to the <a className="text-[#6C63FF] hover:underline" href="#">Terms & Conditions</a>
                </label>
              </div>
              <button
                type="submit"
                className="w-full bg-[#6C63FF] hover:bg-[#5548C8] text-white py-3 rounded-lg font-bold shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register Now
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-[#B0B8D1]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#F6C768] hover:underline font-semibold">Log In</Link>
            </p>
            <div className="mt-8 flex items-center justify-between text-xs text-[#B0B8D1]">
              <span>System v2.4.0</span>
              <span className="hover:underline cursor-pointer">Help & Support</span>
            </div>
          </div>
        </div>
      </div>
      {/* Right: Image & Info */}
      <div className="hidden md:flex w-1/2 min-h-screen relative items-center justify-center bg-[#181F36]">
          <img src="/images/images.png" alt="Hotel Lobby" className="absolute inset-0 w-full h-full object-cover object-top opacity-40" />
          <div className="relative z-10 flex flex-col items-start justify-center h-full px-16">
            <div className="mb-8">
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-[#F6C768] text-lg">&#9733;</span>
                ))}
              </div>
              <p className="text-2xl font-bold text-white max-w-md mb-4">"Discover the serenity of the Himalayas. Join our community to book your perfect getaway."</p>
              <span className="text-[#F6C768] font-bold tracking-widest text-xs">EXCELLENCE IN SERVICE</span>
            </div>
          </div>
      </div>
    </div>
  );
};

export default Signup;