import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { API_URL } from '../config/api';

const SubmitHotelPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hotelForm, setHotelForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    description: '',
    image: ''
  });

  const [roomTypes, setRoomTypes] = useState([
    { name: '', description: '', base_price: '', max_occupancy: 2 }
  ]);

  const [rooms, setRooms] = useState([
    { room_number: '', floor: '', room_type_index: 0 }
  ]);

  const [contractAccepted, setContractAccepted] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHotelForm({ ...hotelForm, image: JSON.stringify([reader.result]) });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const validateStep1 = () => {
    if (!hotelForm.name.trim()) {
      alert('Hotel name is required.');
      return false;
    }
    if (!hotelForm.city.trim()) {
      alert('City is required.');
      return false;
    }
    if (!hotelForm.country.trim()) {
      alert('Country is required.');
      return false;
    }
    if (!hotelForm.phone.trim()) {
      alert('Phone number is required.');
      return false;
    }
    if (!hotelForm.email.trim() || !hotelForm.email.includes('@')) {
      alert('Valid email is required.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (roomTypes.some(rt => !rt.name.trim())) {
      alert('All room categories must have a name.');
      return false;
    }
    if (roomTypes.some(rt => !rt.base_price || parseFloat(rt.base_price) <= 0)) {
      alert('All room categories must have a valid base price.');
      return false;
    }
    if (rooms.some(r => !r.room_number.trim())) {
      alert('All rooms must have a room number.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!contractAccepted) {
      alert('Please read and accept the listing agreement to continue.');
      return;
    }

    if (!validateStep2()) return;

    const processedRoomTypes = roomTypes.map(rt => ({
      name: rt.name.trim(),
      description: rt.description || null,
      base_price: parseFloat(rt.base_price),
      max_occupancy: Math.max(1, parseInt(rt.max_occupancy, 10) || 2)
    }));

    const processedRooms = rooms.map(r => ({
      room_number: r.room_number.trim(),
      floor: r.floor === '' || r.floor == null ? null : parseInt(r.floor, 10),
      room_type_index: parseInt(r.room_type_index, 10)
    }));

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/hotels/request`,
        {
          ...hotelForm,
          contractAccepted: true,
          roomTypes: processedRoomTypes,
          rooms: processedRooms
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Hotel request submitted! Our team will verify your details and contact you within 48 hours.');
      navigate('/guest/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit hotel registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#2D3748] font-sans antialiased flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <button
              onClick={() => navigate('/guest/list-your-hotel')}
              className="flex items-center gap-2 text-[#B88E2F] font-semibold text-sm mb-6 hover:text-[#9E7A28] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
            <h1 className="text-4xl font-bold text-[#1B2B41] mb-3">Hotel Registration Form</h1>
            <p className="text-[#64748B] text-lg">Step {currentStep} of 3</p>
          </div>

          <div className="mb-10 flex gap-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    step < currentStep
                      ? 'bg-[#B88E2F] text-white'
                      : step === currentStep
                      ? 'bg-[#B88E2F] text-white ring-4 ring-[#B88E2F]/30'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {step < currentStep ? <span className="material-symbols-outlined text-base">check</span> : step}
                </div>
                {step < 3 && <div className={`h-1 w-8 ${step < currentStep ? 'bg-[#B88E2F]' : 'bg-slate-200'}`}></div>}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-lg overflow-hidden">
            <form onSubmit={handleSubmit} className="p-8 md:p-10">
              {currentStep === 1 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1B2B41] mb-2">Property Details</h2>
                    <p className="text-[#64748B]">Tell us about your hotel</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                        Hotel Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={hotelForm.name}
                        onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                        placeholder="e.g. Himalaya Grand Hotel"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                        Description
                      </label>
                      <textarea
                        rows="4"
                        value={hotelForm.description}
                        onChange={(e) => setHotelForm({ ...hotelForm, description: e.target.value })}
                        className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl resize-none"
                        placeholder="Brief description of your hotel and amenities..."
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider mb-4">Location</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                            City <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={hotelForm.city}
                            onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })}
                            className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                            placeholder="e.g. Kathmandu"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                            Country <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={hotelForm.country}
                            onChange={(e) => setHotelForm({ ...hotelForm, country: e.target.value })}
                            className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                            placeholder="e.g. Nepal"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                          Address
                        </label>
                        <input
                          type="text"
                          value={hotelForm.address}
                          onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                          className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                          placeholder="Street address"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider mb-4">Contact Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={hotelForm.phone}
                          onChange={(e) => setHotelForm({ ...hotelForm, phone: e.target.value })}
                          className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                          placeholder="e.g. +977-1-XXXXX"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={hotelForm.email}
                          onChange={(e) => setHotelForm({ ...hotelForm, email: e.target.value })}
                          className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[13px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-xl"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1B2B41] mb-2">Rooms & Pricing</h2>
                    <p className="text-[#64748B]">Define your room categories and physical rooms</p>
                  </div>

                  <div className="space-y-4 border-b pb-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider">Room Categories</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setRoomTypes([...roomTypes, { name: '', description: '', base_price: '', max_occupancy: 2 }])
                        }
                        className="text-[12px] font-bold text-[#B88E2F] hover:underline transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Category
                      </button>
                    </div>

                    {roomTypes.map((rt, idx) => (
                      <div key={`rt-${idx}`} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                        <div>
                          <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                            Category Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={rt.name}
                            onChange={(e) => {
                              const next = [...roomTypes];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setRoomTypes(next);
                            }}
                            placeholder="e.g. Deluxe, Standard"
                            className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                              Base Price (NPR) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={rt.base_price}
                              onChange={(e) => {
                                const next = [...roomTypes];
                                next[idx] = { ...next[idx], base_price: e.target.value };
                                setRoomTypes(next);
                              }}
                              placeholder="Price per night"
                              className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                              Max Guests
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={rt.max_occupancy}
                              onChange={(e) => {
                                const next = [...roomTypes];
                                next[idx] = { ...next[idx], max_occupancy: e.target.value };
                                setRoomTypes(next);
                              }}
                              className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={rt.description}
                            onChange={(e) => {
                              const next = [...roomTypes];
                              next[idx] = { ...next[idx], description: e.target.value };
                              setRoomTypes(next);
                            }}
                            placeholder="e.g. Spacious room with city view"
                            className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                          />
                        </div>

                        {roomTypes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = roomTypes.filter((_, i) => i !== idx);
                              setRoomTypes(next);
                              setRooms((prev) =>
                                prev.map((rm) => {
                                  let t = parseInt(rm.room_type_index, 10);
                                  if (t === idx) return { ...rm, room_type_index: 0 };
                                  if (t > idx) return { ...rm, room_type_index: Math.max(0, t - 1) };
                                  return rm;
                                })
                              );
                            }}
                            className="text-[11px] font-bold text-red-600 hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider">Physical Rooms</h3>
                      <button
                        type="button"
                        onClick={() =>
                          setRooms([...rooms, { room_number: '', floor: '', room_type_index: 0 }])
                        }
                        className="text-[12px] font-bold text-[#B88E2F] hover:underline transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Room
                      </button>
                    </div>

                    {rooms.map((rm, idx) => (
                      <div key={`rm-${idx}`} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                              Room Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={rm.room_number}
                              onChange={(e) => {
                                const next = [...rooms];
                                next[idx] = { ...next[idx], room_number: e.target.value };
                                setRooms(next);
                              }}
                              placeholder="e.g. 101, A-5"
                              className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                              Floor
                            </label>
                            <input
                              type="number"
                              value={rm.floor}
                              onChange={(e) => {
                                const next = [...rooms];
                                next[idx] = { ...next[idx], floor: e.target.value };
                                setRooms(next);
                              }}
                              placeholder="Floor number"
                              className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium placeholder:text-slate-500 transition-all outline-none rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-1">
                              Category
                            </label>
                            <select
                              value={rm.room_type_index}
                              onChange={(e) => {
                                const next = [...rooms];
                                next[idx] = { ...next[idx], room_type_index: parseInt(e.target.value, 10) };
                                setRooms(next);
                              }}
                              className="w-full bg-white border border-slate-300 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-3 py-2 text-[12px] font-medium transition-all outline-none rounded-lg"
                            >
                              {roomTypes.map((c, i) => (
                                <option key={`opt-${i}`} value={i}>
                                  {c.name?.trim() || `Category ${i + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRooms(rooms.filter((_, i) => i !== idx))}
                            className="text-[11px] font-bold text-red-600 hover:underline transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1B2B41] mb-2">Review & Confirm</h2>
                    <p className="text-[#64748B]">Verify your information before submitting</p>
                  </div>

                  <div className="space-y-6 border-b pb-6">
                    <div>
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider mb-3">Property Details</h3>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        <p><span className="font-semibold text-[#1B2B41]">Name:</span> {hotelForm.name}</p>
                        <p><span className="font-semibold text-[#1B2B41]">Location:</span> {hotelForm.city}, {hotelForm.country}</p>
                        <p><span className="font-semibold text-[#1B2B41]">Phone:</span> {hotelForm.phone}</p>
                        <p><span className="font-semibold text-[#1B2B41]">Email:</span> {hotelForm.email}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider mb-3">Room Categories</h3>
                      <div className="space-y-2">
                        {roomTypes.map((rt, idx) => (
                          <div key={`review-rt-${idx}`} className="bg-slate-50 rounded-lg p-3 text-sm">
                            <p><span className="font-semibold text-[#1B2B41]">{rt.name}</span> - NPR {rt.base_price}/night</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase tracking-wider mb-3">Physical Rooms</h3>
                      <p className="text-sm text-[#64748B]">{rooms.length} room(s) listed</p>
                    </div>
                  </div>

                  <div className="space-y-4 border border-[#E5D5B0] rounded-xl bg-[#FFF8E8] p-5">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contractAccepted}
                        onChange={(e) => setContractAccepted(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#B88E2F] shrink-0"
                      />
                      <span className="text-[12px] text-[#6B4F14] font-medium leading-relaxed">
                        I confirm that the information above is accurate and complete. I am authorized to list this property on Nepal Stay. I agree to the platform's terms including commission on bookings, truthful pricing, guest safety standards, and timely updates to availability. I understand that Super Admin may reject listings that do not meet policy.
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#1B2B41] uppercase tracking-wider block mb-2">
                      Hotel Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full bg-white border border-slate-300 file:bg-[#EEF2F7] file:border-0 file:text-[#1B2B41] file:font-semibold file:px-3 file:py-2 file:mr-3 focus:border-[#B88E2F] focus:ring-2 focus:ring-[#B88E2F]/20 px-4 py-3 text-[12px] font-medium transition-all outline-none rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-col-reverse sm:flex-row gap-4 sm:justify-between pt-6 border-t">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-6 py-3 text-[12px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    currentStep === 1
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Back
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 py-3 bg-[#B88E2F] text-white text-[12px] font-bold uppercase tracking-wider rounded-lg hover:bg-[#9E7A28] transition-all shadow-md transform active:scale-[0.98]"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-3 text-[12px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md transform active:scale-[0.98] ${
                      isSubmitting
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#B88E2F] text-white hover:bg-[#9E7A28]'
                    }`}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubmitHotelPage;
