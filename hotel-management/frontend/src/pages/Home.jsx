import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * StayNepal Public Landing Page
 * 
 * Purpose: Professional hospitality portal for property discovery and reservation initiation.
 * Aesthetics: Formal, Structured, Service-Oriented (2016-2019 Enterprise Style)
 */
const Home = () => {
  const navigate = useNavigate();
  // Search Parameter State
  const [searchParams, setSearchParams] = useState({
    location: '',
    guests: '',
    checkIn: '',
    checkOut: ''
  });

  // Inventory Results State
  const [rooms, setRooms] = useState([]);
  const [searching, setSearching] = useState(false);
  const [user, setUser] = useState(null);

  // Hydrate session on mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  /**
   * Logical Routing Handler
   * Ensures that authenticated administrators and guests are returned 
   * to their respective operational consoles upon identity block interaction.
   */
  const handleLogoClick = () => {
    if (!user) {
      window.location.reload();
      return;
    }

    switch (user.role) {
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'super_admin':
        navigate('/super/dashboard');
        break;
      default:
        navigate('/guest/dashboard');
    }
  };

  /**
   * Inventory Search Logic
   * Queries the property network for available suite categories
   */
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      const query = new URLSearchParams(searchParams).toString();
      const response = await fetch(`http://localhost:5000/api/rooms/search?${query}`);
      const data = await response.json();

      if (data.success) {
        /* 
           AGGREGATION LOGIC: 
           Collapse individual room units into a single consolidated property view 
           to avoid list redundancy for high-inventory hotels.
        */
        const groupedByHotel = data.rooms.reduce((acc, room) => {
          const hotelId = room.hotel_id;
          if (!acc[hotelId]) {
            acc[hotelId] = {
              id: room.hotel_id,
              name: room.hotel_name,
              image: room.hotel_image,
              city: room.hotel_city,
              startingPrice: Number(room.base_price),
              totalUnits: 0,
              amenities: room.amenities || [],
              rating: room.rating
            };
          }

          acc[hotelId].totalUnits++;

          // Track the lowest entry price for the 'Starts From' display
          if (Number(room.base_price) < acc[hotelId].startingPrice) {
            acc[hotelId].startingPrice = Number(room.base_price);
          }

          return acc;
        }, {});

        setRooms(Object.values(groupedByHotel));

        // Controlled scroll to results node
        setTimeout(() => {
          const resultsNode = document.getElementById('search-results');
          if (resultsNode) resultsNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      console.error('System Search Interruption:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] text-[#2D3748] antialiased flex flex-col font-sans">
      {/* Professional Header */}
      <nav className="h-20 bg-[#1B2B41] border-b border-[#2D4361] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogoClick}>
            <span className="material-symbols-outlined text-[#B88E2F] text-2xl">domain</span>
            <span className="text-white font-bold text-lg tracking-tight uppercase">STAYNEPAL</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a className="text-[10px] font-bold text-[#A0AEC0] hover:text-white transition-colors uppercase tracking-[0.2em]" href="#">About Us</a>
            <a className="text-[10px] font-bold text-[#A0AEC0] hover:text-white transition-colors uppercase tracking-[0.2em]" href="#">Properties</a>
            <a className="text-[10px] font-bold text-[#A0AEC0] hover:text-white transition-colors uppercase tracking-[0.2em]" href="#">Partnerships</a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/login" className="text-[10px] font-bold text-white uppercase tracking-[0.15em] px-6 py-3 hover:text-[#B88E2F] transition-all">Login</a>
            <a href="/signup" className="bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-[0.15em] px-8 py-3.5 rounded-xl hover:bg-[#9E7A28] hover:scale-105 active:scale-95 transition-all shadow-lg">Sign Up</a>
          </div>
        </div>
      </nav>

      {/* Hero & Selection Interface */}
      <main className="flex-1 overflow-x-hidden pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="flex flex-col gap-8">
              <div className="flex items-center gap-3">
                <span className="w-12 h-[1px] bg-[#B88E2F]"></span>
                <span className="text-[11px] font-bold text-[#B88E2F] uppercase tracking-[0.4em]">Integrated Hospitality Portal</span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-bold text-[#1B2B41] leading-[0.9] tracking-tighter">
                Secure <br />
                Destination <br />
                Registry<span className="text-[#B88E2F]">.</span>
              </h1>
              <p className="text-lg text-[#64748B] max-w-md leading-relaxed">
                Direct access to Nepal's established property network.
                Verified inventory for metabolic and professional hospitality requirements.
              </p>
            </div>

            {/* Inventory Card Cluster - Formal Representation */}
            <div className="hidden lg:grid grid-cols-2 gap-6">
              <div className="bg-white border border-[#E2E2E2] p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-2 duration-500">
                <div className="rounded-xl overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=300&q=80" className="w-full h-48 object-cover grayscale-[0.2]" alt="KTM" />
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-widest block mb-1">Metropolitan Node</span>
                  <p className="text-sm font-bold text-[#1B2B41] tracking-tight">KATHMANDU VALLEY</p>
                </div>
              </div>
              <div className="bg-white border border-[#E2E2E2] p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] translate-y-12 transition-transform hover:-translate-y-2 duration-500">
                <div className="rounded-xl overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&h=300&q=80" className="w-full h-48 object-cover grayscale-[0.2]" alt="PKR" />
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-widest block mb-1">Regional District</span>
                  <p className="text-sm font-bold text-[#1B2B41] tracking-tight">LAKESHIDE POKHARA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Terminal */}
          <div className="bg-[#1B2B41] p-10 shadow-[0_40px_80px_rgba(0,0,0,0.2)] rounded-[20px] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B88E2F]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <form className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end relative z-10" onSubmit={handleSearch}>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A0AEC0] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">location_on</span>
                  DESTINATION NODE
                </label>
                <div className="bg-[#2D4361] rounded-xl overflow-hidden focus-within:ring-2 ring-[#B88E2F]/50 transition-all">
                  <input
                    type="text"
                    placeholder="City/Region"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-4.5 text-white text-sm font-bold placeholder-[#64748B] outline-none h-[56px]"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A0AEC0] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">event</span>
                  CHECK-IN DATE
                </label>
                <div className="bg-[#2D4361] rounded-xl overflow-hidden focus-within:ring-2 ring-[#B88E2F]/50 transition-all">
                  <input
                    type="date"
                    value={searchParams.checkIn}
                    onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-4.5 text-white text-sm font-bold outline-none h-[56px] [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A0AEC0] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  CAPACITY LEVEL
                </label>
                <div className="bg-[#2D4361] rounded-xl overflow-hidden focus-within:ring-2 ring-[#B88E2F]/50 transition-all">
                  <input
                    type="number"
                    min="1"
                    placeholder="Total Guests"
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams({ ...searchParams, guests: e.target.value })}
                    className="w-full bg-transparent border-none px-6 py-4.5 text-white text-sm font-bold placeholder-[#64748B] outline-none h-[56px]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={searching}
                className="bg-[#B88E2F] text-white h-[56px] rounded-xl font-bold uppercase tracking-[0.15em] hover:bg-[#9E7A28] hover:scale-[1.01] active:scale-[0.99] transition-all text-[11px] disabled:opacity-50 shadow-lg flex items-center justify-center gap-3"
              >
                {searching ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">search</span>
                )}
                {searching ? 'QUERYING...' : 'INITIATE SEARCH'}
              </button>
            </form>
          </div>

          {/* Search Results Display Node */}
          {(rooms.length > 0 || searching) && (
            <div id="search-results" className="mt-20 bg-white border border-[#E2E2E2] p-16 rounded-3xl fade-in shadow-[0_40px_100px_rgba(0,0,0,0.08)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#B88E2F]"></div>
              <div className="flex items-center justify-between mb-12 border-b border-[#F1F1F1] pb-8">
                <div>
                  <h2 className="text-3xl font-bold text-[#1B2B41] tracking-tight">
                    AVAILABLE ASSETS<span className="text-[#B88E2F]">.</span>
                  </h2>
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-[0.3em] mt-2">
                    {rooms.length} NODES IDENTIFIED IN REGISTRY
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-[0.4em] block">STAYNEPAL REAL-TIME API</span>
                  <span className="text-[10px] font-mono font-bold text-[#B88E2F]">00{rooms.length}_ST_X_01</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {rooms.map(hotel => (
                  <div key={hotel.id} className="border border-[#E2E2E2] bg-white flex flex-col sm:flex-row hover:border-[#B88E2F] transition-all rounded-xl overflow-hidden shadow-sm group">
                    <div className="w-full sm:w-64 h-64 sm:h-auto overflow-hidden">
                      <img
                        src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        alt={hotel.name}
                      />
                    </div>
                    <div className="p-8 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-[0.2em] block mb-1">Verified Property Node</span>
                          <h3 className="text-3xl font-bold text-[#1B2B41] tracking-tighter">{hotel.name}</h3>
                          <div className="flex items-center gap-2 text-[#64748B] text-xs font-semibold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-sm text-[#B88E2F]">location_on</span>
                            {hotel.city || hotel.hotel_city}, NEPAL
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-2">
                            <span className="text-[10px] font-bold text-[#B88E2F] mr-1">{Number(hotel.rating || 0).toFixed(1)}</span>
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`material-symbols-outlined text-[14px] ${i < Math.round(hotel.rating || 0) ? 'text-yellow-400' : 'text-slate-200'} fill-current`}>star</span>
                            ))}
                          </div>
                          <p className="text-[10px] text-[#A0AEC0] uppercase font-bold tracking-widest mb-1">Starts From</p>
                          <p className="text-3xl font-bold text-[#1B2B41] tracking-tight">NRS {hotel.startingPrice.toLocaleString()}</p>
                          <p className="text-[10px] text-[#B88E2F] uppercase font-bold tracking-tighter mt-1">/ Nightly Rate</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-8">
                        {(hotel.amenities || []).slice(0, 5).map((amt, idx) => (
                          <span key={idx} className="text-[9px] font-bold text-[#64748B] uppercase tracking-[0.15em] bg-[#F9FAFB] border border-[#F1F1F1] px-3 py-1.5 rounded-full">
                            {amt}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-[#F1F1F1]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#108548] animate-pulse"></div>
                          <span className="text-[10px] font-bold text-[#108548] uppercase tracking-widest">{hotel.totalUnits} Units Available Now</span>
                        </div>
                        <a
                          href="/login"
                          className="bg-[#1B2B41] text-white py-3 px-8 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#B88E2F] transition-all rounded-lg shadow-lg transform active:scale-95"
                        >
                          Inspect Assets
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Infrastructure Statistics */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-12 text-center border-t border-[#E2E2E2] pt-12">
            <div>
              <p className="text-4xl font-bold text-[#1B2B41] tracking-tighter">98.4%</p>
              <span className="text-[10px] font-bold text-[#64748B] mt-2 uppercase tracking-[0.2em] block">Load Efficiency</span>
            </div>
            <div className="hidden md:block">
              <p className="text-4xl font-bold text-[#1B2B41] tracking-tighter">14</p>
              <span className="text-[10px] font-bold text-[#64748B] mt-2 uppercase tracking-[0.2em] block">Operational Hubs</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#1B2B41] tracking-tighter">24/7</p>
              <span className="text-[10px] font-bold text-[#64748B] mt-2 uppercase tracking-[0.2em] block">Systems Availability</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-12 bg-white border-t border-[#E2E2E2]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.3em]">&copy; 2024 staynepal architectural hospitality systems. all rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
