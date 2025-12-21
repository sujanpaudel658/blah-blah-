import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f5f6f8] font-['Space_Grotesk'] text-slate-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 bg-[#607AFB]/10 rounded-xl flex items-center justify-center text-[#607AFB] group-hover:bg-[#607AFB] group-hover:text-white transition-colors duration-300">
                <span className="material-symbols-outlined">temple_hindu</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">StayNepal</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Destinations</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Experiences</a>
              <a className="text-sm font-medium text-slate-600 hover:text-[#607AFB] transition-colors" href="#">Offers</a>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">{user.fullName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center h-10 px-6 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
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
              
              <div className="space-y-4">
                <div className="h-80 w-full rounded-2xl bg-cover bg-center transition-transform hover:scale-[1.02] duration-500 shadow-xl relative group overflow-hidden" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBvqyZHV0ubmtDdg0B1l-bspsbcUOfULoLpEkYI4wMGYOZCCdbbrVGrklW2xQlhmx2bQJYVoJyAk1TWl2kTKBFMwKUezntxXLzI7B5puqQ4Ng2RpIEkDq-UoTanMhcSHsSiYnU-iT7BjG904134-bx8JdfIcZtlggc1BypA26lvO8OXIeqL5JNUMhXRrRfqs_CR_KVqdWP0qgDOR-d0676751JgDC6sLRgb2AHYlCs16m5TYV-hj9ekApJI75LtVQH49GRpBqWeeuc')"}}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-sm font-bold uppercase tracking-wider mb-1">Trending</p>
                    <p className="text-2xl font-bold">Annapurna Range</p>
                  </div>
                </div>
                <div className="h-56 w-full rounded-2xl bg-cover bg-center transition-transform hover:scale-[1.02] duration-500 shadow-xl" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDbX6fof_DSPcxu_UzF1D7jwK-6mnhg_mopODH7_UQM-JfoBjnNzDC67QNPqSHGx1Ypfr2dtRO7JukxcRDunKja0eyaI4podZ9G_X5MVn0V8WTU-wdYG0ytRkEof4iyZ6DFGUAW26PHRnNrAFWDv_6vB9oPmuFjTvpj03s36Ze_7nMAJ_7PJanJvX02kArdHGmEMEjva2bY_FjSVgrtgWFJikf_PZYT3duek_kRQWkSaJSgIUNOEzhIiEIyK6quo0Hs558mS3J8dlU')"}}>
                </div>
              </div>
            </div>
            
            {/* Floating Decorative Element */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl flex items-center gap-3" style={{animation: 'bounce 3s infinite'}}>
              <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Sustainability</p>
                <p className="text-sm font-bold text-slate-900">Eco-friendly Verified</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners / Trust Bar */}
      <div className="border-y border-slate-200 bg-white py-6">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center opacity-60 grayscale hover:grayscale-0 transition-all duration-500 overflow-x-auto gap-12 hide-scrollbar">
          <span className="text-xl font-bold text-slate-400 whitespace-nowrap">Nepal Tourism Board</span>
          <span className="text-xl font-bold text-slate-400 whitespace-nowrap">Expedia Partner</span>
          <span className="text-xl font-bold text-slate-400 whitespace-nowrap">Booking.com</span>
          <span className="text-xl font-bold text-slate-400 whitespace-nowrap">TripAdvisor</span>
          <span className="text-xl font-bold text-slate-400 whitespace-nowrap">Agoda</span>
        </div>
      </div>

      {/* Featured Stays Carousel */}
      <section className="py-20 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Editor's Choice</h2>
            <p className="text-slate-600">Handpicked stays for their exceptional design and hospitality.</p>
          </div>
          <a className="group flex items-center gap-1 text-[#607AFB] font-bold hover:text-[#607AFB]/80 transition-colors" href="#">
            View all stays
            <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
          </a>
        </div>

        {/* Carousel Container */}
        <div className="flex overflow-x-auto gap-6 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar snap-x snap-mandatory">
          
          {/* Card 1 */}
          <div className="min-w-[300px] md:min-w-[360px] snap-center group relative flex flex-col gap-3 cursor-pointer">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100">
              <img alt="Luxury hotel exterior" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA34MdoKrl1T5Q5yjE1satmKk_Yqni-5yvNS3T7w9v4cLQ_3jE1u0VTqYLqqZ_A_pRb1MXCVQBelrpG0xEGaO4D1iGSwdHcbzsPNzqEBgVA7tkmXSLiUJ27ks-ocQeOz04A-vPRD76j6tzFAc-ByctcLX0_FNfLNFhoBQiQJX1H0sWTmg5ftHdz_2xyxHdAuJj_yveilpuTYhseucjcAlY9SgAeQkcBNuXkiOnvdFPeHjf2ufryTIw1PSStIlLWYRSCb_G6iDge7y0"/>
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-900 shadow-sm z-10">
                Top Rated
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">The Kathmandu Heritage</h3>
                      <div className="flex items-center text-slate-500 text-xs mt-1">
                        <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
                        Lazimpat, Kathmandu
                      </div>
                    </div>
                    <div className="flex items-center bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      4.9
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                    <div className="text-xs text-slate-500">Starting from</div>
                    <div className="text-[#607AFB] font-bold text-lg">NRS 15,000<span className="text-xs font-normal text-slate-400">/night</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="min-w-[300px] md:min-w-[360px] snap-center group relative flex flex-col gap-3 cursor-pointer">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100">
              <img alt="Lakeside hotel" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCveTXXwndqO5eA9BGVqvfvGiz20JFY6WrNiLk-zq8eA8v0rUXjsX5g4OIQLOOVx8t-gvCYL1jLi7fIxpe792EkxVmhk3peLjGGBa3biryYuNz6sEfAAKKM1cHXEPMQ1uZGFrsHP2-N_OeM05TEFEBbBCfmyfYuKDRE6Nr99NsLsWLAtn9x2juIzJt3jXRfw6auvEJFFbGU1N5rk40IAp0KVn-RyGn52dSTDiIINdybxTCtVOER22Qa3IPwUA953H16A8tGoI7udlI"/>
              <div className="absolute top-4 right-4 bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm z-10">
                -20% Off
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">Lakeside Retreat</h3>
                      <div className="flex items-center text-slate-500 text-xs mt-1">
                        <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
                        Sedibagar, Pokhara
                      </div>
                    </div>
                    <div className="flex items-center bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      4.7
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                    <div className="text-xs text-slate-500">Starting from</div>
                    <div className="text-[#607AFB] font-bold text-lg">NRS 12,500<span className="text-xs font-normal text-slate-400">/night</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="min-w-[300px] md:min-w-[360px] snap-center group relative flex flex-col gap-3 cursor-pointer">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100">
              <img alt="Jungle lodge" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjlDTz00ijuwvsDUjI6jbITkpKsjIbSQKTsxw_pd3CYoi689cqGzuVqGdkN2_L1hkdRK19gAVm6a4ni9FcPGuIboF7wUzCXMPfngh_3Gz_os32p3u0td_qH-W_NK9ucLAkcG5RFenrtn4l-uemAel0D-h8TIpmlV3rqHAX4o4QG-128G0YQfb3IgKH2WA0KeUai67oHAyOW5LHGHE-1RUimhPMpsrkLx_1p0lCab-EkXDfoqqVS7HG5Awf7IGbnNBG6jErKo_1J78"/>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">Tiger Tops Lodge</h3>
                      <div className="flex items-center text-slate-500 text-xs mt-1">
                        <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
                        Chitwan National Park
                      </div>
                    </div>
                    <div className="flex items-center bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      4.8
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                    <div className="text-xs text-slate-500">Starting from</div>
                    <div className="text-[#607AFB] font-bold text-lg">NRS 20,000<span className="text-xs font-normal text-slate-400">/night</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="min-w-[300px] md:min-w-[360px] snap-center group relative flex flex-col gap-3 cursor-pointer">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-slate-100">
              <img alt="Mountain resort" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEWSIRQ97GNeXNClmXEb48DP-CXCaLUPYrhiOpqTQGFSWK-EX-0reFlLEUu6OVOKGeCY7gqgYBfoHpm-yCTb8TjP5M3irXz5ikdsBuQPdCmsWQccSsVt4HC4CwI1CzYYNPzWM7UspwH-PtGDybPyYc9rDqRePM7DoXzGDk9ZM6ZZVWwtxW64mW2hIT8TeH3wFG6DQFzSwRMfEqEjUflZXfK0s-kl3317kX9C7ZI22yTXIkMOrch2q9-Bx4tu3XiFJRXed97BOSztA"/>
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg translate-y-2 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">Nagarkot Sunrise</h3>
                      <div className="flex items-center text-slate-500 text-xs mt-1">
                        <span className="material-symbols-outlined text-[14px] mr-1">location_on</span>
                        Nagarkot, Bhaktapur
                      </div>
                    </div>
                    <div className="flex items-center bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs font-bold">
                      4.5
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                    <div className="text-xs text-slate-500">Starting from</div>
                    <div className="text-[#607AFB] font-bold text-lg">NRS 8,000<span className="text-xs font-normal text-slate-400">/night</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map & Discovery Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12 rounded-3xl bg-white p-6 lg:p-12 shadow-xl border border-slate-100">
            
            {/* Text Content */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center gap-2 text-[#607AFB] font-bold uppercase tracking-wider text-sm">
                <span className="material-symbols-outlined">map</span>
                Interactive Map
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">Explore Nepal by Region</h2>
              
              <p className="text-lg text-slate-600">
                Whether you are looking for the hustle of Thamel, the serenity of Phewa Lake, or the wilderness of Bardiya, find the perfect spot on our interactive map.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-xl bg-slate-50 hover:bg-[#607AFB]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-[#607AFB] text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">hiking</span>
                  <h4 className="font-bold text-slate-900">Trekking Routes</h4>
                  <p className="text-sm text-slate-500">Stays along Annapurna & Everest.</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 hover:bg-[#607AFB]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-[#607AFB] text-3xl mb-2 group-hover:scale-110 transition-transform inline-block">temple_buddhist</span>
                  <h4 className="font-bold text-slate-900">Heritage Sites</h4>
                  <p className="text-sm text-slate-500">Hotels near UNESCO sites.</p>
                </div>
              </div>
              
              <button className="w-fit mt-4 px-8 py-4 rounded-xl bg-slate-900 text-white font-bold hover:opacity-90 transition-opacity">
                Open Full Map View
              </button>
            </div>

            {/* Map Visual */}
            <div className="flex-1 h-[400px] lg:h-[600px] rounded-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAWsev7jNcPkxYuS36xyPxNFfwoqLOBkXJa1nIwZSV4f5DTxtQNDosdi-t_VptPUndVJPtGKpsUrpCiZrCRTTknS9X4SR_opjKukjEjqSKrSaIKvY9eUecfXIjAwdCQlANg4hfokbWNtoHLvXINCJxkDjFPCoU6wb6r-ffncUn1-9HcdZqBThq8-i_gE1SGFLkObQh2fpNI4ULNvgcos6KOt4taL0DxAySpEONkQ6mNhtYM4B8TD-o9qzYulNJefbL-1YVwsskdLjU')"}}>
              </div>
              
              {/* Overlay Controls */}
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div className="bg-white p-2 rounded-xl shadow-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 pl-2">search</span>
                  <input className="bg-transparent border-none focus:ring-0 text-sm text-slate-900 w-32 md:w-48 placeholder-slate-400 outline-none" placeholder="Search region..." type="text"/>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg hover:bg-slate-50 text-slate-700">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                  <button className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg hover:bg-slate-50 text-slate-700">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                </div>
              </div>
              
              {/* Map Pin Mockups */}
              <div className="absolute top-1/3 left-1/4 group/pin">
                <div className="w-4 h-4 bg-[#607AFB] rounded-full ring-4 ring-white cursor-pointer animate-pulse"></div>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none">
                  Kathmandu (120 Stays)
                </div>
              </div>
              <div className="absolute top-1/2 right-1/3 group/pin">
                <div className="w-4 h-4 bg-[#607AFB] rounded-full ring-4 ring-white cursor-pointer"></div>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none">
                  Pokhara (85 Stays)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#607AFB] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">temple_hindu</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">StayNepal</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium text-slate-600">
            <a className="hover:text-[#607AFB] transition-colors" href="#">About Us</a>
            <a className="hover:text-[#607AFB] transition-colors" href="#">List Your Property</a>
            <a className="hover:text-[#607AFB] transition-colors" href="#">Support</a>
            <a className="hover:text-[#607AFB] transition-colors" href="#">Privacy Policy</a>
          </div>
          
          <div className="flex gap-4">
            <a className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-[#607AFB] hover:text-white transition-all" href="#">
              <span className="text-xs font-bold">FB</span>
            </a>
            <a className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-[#607AFB] hover:text-white transition-all" href="#">
              <span className="text-xs font-bold">IG</span>
            </a>
            <a className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-[#607AFB] hover:text-white transition-all" href="#">
              <span className="text-xs font-bold">X</span>
            </a>
          </div>
        </div>
        
        <div className="max-w-[1440px] mx-auto mt-8 text-center text-xs text-slate-400">
          © 2023 StayNepal Hospitality Group. All prices in Nepalese Rupees (NRS).
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;
