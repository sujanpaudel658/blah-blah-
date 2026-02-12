import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * Signup Component
 * 
 * Account initialization module for the StayNepal network.
 * Uses the original dark design with a dual-pane registration interface.
 */
const Signup = () => {
  const navigate = useNavigate();

  // Form metadata state
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

  /**
   * Standard Input Synchronization
   */
  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /**
   * Account Protocol Initiation
   */
  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation sequence
    if (!form.fullName || !form.email || !form.phone || !form.password || !form.confirmPassword) {
      setError("Protocol failure: Incomplete registry data.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Parity failure: Security keys mismatch.");
      return;
    }
    if (!form.terms) {
      setError("Authorization failure: Terms acceptance required.");
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
      alert('Registration verified. Account record initiated.');
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registry fault: System synchronization aborted.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-[#10182F]">
      {/* Control Panel: Registration Form */}
      <div className="w-full md:w-1/2 h-screen flex flex-col justify-center px-8 md:px-12 py-10 bg-[#10182F] text-white">
        <div className="max-w-md w-full mx-auto">
          {/* Brand Header */}
          <div className="mb-10 flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold">Nepal Stay</h2>
              <span className="text-[10px] tracking-[.3em] text-[#F6C768] font-bold uppercase">Registration Module</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Enlist Account</h1>
          <p className="mb-8 text-[#B0B8D1] text-sm">Fill in the required coordinates to join the platform network.</p>

          {/* Registration Console */}
          <div className="bg-[#181F36] rounded-2xl shadow-2xl p-8 border border-white/5 overflow-y-auto max-h-[80vh] custom-scrollbar">
            {error && (
              <div className="mb-6 bg-red-500/10 border-l-4 border-red-500 p-4 rounded text-red-200 text-xs font-bold uppercase tracking-wider">
                {error}
              </div>
            )}

            <form onSubmit={handleRegistrationSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Verified Name</label>
                  <input type="text" name="fullName" value={form.fullName} onChange={handleFieldChange} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Full Name" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Contact Link</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleFieldChange} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Phone Number" required />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Identity Email</label>
                <input type="email" name="email" value={form.email} onChange={handleFieldChange} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Mail@Registry.com" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">New Key</label>
                  <input type="password" name="password" value={form.password} onChange={handleFieldChange} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Password" required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#B0B8D1] mb-2 tracking-widest uppercase">Verify Key</label>
                  <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleFieldChange} className="w-full px-4 py-3 bg-[#232B47] border border-[#232B47] rounded-lg text-white text-sm outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all" placeholder="Confirm" required />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input id="terms" name="terms" type="checkbox" checked={form.terms} onChange={handleFieldChange} className="h-5 w-5 bg-[#232B47] border-none rounded focus:ring-[#6C63FF] cursor-pointer" required />
                <label htmlFor="terms" className="text-xs text-[#B0B8D1] cursor-pointer group">
                  I formally accept the <a href="#" className="text-[#6C63FF] font-bold hover:underline transition-all">Protocol Terms & Service Conditions</a>
                </label>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#6C63FF] py-4 rounded-lg font-extrabold text-sm tracking-[.2em] uppercase shadow-lg shadow-[#6C63FF]/20 hover:bg-[#5548C8] active:scale-[0.98] transition-all">
                {loading ? "Registering..." : "Initialize Registry"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-[#B0B8D1]">
              Existing membership? {' '}
              <Link to="/login" className="text-[#F6C768] font-bold hover:underline transition-all underline-offset-4 decoration-[#F6C768]/30">Open Terminal</Link>
            </p>

            <div className="mt-10 flex justify-between text-[8px] font-bold text-[#B0B8D1] uppercase tracking-[0.3em] pt-6 border-t border-[#232B47]">
              <span>Build Ver 2.4.0</span>
              <span className="cursor-help hover:text-white transition-colors">Documentation Hub</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hub Visual: Image Section */}
      <div className="hidden md:flex md:w-1/2 h-screen relative items-center justify-center bg-[#181F36] overflow-hidden">
        <img src="/images/images.png" alt="Portal Visual" className="absolute inset-0 w-full h-full object-cover object-center opacity-40 grayscale-[0.2]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10182F] via-transparent to-transparent"></div>

        <div className="relative z-10 px-10 lg:px-20 space-y-8">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => <span key={i} className="text-[#F6C768] text-xl">★</span>)}
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-bold text-white max-w-lg mb-6 leading-tight italic">
              "Secure your Himalayan adventure with integrated hospitality protocols and seamless management."
            </p>
            <span className="text-[12px] font-extrabold tracking-[.4em] text-[#F6C768] uppercase">Service Transparency & Merit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;