
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
  return (
    <div className="min-h-screen bg-white font-display text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="w-10 h-10 bg-green-900/90 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">HOME</div>
            </div>
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium text-slate-700 hover:text-green-900 transition-colors" href="#">ABOUT US</a>
              <a className="text-sm font-medium text-slate-700 hover:text-green-900 transition-colors" href="#">DESTINATIONS</a>
              <a className="text-sm font-medium text-slate-700 hover:text-green-900 transition-colors" href="#">CONTACT US</a>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-3">
              <a href="/login" className="hidden sm:flex items-center justify-center h-10 px-5 rounded-lg text-sm font-bold text-green-900 hover:bg-green-100 transition-colors">Sign In</a>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative w-full pt-10 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="mb-2">
              <span className="text-6xl font-extrabold text-green-900 leading-none">Stay</span>
              <span className="block text-2xl font-bold tracking-widest text-slate-700 mt-2">RELAX & DISCOVER</span>
            </div>
            <p className="text-base text-slate-700 mb-6 max-w-md">Experience luxury refined. From mountain peaks to serene beaches, our curated hotel management system offers the ultimate gateway to your next adventure.<br /><span className="font-bold">Starting at NRS 12,500/night.</span></p>
            <a href="#" className="px-8 py-3 rounded-lg bg-green-900 text-white font-bold shadow-lg hover:bg-green-800 transition-all w-fit">BOOK NOW</a>
          </div>
          <div className="lg:col-span-6 flex gap-6 justify-center items-end">
            {heroCards.map((card, idx) => (
              <div key={card.title} className={`rounded-2xl shadow-xl overflow-hidden flex flex-col justify-end ${idx === 1 ? 'h-80 w-48' : 'h-64 w-40'} bg-white relative`}>
                <img src={card.image} alt={card.title} className="object-cover w-full h-full absolute top-0 left-0 z-0" />
                <div className="relative z-10 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
                  <div className="text-xs uppercase tracking-widest mb-1">{card.title}</div>
                  <div className="text-lg font-bold">{card.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Booking Form */}
        <div className="mt-12 flex flex-col items-center">
          <form className="flex flex-col md:flex-row gap-4 bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-slate-700">LOCATION</label>
              <input type="text" placeholder="Where are you going?" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-900" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-slate-700">DATES</label>
              <input type="text" placeholder="Add dates" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-900" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 text-slate-700">GUESTS</label>
              <input type="text" placeholder="Add guests" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-900" />
            </div>
            <button type="submit" className="flex items-center justify-center px-6 py-2 rounded-lg bg-green-900 text-white font-bold shadow-lg hover:bg-green-800 transition-all mt-4 md:mt-0">SEARCH</button>
          </form>
        </div>
        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-2xl font-bold text-green-900">98% Occupancy</div>
            <div className="text-xs text-slate-600 mt-1">AVAILABILITY</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">24+ Locations</div>
            <div className="text-xs text-slate-600 mt-1">DESTINATIONS</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
