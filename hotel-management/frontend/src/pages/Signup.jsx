import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Signup = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.phone || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!form.terms) {
      setError("Please accept the terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/auth/signup", {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      alert('Account created! You can now sign in.');
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
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
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[#C4993E] text-[22px]">apartment</span>
              <span className="font-bold text-[16px] text-[#1A2332]" style={{ fontFamily: "'Playfair Display', serif" }}>StayNepal</span>
            </div>
            <h1 className="text-3xl font-bold text-[#1A2332] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Create your account</h1>
            <p className="text-[15px] text-[#6B7B8D]">Join StayNepal to discover and book the best hotels in Nepal.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E4DE] p-8">
            {error && (
              <div className="mb-5 bg-[#FDEDED] border-l-3 border-[#C0392B] p-4 rounded-lg text-[#C0392B] text-[13px] font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass}>Full Name</label><input type="text" name="fullName" value={form.fullName} onChange={handleFieldChange} className={inputClass} placeholder="Rajesh Hamal" required /></div>
                <div><label className={labelClass}>Phone</label><input type="tel" name="phone" value={form.phone} onChange={handleFieldChange} className={inputClass} placeholder="+977 98XXXXXXXX" required /></div>
              </div>

              <div><label className={labelClass}>Email Address</label><input type="email" name="email" value={form.email} onChange={handleFieldChange} className={inputClass} placeholder="you@example.com" required /></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass}>Password</label><input type="password" name="password" value={form.password} onChange={handleFieldChange} className={inputClass} placeholder="Min 6 characters" required /></div>
                <div><label className={labelClass}>Confirm Password</label><input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleFieldChange} className={inputClass} placeholder="Re-enter password" required /></div>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={handleFieldChange} className="mt-0.5 h-4 w-4 rounded border-[#E8E4DE] text-[#C4993E] focus:ring-[#C4993E] cursor-pointer" required />
                <label htmlFor="terms" className="text-[13px] text-[#6B7B8D] cursor-pointer leading-tight">
                  I agree to the <a href="#" className="text-[#C4993E] font-medium hover:underline">Terms of Service</a> and <a href="#" className="text-[#C4993E] font-medium hover:underline">Privacy Policy</a>
                </label>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#1A2332] text-white py-3.5 rounded-lg font-semibold text-[14px] hover:bg-[#263345] active:scale-[0.99] transition-all shadow-sm mt-2">
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-[14px] text-[#6B7B8D]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#C4993E] font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex md:w-1/2 h-full relative items-end justify-start overflow-hidden">
        <img src="/images/images.png" alt="Hotel" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332] via-[#1A2332]/30 to-transparent"></div>

        <div className="relative z-10 px-12 pb-16 space-y-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#C4993E] text-lg"></span>)}
          </div>
          <p className="text-2xl font-bold text-white max-w-lg leading-snug" style={{ fontFamily: "'Playfair Display', serif" }}>
            "Booking through StayNepal was so easy. The process was smooth from start to finish."
          </p>
          <div>
            <p className="text-[14px] text-white/80 font-medium">— Verified Guest</p>
            <p className="text-[12px] text-[#C4993E] font-semibold mt-1">StayNepal Experience</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;