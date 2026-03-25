import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Footer from "../components/Footer";

// Fix for default marker icon issues in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const Home = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    location: '',
    guests: '',
    checkIn: '',
    checkOut: ''
  });
  const [rooms, setRooms] = useState([]);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [stats, setStats] = useState({ hotels: 0, reviews: 0, guests: 0 });
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [hotelRooms, setHotelRooms] = useState([]);
  const [hotelReviews, setHotelReviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [numGuests, setNumGuests] = useState(1);
  const [bookingDates, setBookingDates] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    fetch('http://localhost:5000/api/reviews/featured')
      .then(res => res.json())
      .then(data => {
        if (data.success) setExperiences(data.reviews);
      })
      .catch(err => console.error('Error fetching reviews:', err));

    // Fetch live landing page stats
    fetch('http://localhost:5000/api/hotels/public/stats')
      .then(res => res.json())
      .then(data => {
        if (data.success) setStats(data.stats);
      })
      .catch(err => console.error('Error fetching stats:', err));

    // Load initial hotels without scrolling
    executeSearch({ location: '', guests: '', checkIn: '', checkOut: '' }, false);
  }, []);

  const handleHotelClick = async (hotel) => {
    setSelectedHotel(hotel);
    setShowModal(true);
    
    // Fetch hotel-specific information
    try {
      // 1. Rooms
      const roomRes = await axios.get(`http://localhost:5000/api/rooms/search?hotelId=${hotel.id}&checkIn=${bookingDates.checkIn}&checkOut=${bookingDates.checkOut}`);
      if (roomRes.data.success) {
        // Group by type
        const roomsByType = roomRes.data.rooms.reduce((acc, r) => {
          if (!acc[r.room_type_id]) acc[r.room_type_id] = { ...r, count: 0 };
          acc[r.room_type_id].count += 1;
          return acc;
        }, {});
        setHotelRooms(Object.values(roomsByType));
      }

      // 2. Reviews
      const reviewRes = await axios.get(`http://localhost:5000/api/reviews/hotel/${hotel.id}`);
      if (reviewRes.data.success) {
        setHotelReviews(reviewRes.data.reviews);
      }
    } catch (error) {
      console.error('Data Fetch Error:', error);
    }
  };

  const handleBookNow = (hotel) => {
    if (!user) {
      navigate('/login', { state: { from: '/', message: 'Please log in to book your stay' } });
      return;
    }
    const target = user.role === 'admin' ? '/admin/dashboard' : (user.role === 'superadmin' ? '/superadmin/dashboard' : '/guest/dashboard');
    navigate(target, { state: { selectedHotel: hotel.name } });
  };

  const handleLogoClick = () => {
    if (!user) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    switch (user.role) {
      case 'admin': navigate('/admin/dashboard'); break;
      case 'superadmin': navigate('/superadmin/dashboard'); break;
      default: navigate('/guest/dashboard');
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const executeSearch = async (params, shouldScroll = true) => {
    setSearching(true);
    try {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`http://localhost:5000/api/rooms/search?${query}`);
      const data = await response.json();

      if (data.success) {
        const groupedByHotel = data.rooms.reduce((acc, room) => {
          const hotelId = room.hotel_id;
          if (!acc[hotelId]) {
            let parsedAmenities = [];
            if (room.amenities) {
              try {
                parsedAmenities = typeof room.amenities === 'string' 
                  ? JSON.parse(room.amenities) 
                  : (Array.isArray(room.amenities) ? room.amenities : []);
              } catch (e) {
                parsedAmenities = [];
              }
            }

            acc[hotelId] = {
              id: room.hotel_id,
              name: room.hotel_name,
              image: room.hotel_image,
              city: room.hotel_city,
              startingPrice: Number(room.base_price),
              totalUnits: 0,
              amenities: Array.isArray(parsedAmenities) ? parsedAmenities : [],
              rating: room.rating
            };
          }
          acc[hotelId].totalUnits++;
          if (Number(room.base_price) < acc[hotelId].startingPrice) {
            acc[hotelId].startingPrice = Number(room.base_price);
          }
          return acc;
        }, {});

        setRooms(Object.values(groupedByHotel));
        if (shouldScroll) {
          setTimeout(() => {
            const resultsNode = document.getElementById('search-results');
            if (resultsNode) resultsNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    executeSearch(searchParams);
  };

  const handleQuickSearch = (location) => {
    const updatedParams = { ...searchParams, location };
    setSearchParams(updatedParams);
    executeSearch(updatedParams);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C3E50] antialiased flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ─── Navigation ─── */}
      <nav className="h-[80px] bg-[#1A2332] sticky top-0 z-50 border-b border-white/5 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogoClick}>
            <div className="w-10 h-10 bg-[#C4993E] rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
              <span className="material-symbols-outlined text-white text-[24px]">apartment</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>StayNepal<span className="text-[#C4993E]">.</span></span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <button onClick={() => scrollToSection('about')} className="text-[14px] font-bold text-[#8896A6] hover:text-[#C4993E] uppercase tracking-widest transition-colors">About</button>
            <button onClick={() => scrollToSection('hotels')} className="text-[14px] font-bold text-[#8896A6] hover:text-[#C4993E] uppercase tracking-widest transition-colors">Stays</button>
            <button onClick={() => scrollToSection('experiences')} className="text-[14px] font-bold text-[#8896A6] hover:text-[#C4993E] uppercase tracking-widest transition-colors">Journal</button>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <button onClick={handleLogoClick} className="flex items-center gap-4 pl-6 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-[14px] font-bold text-white leading-tight">
                    {user.fullName || user.full_name || 'My Account'}
                  </p>
                  <p className="text-[11px] font-bold text-[#C4993E] uppercase tracking-tighter opacity-80">
                    {user.role === 'admin' ? 'Manager' : user.role === 'superadmin' ? 'Admin' : 'Guest'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-[#263345] to-[#1A2332] border border-white/10 flex items-center justify-center text-white rounded-xl hover:border-[#C4993E]/50 transition-all shadow-lg">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </div>
              </button>
            ) : (
              <>
                <a href="/login" className="text-[14px] font-bold text-white hover:text-[#C4993E] transition-colors uppercase tracking-widest">Sign In</a>
                <a href="/signup" className="bg-[#C4993E] text-white text-[14px] font-black px-8 py-3.5 rounded-xl hover:bg-[#AE872E] hover:shadow-[0_10px_20px_rgba(196,153,62,0.3)] transition-all uppercase tracking-widest">Join</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <main className="flex-1 overflow-x-hidden pt-20 pb-16 relative">
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0 h-[700px] overflow-hidden">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-30 grayscale-[20%]"
          >
            <source src="/videos/857267-hd_1920_1080_24fps.mp4" type="video/mp4" />
          </video>
          {/* Elegant Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/80 via-[#FAF8F5]/40 to-[#FAF8F5]"></div>
        </div>

        <div id="hotels" className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-[2px] bg-[#C4993E]"></span>
                <span className="text-[12px] font-semibold text-[#C4993E] uppercase tracking-[0.2em]">Integrated Booking Portal</span>
              </div>
              <h1 id="about" className="text-5xl lg:text-7xl font-bold text-[#1A2332] leading-[1.05] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Perfect <br />
                Stay <br />
                Finder<span className="text-[#C4993E]">.</span>
              </h1>
              <p className="text-[16px] text-[#6B7B8D] max-w-md leading-relaxed">
                Direct access to Nepal's best hotels. Verified rooms for your 
                business or vacation needs.
              </p>
            </div>

            {/* Destination Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-6">
              <div 
                onClick={() => handleQuickSearch('Kathmandu')}
                className="group cursor-pointer bg-white border-2 border-[#E8E4DE] rounded-[2rem] overflow-hidden shadow-sm hover:border-[#C4993E] hover:shadow-xl hover:-translate-y-2 transition-all duration-700"
              >
                <div className="overflow-hidden relative h-52">
                  <img src="/images/kathmandu.webp" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Kathmandu" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332]/40 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 backdrop-blur-md text-[#1A2332] px-6 py-2.5 rounded-full text-[13px] font-black uppercase tracking-widest shadow-xl">Explore Stays</span>
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-[12px] font-black text-[#C4993E] uppercase tracking-[0.2em] block mb-2">Heritage Capital</span>
                  <p className="text-[18px] font-black text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Kathmandu Valley</p>
                </div>
              </div>
              <div 
                onClick={() => handleQuickSearch('Pokhara')}
                className="group cursor-pointer bg-white border-2 border-[#E8E4DE] rounded-[2rem] overflow-hidden shadow-sm hover:border-[#C4993E] hover:shadow-xl hover:-translate-y-2 transition-all duration-700 translate-y-12"
              >
                <div className="overflow-hidden relative h-52">
                  <img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&h=280&q=80" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="Pokhara" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1A2332]/40 to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-white/90 backdrop-blur-md text-[#1A2332] px-6 py-2.5 rounded-full text-[13px] font-black uppercase tracking-widest shadow-xl">Explore Stays</span>
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-[12px] font-black text-[#C4993E] uppercase tracking-[0.2em] block mb-2">Lakeside Paradise</span>
                  <p className="text-[18px] font-black text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Pokhara Lakeside</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Search Bar ─── */}
          <div className="bg-white p-8 md:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] rounded-[2.5rem] relative overflow-hidden border-2 border-[#E8E4DE] fade-in transform scale-100">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C4993E]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            
            <form className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end relative z-10" onSubmit={handleSearch}>
              <div className="space-y-3">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-[#8896A6] flex items-center gap-2 mb-1 pl-1">
                  <span className="material-symbols-outlined text-[20px] text-[#C4993E] fill-1">location_on</span>
                  Destination
                </label>
                <div className="group bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-2xl overflow-hidden focus-within:border-[#C4993E] focus-within:bg-white focus-within:ring-4 ring-[#C4993E]/5 transition-all duration-500">
                  <input
                    type="text"
                    placeholder="Where to?"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-5 text-[#1A2332] text-[15px] font-bold placeholder-[#8896A6] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-[#8896A6] flex items-center gap-2 mb-1 pl-1">
                  <span className="material-symbols-outlined text-[20px] text-[#C4993E] fill-1">calendar_month</span>
                  Check-in
                </label>
                <div className="group bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-2xl overflow-hidden focus-within:border-[#C4993E] focus-within:bg-white focus-within:ring-4 ring-[#C4993E]/5 transition-all duration-500">
                  <input
                    type="date"
                    value={searchParams.checkIn}
                    onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-5 text-[#1A2332] text-[15px] font-bold outline-none [color-scheme:light]"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[12px] font-black uppercase tracking-[0.2em] text-[#8896A6] flex items-center gap-2 mb-1 pl-1">
                  <span className="material-symbols-outlined text-[20px] text-[#C4993E] fill-1">group</span>
                  Guests
                </label>
                <div className="group bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-2xl overflow-hidden focus-within:border-[#C4993E] focus-within:bg-white focus-within:ring-4 ring-[#C4993E]/5 transition-all duration-500">
                  <input
                    type="number"
                    min="1"
                    placeholder="No. of guests"
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams({ ...searchParams, guests: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-5 text-[#1A2332] text-[15px] font-bold placeholder-[#8896A6] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={searching}
                className="h-[64px] bg-[#1A2332] text-white flex items-center justify-center gap-3 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-[#2C3E50] hover:shadow-[0_20px_40px_-10px_rgba(26,35,50,0.3)] transition-all active:scale-95 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#C4993E]/0 via-[#C4993E]/10 to-[#C4993E]/0 -translate-x-full group-hover:transition-transform group-hover:duration-1000 group-hover:translate-x-full"></div>
                {searching ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">search</span>
                    SEARCH HOTELS
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ─── Search Results ─── */}
          {(rooms.length > 0) && (
            <div id="search-results" className="mt-32 space-y-12">
              <div className="flex flex-col md:flex-row items-end justify-between gap-6 border-b-2 border-[#E8E4DE] pb-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-[2px] bg-[#C4993E]"></span>
                    <span className="text-[12px] font-bold text-[#C4993E] uppercase tracking-[0.2em]">{searchParams.location ? 'Location Search' : 'Featured Selection'}</span>
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-black text-[#1A2332] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {searchParams.location ? `Stays in ${searchParams.location}` : 'Explore Featured Stays'}
                  </h2>
                  <p className="text-[16px] text-[#6B7B8D] font-medium max-w-lg">
                    {searchParams.location 
                      ? `We've discovered ${rooms.length} exclusive properties matching your destination in ${searchParams.location}.` 
                      : `Handpicked selection of ${rooms.length} elite properties representing the best of Nepalese hospitality.`}
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-white border-2 border-[#E8E4DE] px-6 py-3 rounded-2xl shadow-sm">
                  <span className="material-symbols-outlined text-[#C4993E] text-[22px] fill-1">verified</span>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[#8896A6] uppercase tracking-widest leading-none mb-1">Curation</p>
                    <p className="text-[14px] font-black text-[#1A2332] leading-none uppercase">Expert Verified</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {rooms.map(hotel => (
                    <div key={hotel.id} 
                      onClick={() => handleHotelClick(hotel)}
                      className="border-2 border-[#E8E4DE] bg-white flex flex-col sm:flex-row hover:border-[#C4993E] hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-[2rem] overflow-hidden group cursor-pointer"
                    >
                      <div className="w-full sm:w-[280px] h-[280px] sm:h-auto overflow-hidden relative">
                        <img
                          src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          alt={hotel.name}
                        />
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#E8E4DE] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px] text-[#C4993E] fill-1">star</span>
                          <span className="text-[12px] font-bold text-[#1A2332]">{Number(hotel.rating || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-1">
                            <h3 className="text-xl font-bold text-[#1A2332] leading-tight">{hotel.name}</h3>
                            <div className="flex items-center gap-1.5 text-[#6B7B8D] text-[13px] font-medium">
                              <span className="material-symbols-outlined text-sm text-[#C4993E]">location_on</span>
                              {hotel.city || hotel.hotel_city}, Nepal
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-[#8896A6] uppercase tracking-wider mb-0.5">Starting from</p>
                            <p className="text-2xl font-black text-[#1A2332] tracking-tight">NPR {hotel.startingPrice.toLocaleString()}</p>
                            <p className="text-[11px] font-bold text-[#C4993E] uppercase tracking-widest">per night</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8">
                          {Array.isArray(hotel.amenities) && hotel.amenities.slice(0, 4).map((amt, idx) => (
                            <span key={idx} className="text-[10px] font-bold text-[#6B7B8D] bg-[#F4F3F0] border border-[#E8E4DE] px-4 py-1.5 rounded-full uppercase tracking-wider">
                              {amt}
                            </span>
                          ))}
                          {hotel.amenities && hotel.amenities.length > 4 && (
                            <span className="text-[10px] font-bold text-[#C4993E] bg-[#C4993E]/5 px-3 py-1.5 rounded-full">+{hotel.amenities.length - 4}</span>
                          )}
                        </div>

                        <div className="mt-auto flex items-center justify-between pt-6 border-t border-[#F4F3F0]">
                          <div className="flex items-center gap-2.5">
                            <div className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2D8659] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2D8659]"></span>
                            </div>
                            <span className="text-[13px] font-bold text-[#2D8659] uppercase tracking-wide">{hotel.totalUnits} rooms free</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookNow(hotel);
                            }}
                            className={`${user ? 'bg-[#C4993E]' : 'bg-[#1A2332]'} text-white py-3 px-8 text-[13px] font-black uppercase tracking-wider hover:bg-[#AE872E] hover:shadow-[0_10px_20px_rgba(196,153,62,0.3)] transition-all rounded-xl active:scale-95`}
                          >
                            {user ? 'Book Now' : 'Login to Book'}
                          </button>
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Guest Reviews ─── */}
          <div id="experiences" className="mt-24 space-y-12">
            <div className="flex flex-col items-center text-center space-y-3">
              <span className="text-[12px] font-semibold text-[#C4993E] uppercase tracking-[0.2em]">What Our Guests Say</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Guest Reviews
              </h2>
              <p className="text-[#6B7B8D] max-w-md text-[15px]">
                Honest reviews from verified guests who stayed at our partner hotels
              </p>
            </div>

            {experiences.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="bg-white border border-[#E8E4DE] p-8 rounded-2xl shadow-sm hover:shadow-md transition-all relative">
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`material-symbols-outlined text-[16px] ${i < exp.rating ? 'text-yellow-400' : 'text-gray-200'}`} style={{ fontVariationSettings: `'FILL' ${i < exp.rating ? 1 : 0}` }}>star</span>
                        ))}
                      </div>
                      <span className="material-symbols-outlined text-[#C4993E]/20 text-3xl">format_quote</span>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[14px] font-semibold text-[#1A2332]">"{exp.title || 'Wonderful Experience'}"</h4>
                      <p className="text-[13px] text-[#6B7B8D] leading-relaxed line-clamp-4">
                        {exp.comment}
                      </p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-[#F4F3F0] flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A2332]">{exp.reviewer_name}</p>
                        <p className="text-[11px] text-[#C4993E] mt-0.5">Stayed at {exp.hotel_name}</p>
                      </div>
                      <span className="text-[11px] text-[#6B7B8D]">{new Date(exp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-white border border-dashed border-[#E8E4DE] rounded-2xl">
                <span className="material-symbols-outlined text-[#D8D4CE] text-4xl mb-3 block">rate_review</span>
                <p className="text-[13px] text-[#6B7B8D]">No reviews yet — be the first to share your experience!</p>
              </div>
            )}
          </div>

            {/* No Results */}
            {!searching && rooms.length === 0 && searchParams.location && (
              <div className="mt-20 text-center p-20 bg-white border-2 border-dashed border-[#D8D4CE] rounded-[2.5rem] fade-in transform scale-100">
                <div className="w-20 h-20 bg-[#F4F3F0] rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-4xl text-[#C4993E]">search_off</span>
                </div>
                <h2 className="text-2xl font-bold text-[#1A2332] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>No Experience Found</h2>
                <p className="text-[#6B7B8D] max-w-sm mx-auto text-[15px] leading-relaxed font-medium">
                  We couldn't find any premium stays matching "{searchParams.location}".
                  Try a different city or adjust your search.
                </p>
              </div>
            )}

            {/* ─── Stats ─── */}
            <div className="mt-28 grid grid-cols-2 md:grid-cols-3 gap-8 text-center bg-white border-2 border-[#E8E4DE] p-12 md:p-16 rounded-[2.5rem] relative overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] transition-all hover:shadow-xl">
              <div className="relative z-10">
                <p className="text-5xl font-black text-[#C4993E] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats.guests > 100 ? `${stats.guests}+` : stats.guests}
                </p>
                <span className="text-[13px] font-bold text-[#8896A6] mt-2 block uppercase tracking-widest">Happy Guests</span>
              </div>
              <div className="hidden md:block relative z-10">
                <p className="text-5xl font-black text-[#1A2332] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats.hotels}
                </p>
                <span className="text-[13px] font-bold text-[#8896A6] mt-2 block uppercase tracking-widest">Elite Partners</span>
              </div>
              <div className="relative z-10">
                <p className="text-5xl font-black text-[#1A2332] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {stats.reviews}
                </p>
                <span className="text-[13px] font-bold text-[#8896A6] mt-2 block uppercase tracking-widest">Global Reviews</span>
              </div>
            </div>
        </div>

        {/* ─── Hotel Details Modal ─── */}
        {showModal && selectedHotel && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 bg-[#0A0F1A]/95 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowModal(false)}></div>
            
            <div className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#FAF8F5] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-500 border-2 border-white/20">
              
              {/* Header */}
              <div className="absolute top-8 right-8 z-50">
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-14 h-14 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md border border-white/30"
                >
                  <span className="material-symbols-outlined text-[28px]">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                {/* Hero / Images */}
                <div className="h-[400px] md:h-[500px] relative">
                  <img 
                    src={selectedHotel.image ? (selectedHotel.image.startsWith('[') ? JSON.parse(selectedHotel.image)[0] : selectedHotel.image) : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200'} 
                    className="w-full h-full object-cover" 
                    alt={selectedHotel.name} 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5] via-transparent to-transparent"></div>
                  <div className="absolute bottom-12 left-12 right-12">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-[#C4993E] text-white px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest">Premium Selection</span>
                      <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-xl">
                        <span className="material-symbols-outlined text-[14px] text-yellow-500 fill-1">star</span>
                        <span className="text-[12px] font-black text-[#1A2332]">{Number(selectedHotel.rating || 0).toFixed(1)}</span>
                      </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-[#1A2332] tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {selectedHotel.name}
                    </h1>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="p-12 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
                  {/* Left Column: Details & Reviews */}
                  <div className="lg:col-span-2 space-y-16">
                    <div>
                      <h3 className="text-sm font-black text-[#C4993E] uppercase tracking-[0.2em] mb-4">About the Property</h3>
                      <p className="text-lg text-[#1A2332] leading-relaxed font-medium">
                        {selectedHotel.description || "Discover unparalleled luxury in this handpicked sanctuary. Combining authentic Nepalese hospitality with state-of-the-art amenities, this property offers a refined escape for the discerning traveler."}
                      </p>
                    </div>

                    {/* Room Availability */}
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b-2 border-[#E8E4DE] pb-6">
                        <h3 className="text-xl font-black text-[#1A2332] uppercase tracking-wider">Available Suites</h3>
                        <span className="text-[12px] font-bold text-[#8896A6]">{hotelRooms.length} Categories Found</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {hotelRooms.length > 0 ? hotelRooms.map(room => (
                          <div key={room.id} className="bg-white border-2 border-[#E8E4DE] p-8 rounded-[2rem] hover:border-[#C4993E] transition-all group">
                            <div className="flex justify-between items-start mb-6">
                              <div>
                                <h4 className="text-lg font-black text-[#1A2332] tracking-tight">{room.type_name}</h4>
                                <p className="text-[12px] font-bold text-[#8896A6] uppercase tracking-widest">Max {room.max_occupancy} Guests</p>
                              </div>
                              <span className="text-xl font-black text-[#C4993E]">NPR {room.base_price}</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                              <span className="bg-[#F4F3F0] text-[#1A2332] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Free Wifi</span>
                              <span className="bg-[#F4F3F0] text-[#1A2332] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Breakfast Incl.</span>
                              <span className="bg-[#F4F3F0] text-[#1A2332] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Air Conditioned</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-[#F4F3F0]">
                              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.15em]">{room.count} Available</span>
                              <button 
                                onClick={() => handleBookNow(selectedHotel)}
                                className="text-[12px] font-black text-[#1A2332] uppercase tracking-widest group-hover:text-[#C4993E] flex items-center gap-2"
                              >
                                Reserve Suite
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                              </button>
                            </div>
                          </div>
                        )) : (
                          <div className="col-span-full py-12 text-center bg-white border-2 border-dashed border-[#E8E4DE] rounded-[2rem]">
                            <span className="material-symbols-outlined text-4xl text-[#8896A6] mb-2">hotel</span>
                            <p className="text-[12px] font-bold text-[#8896A6] uppercase tracking-widest">No rooms listed for this selection</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guest Reviews */}
                    <div className="space-y-8">
                       <h3 className="text-xl font-black text-[#1A2332] uppercase tracking-wider border-b-2 border-[#E8E4DE] pb-6">Guest Experiences</h3>
                       <div className="space-y-6">
                        {hotelReviews.length > 0 ? hotelReviews.map(review => (
                          <div key={review.id} className="bg-white p-8 rounded-3xl border border-[#E8E4DE]">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#1A2332] text-[#C4993E] rounded-full flex items-center justify-center font-black">
                                  {review.guest_name?.[0] || 'G'}
                                </div>
                                <div>
                                  <p className="text-[14px] font-black text-[#1A2332] leading-none mb-1">{review.guest_name}</p>
                                  <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <span 
                                        key={i} 
                                        className={`material-symbols-outlined text-[18px] ${i < review.rating ? 'text-yellow-500' : 'text-gray-200'}`}
                                        style={{ fontVariationSettings: `'FILL' ${i < review.rating ? 1 : 0}, 'wght' 700` }}
                                      >
                                        star
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-[#8896A6]">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[15px] text-[#1A2332] font-medium leading-relaxed italic">"{review.comment}"</p>
                          </div>
                        )) : (
                          <p className="text-[12px] font-bold text-[#8896A6] uppercase tracking-widest text-center py-8">Be the first to share your experience</p>
                        )}
                       </div>
                    </div>
                  </div>

                  {/* Right Column: Booking Card / Location */}
                  <div className="space-y-12 sticky top-8 self-start">
                    <div className="bg-white p-10 rounded-[2.5rem] border-2 border-[#E8E4DE] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] text-[#1A2332] space-y-8">
                      <div>
                        <span className="text-[10px] font-black text-[#C4993E] uppercase tracking-[0.3em] block mb-2">Ready to book?</span>
                        <h4 className="text-2xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>Start Your Stay</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-[#F4F3F0] border border-[#E8E4DE] rounded-2xl">
                          <p className="text-[9px] font-black text-[#C4993E] uppercase tracking-[0.1em] mb-1">Where to find us</p>
                          <p className="text-[14px] font-bold">{selectedHotel.city}, {selectedHotel.address}</p>
                        </div>
                        <div className="p-4 bg-[#F4F3F0] border border-[#E8E4DE] rounded-2xl">
                          <p className="text-[9px] font-black text-[#C4993E] uppercase tracking-[0.1em] mb-1">Get in touch</p>
                          <p className="text-[14px] font-bold">{selectedHotel.phone || "No phone listed"}</p>
                          <p className="text-[12px] font-medium text-[#6B7B8D]">{selectedHotel.email || "hello@staynepal.com"}</p>
                        </div>
                      </div>

                      <button 
                         onClick={() => handleBookNow(selectedHotel)}
                         className="w-full py-5 bg-[#C4993E] text-white rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[#C4993E]/20 hover:-translate-y-1 transition-all active:scale-95"
                      >
                        {user ? 'Choose Your Room' : 'Sign in to Book'}
                      </button>
                    </div>

                    {/* Simple Map Placeholder or actual Map if possible */}
                    <div className="bg-white border-2 border-[#E8E4DE] p-4 rounded-[2.5rem] h-[300px] overflow-hidden relative group">
                       <MapContainer 
                        key={selectedHotel.id}
                        center={[Number(selectedHotel.latitude) || 27.7172, Number(selectedHotel.longitude) || 85.3240]} 
                        zoom={15} 
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                        className="rounded-[2rem] z-0"
                       >
                         <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                         <Marker position={[Number(selectedHotel.latitude) || 27.7172, Number(selectedHotel.longitude) || 85.3240]} />
                       </MapContainer>
                       <div className="absolute inset-x-4 top-4 z-10">
                          <div className="bg-white px-4 py-2 rounded-xl border border-[#E8E4DE] shadow-sm flex items-center gap-2">
                             <span className="material-symbols-outlined text-[#C4993E] text-[18px]">explore</span>
                             <span className="text-[10px] font-black text-[#1A2332] uppercase tracking-widest">Interactive Guide</span>
                          </div>
                       </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Home;
