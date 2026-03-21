import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));

    fetch('http://localhost:5000/api/reviews/featured')
      .then(res => res.json())
      .then(data => {
        if (data.success) setExperiences(data.reviews);
      })
      .catch(err => console.error('Error fetching reviews:', err));
  }, []);

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

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      const query = new URLSearchParams(searchParams).toString();
      const response = await fetch(`http://localhost:5000/api/rooms/search?${query}`);
      const data = await response.json();

      if (data.success) {
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
          if (Number(room.base_price) < acc[hotelId].startingPrice) {
            acc[hotelId].startingPrice = Number(room.base_price);
          }
          return acc;
        }, {});

        setRooms(Object.values(groupedByHotel));
        setTimeout(() => {
          const resultsNode = document.getElementById('search-results');
          if (resultsNode) resultsNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C3E50] antialiased flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ─── Navigation ─── */}
      <nav className="h-[72px] bg-[#1A2332] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleLogoClick}>
            <span className="material-symbols-outlined text-[#C4993E] text-[22px]">apartment</span>
            <span className="text-white font-bold text-[15px] tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>StayNepal</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('about')} className="text-[13px] font-medium text-[#8896A6] hover:text-white transition-colors">About</button>
            <button onClick={() => scrollToSection('properties')} className="text-[13px] font-medium text-[#8896A6] hover:text-white transition-colors">Destinations</button>
            <button onClick={() => scrollToSection('experiences')} className="text-[13px] font-medium text-[#8896A6] hover:text-white transition-colors">Reviews</button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={handleLogoClick} className="flex items-center gap-3 pl-5 border-l border-[#2D3D50]">
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-semibold text-white leading-none mb-1">
                    {user.fullName || user.full_name || 'My Account'}
                  </p>
                  <p className="text-[10px] font-medium text-[#C4993E] capitalize leading-none">
                    {user.role === 'admin' ? 'Hotel Manager' : user.role === 'superadmin' ? 'Administrator' : 'Guest Account'}
                  </p>
                </div>
                <div className="w-9 h-9 bg-[#263345] flex items-center justify-center text-white rounded-full hover:ring-2 hover:ring-[#C4993E]/30 transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </div>
              </button>
            ) : (
              <>
                <a href="/login" className="text-[13px] font-medium text-white px-4 py-2 hover:text-[#C4993E] transition-colors">Sign In</a>
                <a href="/signup" className="bg-[#C4993E] text-white text-[13px] font-semibold px-6 py-2.5 rounded-lg hover:bg-[#AE872E] transition-all">Get Started</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <main className="flex-1 overflow-x-hidden">
        <div id="properties" className="max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <span className="w-10 h-[2px] bg-[#C4993E]"></span>
                <span className="text-[12px] font-semibold text-[#C4993E] uppercase tracking-[0.2em]">Discover Nepal</span>
              </div>
              <h1 id="about" className="text-5xl lg:text-7xl font-bold text-[#1A2332] leading-[1.05] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                Find Your <br />
                Perfect <br />
                Stay<span className="text-[#C4993E]">.</span>
              </h1>
              <p className="text-[16px] text-[#6B7B8D] max-w-md leading-relaxed">
                Browse handpicked hotels across Nepal — from the bustling streets 
                of Kathmandu to the serene lakesides of Pokhara. Book with confidence.
              </p>
            </div>

            {/* Destination Cards */}
            <div className="hidden lg:grid grid-cols-2 gap-5">
              <div className="bg-white border border-[#E8E4DE] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500">
                <div className="overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&h=280&q=80" className="w-full h-48 object-cover" alt="Kathmandu" />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-semibold text-[#C4993E] uppercase tracking-wider block mb-1">Capital City</span>
                  <p className="text-[14px] font-bold text-[#1A2332]">Kathmandu Valley</p>
                </div>
              </div>
              <div className="bg-white border border-[#E8E4DE] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-500 translate-y-8">
                <div className="overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&h=280&q=80" className="w-full h-48 object-cover" alt="Pokhara" />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-semibold text-[#C4993E] uppercase tracking-wider block mb-1">Lake City</span>
                  <p className="text-[14px] font-bold text-[#1A2332]">Pokhara Lakeside</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Search Bar ─── */}
          <div className="bg-[#1A2332] p-8 md:p-10 shadow-xl rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#C4993E]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <form className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end relative z-10" onSubmit={handleSearch}>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8896A6] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                  Destination
                </label>
                <div className="bg-[#263345] rounded-xl overflow-hidden focus-within:ring-2 ring-[#C4993E]/40 transition-all">
                  <input
                    type="text"
                    placeholder="Where to?"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full bg-transparent border-none px-5 py-4 text-white text-[14px] placeholder-[#596A7D] outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8896A6] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px]">event</span>
                  Check-in
                </label>
                <div className="bg-[#263345] rounded-xl overflow-hidden focus-within:ring-2 ring-[#C4993E]/40 transition-all">
                  <input
                    type="date"
                    value={searchParams.checkIn}
                    onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                    className="w-full bg-transparent border-none px-5 py-4 text-white text-[14px] outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#8896A6] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px]">group</span>
                  Guests
                </label>
                <div className="bg-[#263345] rounded-xl overflow-hidden focus-within:ring-2 ring-[#C4993E]/40 transition-all">
                  <input
                    type="number"
                    min="1"
                    placeholder="No. of guests"
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams({ ...searchParams, guests: e.target.value })}
                    className="w-full bg-transparent border-none px-5 py-4 text-white text-[14px] placeholder-[#596A7D] outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={searching}
                className="bg-[#C4993E] text-white h-[54px] rounded-xl font-semibold text-[14px] hover:bg-[#AE872E] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#C4993E]/20 flex items-center justify-center gap-2"
              >
                {searching ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">search</span>
                )}
                {searching ? 'Searching...' : 'Search Hotels'}
              </button>
            </form>
          </div>

          {/* ─── Search Results ─── */}
          {(rooms.length > 0 || searching) && (
            <div id="search-results" className="mt-16 bg-white border border-[#E8E4DE] p-10 md:p-14 rounded-2xl fade-in shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#C4993E]"></div>
              <div className="flex items-center justify-between mb-10 border-b border-[#F4F3F0] pb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Available Hotels
                  </h2>
                  <p className="text-[13px] text-[#6B7B8D] mt-1">
                    {rooms.length} {rooms.length === 1 ? 'property' : 'properties'} found matching your search
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rooms.map(hotel => (
                  <div key={hotel.id} className="border border-[#E8E4DE] bg-white flex flex-col sm:flex-row hover:border-[#C4993E] transition-all rounded-xl overflow-hidden shadow-sm group">
                    <div className="w-full sm:w-56 h-56 sm:h-auto overflow-hidden">
                      <img
                        src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500'}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt={hotel.name}
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-[#1A2332] mb-1">{hotel.name}</h3>
                          <div className="flex items-center gap-1.5 text-[#6B7B8D] text-[13px]">
                            <span className="material-symbols-outlined text-sm text-[#C4993E]">location_on</span>
                            {hotel.city || hotel.hotel_city}, Nepal
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <span className="text-[12px] font-semibold text-[#C4993E]">{Number(hotel.rating || 0).toFixed(1)}</span>
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`material-symbols-outlined text-[14px] ${i < Math.round(hotel.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`} style={{ fontVariationSettings: `'FILL' ${i < Math.round(hotel.rating || 0) ? 1 : 0}` }}>star</span>
                            ))}
                          </div>
                          <p className="text-[11px] text-[#6B7B8D] mb-0.5">Starting from</p>
                          <p className="text-xl font-bold text-[#1A2332]">NPR {hotel.startingPrice.toLocaleString()}</p>
                          <p className="text-[11px] text-[#C4993E]">per night</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-5">
                        {(hotel.amenities || []).slice(0, 5).map((amt, idx) => (
                          <span key={idx} className="text-[10px] font-medium text-[#6B7B8D] bg-[#F4F3F0] px-3 py-1 rounded-full">
                            {amt}
                          </span>
                        ))}
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#F4F3F0]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#2D8659] animate-pulse"></div>
                          <span className="text-[12px] font-medium text-[#2D8659]">{hotel.totalUnits} rooms available</span>
                        </div>
                        <a
                          href="/login"
                          className="bg-[#1A2332] text-white py-2.5 px-6 text-[13px] font-semibold hover:bg-[#C4993E] transition-all rounded-lg"
                        >
                          View Details
                        </a>
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
                Honest reviews from verified guests who stayed at our partner properties
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
            <div className="mt-16 text-center p-16 bg-white border border-dashed border-[#E8E4DE] rounded-2xl">
              <span className="material-symbols-outlined text-5xl text-[#D8D4CE] mb-4">search_off</span>
              <h2 className="text-xl font-bold text-[#1A2332] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>No Hotels Found</h2>
              <p className="text-[#6B7B8D] max-w-sm mx-auto text-[14px]">
                We couldn't find any properties matching your criteria.
                Try a different location or adjust your guest count.
              </p>
            </div>
          )}

          {/* ─── Stats ─── */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-3 gap-8 text-center border-t border-[#E8E4DE] pt-12">
            <div>
              <p className="text-4xl font-bold text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>500+</p>
              <span className="text-[13px] text-[#6B7B8D] mt-1 block">Happy Guests</span>
            </div>
            <div className="hidden md:block">
              <p className="text-4xl font-bold text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>14</p>
              <span className="text-[13px] text-[#6B7B8D] mt-1 block">Partner Hotels</span>
            </div>
            <div>
              <p className="text-4xl font-bold text-[#1A2332] tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>24/7</p>
              <span className="text-[13px] text-[#6B7B8D] mt-1 block">Customer Support</span>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-white border-t border-[#E8E4DE]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[13px] text-[#6B7B8D]">&copy; 2024 StayNepal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
