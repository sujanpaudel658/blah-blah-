import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // Fetch hotels from backend for navbar suggestions
  useEffect(() => {
    axios.get('http://localhost:5000/api/hotels')
      .then(res => {
        // Map hotel data and parse images
        const mapped = (res.data.hotels || []).map(hotel => {
          let hotelImages = [];
          if (hotel.image) {
            try {
              hotelImages = JSON.parse(hotel.image);
            } catch (e) {
              hotelImages = [hotel.image];
            }
          }
          return {
            id: hotel.id,
            title: hotel.name,
            description: `${hotel.city || ''}, ${hotel.country || ''} - ${hotel.address || ''}`,
            images: hotelImages,
            fullDescription: hotel.description
          };
        });
        setHotels(mapped);
        setSearchResults(mapped); // Initially show all
      });
  }, []);


  useEffect(() => {
    // Check user authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [navigate]);

  const handleSearch = (results) => {
    // Update search results based on navbar search
    setSearchResults(results);
  };

  const handleLogout = () => {
    // Clear user session and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };



  return (
    <div className="min-h-screen bg-[#f5f6f8] font-['Space_Grotesk'] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <Navbar
        user={user}
        onLogout={handleLogout}
        searchPlaceholder="Search hotels, destinations..."
        hotelSuggestions={hotels}
        onSearch={handleSearch}
      />


      <section className="relative w-full pt-10 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Content & Search */}
          <div className="lg:col-span-5 flex flex-col gap-8 z-10">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#607AFB]/10 text-[#607AFB] text-xs font-bold uppercase tracking-wider w-fit">
                <span className="w-2 h-2 rounded-full bg-[#607AFB] animate-pulse"></span>
                New Season Open
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight text-slate-900">
                Find your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#607AFB] to-cyan-300">sanctuary</span> <br/>
                in the Himalayas.
              </h1>
              <p className="text-lg text-slate-600 max-w-md leading-relaxed">
                Curated collection of 500+ luxury stays, heritage boutique hotels, and jungle lodges across Nepal.
              </p>
            </div>
            {/* Search Component */}
            <div className="bg-white p-2 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100">
              <form className="flex flex-col gap-2">
                {/* Location Input */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#607AFB] transition-colors">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#607AFB]/20" placeholder="Where do you want to go?" type="text"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* Check In/Out */}
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-hover:text-[#607AFB] transition-colors">
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <div className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl text-left">
                      <span className="block text-xs text-slate-400 font-medium">Check-in - Check-out</span>
                      <span className="block text-sm font-bold text-slate-900">Add Dates</span>
                    </div>
                  </div>
                  {/* Guests */}
                  <div className="relative group cursor-pointer">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-hover:text-[#607AFB] transition-colors">
                      <span className="material-symbols-outlined">group</span>
                    </div>
                    <div className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-xl text-left">
                      <span className="block text-xs text-slate-400 font-medium">Guests</span>
                      <span className="block text-sm font-bold text-slate-900">2 Adults</span>
                    </div>
                  </div>
                </div>
                <button className="mt-2 w-full py-4 bg-[#607AFB] hover:bg-[#607AFB]/90 text-white font-bold rounded-xl shadow-lg shadow-[#607AFB]/25 hover:shadow-[#607AFB]/40 transition-all duration-300 flex items-center justify-center gap-2" type="button">
                  <span>Search Hotels</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </form>
            </div>
          </div>
          {/* Right: Masonry Grid Visuals */}
          <div className="lg:col-span-7 h-full min-h-[500px] relative hidden md:block">
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="space-y-4 pt-12">
                <div className="h-64 w-full rounded-2xl bg-cover bg-center transition-transform hover:scale-[1.02] duration-500 shadow-xl" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBdX7zbPQXfPXglaRNgNf5W_q7Pchv_sf0nHe4R2_RepIkoBjA0TpbNWpU9j-bIQ_uIB0MpzsMFVyaTNUPButdFnpGeVxre4Lu-ZpOEsaF_KCaU-wSKHV6rmfEWlFEY_jAdbmMZmn_zi6EaJPj0KjcjqxkTTbg6Y-jWGUzm0hK4qVLeG9bHY8raBSQdyKbjhEgvZJPTv4DS-M0y_iOSYrUkgfXmUrfW7lEBh8rBbdjMhdfvg_y9lk_xOrYgSqEnelw4COjoHYFkkl4')"}}>
                </div>
                <div className="h-48 w-full rounded-2xl bg-[#607AFB]/10 flex flex-col justify-center p-6 transition-transform hover:scale-[1.02] duration-500 border border-[#607AFB]/20">
                  <span className="text-4xl font-bold text-[#607AFB] mb-1">500+</span>
                  <span className="text-slate-600 font-medium">Verified properties across 14 zones.</span>
                </div>
              </div>
              {/* ...rest of the right grid visuals... */}
            </div>
          </div>
        </div>
      </section>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="w-full py-10 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Search Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map(hotel => (
              <div key={hotel.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {hotel.images && hotel.images.length > 0 && (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={hotel.images[0].startsWith('http') ? hotel.images[0] : `http://localhost:5000${hotel.images[0]}`} 
                      alt={hotel.title} 
                      className="w-full h-full object-cover" 
                    />
                    {hotel.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                        +{hotel.images.length - 1} more
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{hotel.title}</h3>
                  <p className="text-slate-600 mb-4">{hotel.description}</p>
                  {hotel.fullDescription && (
                    <p className="text-slate-500 text-sm">{hotel.fullDescription}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default UserDashboard;
