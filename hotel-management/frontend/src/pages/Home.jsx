
import React from "react";

const heroCards = [
  {
    title: "KATHMANDU",
    price: "NRS 8,999",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "POKHARA",
    price: "NRS 14,500",
    image: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
  },
  {
    title: "MUSTANG",
    price: "NRS 11,200",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
  },
];

const Home = () => {
  const [searchParams, setSearchParams] = React.useState({ location: '', guests: '', checkIn: '', checkOut: '' });
  const [rooms, setRooms] = React.useState([]);
  const [searching, setSearching] = React.useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      const query = new URLSearchParams(searchParams).toString();
      const response = await fetch(`http://localhost:5000/api/rooms/search?${query}`);
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
        // Scroll to results
        setTimeout(() => {
          document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-display text-slate-900 overflow-x-hidden flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.location.reload()}>
              <div className="w-8 h-8 bg-green-900 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md">NS</div>
              <span className="font-bold text-lg tracking-tight text-green-900">NEPAL STAYS</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a className="text-xs font-semibold text-slate-600 hover:text-green-900 transition-colors uppercase tracking-wider" href="#">About</a>
              <a className="text-xs font-semibold text-slate-600 hover:text-green-900 transition-colors uppercase tracking-wider" href="#">Destinations</a>
              <a className="text-xs font-semibold text-slate-600 hover:text-green-900 transition-colors uppercase tracking-wider" href="#">Contact</a>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <a href="/login" className="flex items-center justify-center h-9 px-4 rounded-lg text-sm font-bold text-green-900 hover:bg-green-50 transition-colors border border-green-900/10">Sign In</a>
              <a href="/signup" className="hidden sm:flex items-center justify-center h-9 px-4 rounded-lg text-sm font-bold bg-green-900 text-white hover:bg-green-800 transition-colors shadow-sm">Get Started</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <section className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col gap-4 text-center lg:text-left items-center lg:items-start">
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold tracking-widest uppercase mb-1">
                Luxury Redefined
              </div>
              <div>
                <h1 className="text-4xl lg:text-6xl font-black text-green-900 leading-[0.95] tracking-tighter">
                  Stay<span className="text-slate-300">.</span><br />
                  Relax<span className="text-slate-300">.</span><br />
                  Discover<span className="text-green-600">.</span>
                </h1>
              </div>
              <p className="text-sm text-slate-600 max-w-sm leading-relaxed">
                Experience luxury refined in Nepal's most stunning locations. From mountain peaks to serene valleys, our curated stays offer the ultimate gateway to adventure.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start mt-2">
                <a href="#" className="px-6 py-2.5 rounded-lg bg-green-900 text-white font-extrabold shadow-lg shadow-green-900/20 hover:bg-green-800 hover:scale-105 transition-all text-sm">
                  BOOK YOUR STAY
                </a>
                <a href="#" className="px-6 py-2.5 rounded-lg bg-white text-slate-900 font-extrabold border border-slate-200 hover:bg-slate-50 transition-all text-sm">
                  VIEW GALLERY
                </a>
              </div>
            </div>

            <div className="relative h-[400px] w-full hidden sm:flex items-center justify-center">
              {heroCards.map((card, idx) => (
                <div
                  key={card.title}
                  className={`absolute rounded-2xl shadow-xl overflow-hidden flex flex-col justify-end bg-white transition-all duration-500 hover:scale-105 hover:z-30
                    ${idx === 0 ? 'w-40 h-60 -translate-x-28 rotate-[-5deg] z-10' : ''}
                    ${idx === 1 ? 'w-48 h-64 z-20 scale-110 shadow-green-900/10' : ''}
                    ${idx === 2 ? 'w-40 h-60 translate-x-28 rotate-[5deg] z-10' : ''}
                  `}
                >
                  <img src={card.image} alt={card.title} className="object-cover w-full h-full absolute top-0 left-0" />
                  <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/10 to-transparent text-white">
                    <div className="text-[9px] uppercase font-bold tracking-[0.2em] opacity-80 mb-0.5">{card.title}</div>
                    <div className="text-lg font-black">{card.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking Bar */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-white p-1.5 rounded-xl shadow-xl shadow-slate-200 border border-slate-100">
              <form className="flex flex-col md:flex-row items-stretch md:items-center" onSubmit={handleSearch}>
                <div className="flex-1 px-4 py-3 border-b md:border-b-0 md:border-r border-slate-100">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Location</label>
                  <input
                    type="text"
                    placeholder="Where to?"
                    value={searchParams.location}
                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                    className="w-full bg-transparent font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none text-xs"
                  />
                </div>
                <div className="flex-1 px-4 py-3 border-b md:border-b-0 md:border-r border-slate-100">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Check In</label>
                  <input
                    type="text"
                    placeholder="Add dates"
                    value={searchParams.checkIn}
                    onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                    className="w-full bg-transparent font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none text-xs"
                  />
                </div>
                <div className="flex-1 px-4 py-3">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Guests</label>
                  <input
                    type="text"
                    placeholder="Who's coming?"
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams({ ...searchParams, guests: e.target.value })}
                    className="w-full bg-transparent font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none text-xs"
                  />
                </div>
                <button type="submit" disabled={searching} className="bg-green-900 text-white px-8 py-3 rounded-lg font-black hover:bg-green-800 transition-all m-1 text-sm disabled:opacity-50">
                  {searching ? 'SEARCHING...' : 'SEARCH'}
                </button>
              </form>
            </div>
          </div>

          {/* Search Results Display */}
          {(rooms.length > 0 || searching) && (
            <div id="search-results" className="mt-16 bg-white p-8 rounded-3xl shadow-2xl border border-slate-50">
              <h2 className="text-2xl font-black text-green-900 mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-green-900 rounded-full"></span>
                {rooms.length} Available Stays Found
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rooms.map(room => (
                  <div key={room.id} className="group bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:border-green-200 transition-all flex flex-col sm:flex-row h-full">
                    <div className="w-full sm:w-48 h-48 sm:h-auto overflow-hidden relative">
                      <img
                        src={room.hotel_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={room.hotel_name}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/90 backdrop-blur text-[9px] font-black text-green-900 uppercase tracking-widest">
                        {room.city}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{room.hotel_name}</p>
                          <h3 className="text-lg font-black text-slate-900 leading-tight">{room.type_name} - Room {room.room_number}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 line-through">NRS {Math.round(room.base_price * 1.2)}</p>
                          <p className="text-xl font-black text-green-900">NRS {room.base_price}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-auto">
                        {room.amenities.slice(0, 3).map((amt, idx) => (
                          <span key={idx} className="bg-white px-2 py-1 rounded-md text-[9px] font-bold text-slate-500 border border-slate-100">
                            {amt.toUpperCase()}
                          </span>
                        ))}
                        {room.amenities.length > 3 && (
                          <span className="px-2 py-1 text-[9px] font-bold text-slate-400">+{room.amenities.length - 3} more</span>
                        )}
                      </div>
                      <button className="mt-4 w-full py-2.5 rounded-xl bg-green-900 text-white text-xs font-black shadow-lg shadow-green-900/10 hover:bg-green-800 transition-all">
                        BOOK FOR NRS {room.base_price}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-12 flex justify-center gap-10 text-center border-t border-slate-200 pt-8">
            <div>
              <div className="text-2xl font-black text-green-900 leading-none">98%</div>
              <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Occupancy</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <div className="text-2xl font-black text-green-900 leading-none">24+</div>
              <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Destinations</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div>
              <div className="text-2xl font-black text-green-900 leading-none">15k+</div>
              <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Happy Guests</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        &copy; 2024 Nepal Stays. All rights reserved.
      </footer>
    </div>
  );
};

export default Home;
