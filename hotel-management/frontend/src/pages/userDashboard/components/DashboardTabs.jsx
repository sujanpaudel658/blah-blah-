import React from 'react';

const DashboardTabs = ({ activeTab, setActiveTab, displayBookings, navigate }) => (
  <div className="w-full bg-white border-b border-[#E2E2E2] sticky top-20 z-40">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-10">
        <button
          onClick={() => setActiveTab('explore')}
          className={`py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'explore' ? 'text-[#1B2B41]' : 'text-[#A0AEC0] hover:text-[#1B2B41]'}`}
        >
          Explore Hotels
          {activeTab === 'explore' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#B88E2F]"></div>}
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'bookings' ? 'text-[#1B2B41]' : 'text-[#A0AEC0] hover:text-[#1B2B41]'}`}
        >
          My Bookings
          {displayBookings.length > 0 && <span className="bg-[#1B2B41] text-white px-2 py-0.5 rounded-sm text-[8px]">{displayBookings.length}</span>}
          {activeTab === 'bookings' && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#B88E2F]"></div>}
        </button>
        <button
          type="button"
          onClick={() => navigate('/guest/profile')}
          className="py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0AEC0] hover:text-[#1B2B41] transition-all relative"
        >
          My profile
        </button>
        <button
          onClick={() => navigate('/guest/list-your-hotel')}
          className="py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A0AEC0] hover:text-[#B88E2F] transition-all ml-auto border border-[#B88E2F] px-4 rounded-sm"
        >
          Partner With Us
        </button>
      </div>
    </div>
  </div>
);

export default DashboardTabs;
