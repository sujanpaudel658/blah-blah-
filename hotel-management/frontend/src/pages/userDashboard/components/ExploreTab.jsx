import React from 'react';
import { API_URL } from '../../../config/api';

const ExploreTab = ({
  quickExploreSearch,
  runExploreHotelSearch,
  searchLocation,
  setSearchLocation,
  bookingDates,
  setBookingDates,
  numGuests,
  setNumGuests,
  hotelSearchLoading,
  exploreSearchActive,
  clearExploreHotelSearch,
  searchResults,
  hotelsToRender,
  handleHotelClick
}) => (
  <>
    <section className="relative w-full overflow-hidden min-h-[580px] flex items-center">
      <div className="absolute inset-0 z-0 w-full h-full">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30 grayscale-[20%]">
          <source src="/videos/857267-hd_1920_1080_24fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F3EF]/80 via-[#F5F3EF]/40 to-[#F5F3EF]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-[0.4em]">Integrated Booking Portal</span>
            <h1 className="text-5xl lg:text-7xl font-bold text-[#1B2B41] leading-none tracking-tight">
              Perfect <br />Stay <br />Finder<span className="text-[#B88E2F]">.</span>
            </h1>
            <p className="text-base text-[#64748B] max-w-md leading-relaxed font-medium">
              Direct access to Nepal's best hotels. Verified rooms for your business or vacation needs.
            </p>
          </div>
          <div className="hidden lg:grid grid-cols-2 gap-5">
            <button type="button" onClick={() => quickExploreSearch('Kathmandu')} className="group text-left bg-white border-2 border-[#E2E2E2] rounded-2xl overflow-hidden shadow-sm hover:border-[#B88E2F] hover:shadow-lg transition-all">
              <div className="relative h-44 overflow-hidden">
                <img src="/images/kathmandu.webp" alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B2B41]/50 to-transparent" />
              </div>
              <div className="p-4"><span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-widest">Heritage</span><p className="text-base font-bold text-[#1B2B41] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>Kathmandu</p></div>
            </button>
            <button type="button" onClick={() => quickExploreSearch('Pokhara')} className="group text-left bg-white border-2 border-[#E2E2E2] rounded-2xl overflow-hidden shadow-sm hover:border-[#B88E2F] hover:shadow-lg transition-all translate-y-8">
              <div className="relative h-44 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&h=280&q=80" alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B2B41]/50 to-transparent" />
              </div>
              <div className="p-4"><span className="text-[10px] font-bold text-[#B88E2F] uppercase tracking-widest">Lakeside</span><p className="text-base font-bold text-[#1B2B41] mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>Pokhara</p></div>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-20 pb-4">
      <div className="bg-white p-6 md:p-9 shadow-[0_24px_48px_-20px_rgba(0,0,0,0.12)] rounded-[2rem] border-2 border-[#E8E4DE]">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 xl:gap-6 items-end" onSubmit={runExploreHotelSearch}>
          <div className="xl:col-span-2 space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B] flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#B88E2F]">location_on</span>Destination</label>
            <div className="bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-xl focus-within:border-[#B88E2F] transition-all">
              <input type="text" placeholder="City or hotel name" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} className="w-full bg-transparent border-none px-4 py-3.5 text-[#1B2B41] text-[14px] font-semibold placeholder-[#94A3B8] outline-none rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B] flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#B88E2F]">calendar_month</span>Check-in</label>
            <div className="bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-xl focus-within:border-[#B88E2F] transition-all">
              <input type="date" value={bookingDates.checkIn} onChange={(e) => setBookingDates((d) => ({ ...d, checkIn: e.target.value }))} className="w-full bg-transparent border-none px-4 py-3.5 text-[#1B2B41] text-[14px] font-semibold outline-none rounded-xl [color-scheme:light]" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B] flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#B88E2F]">event</span>Check-out</label>
            <div className="bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-xl focus-within:border-[#B88E2F] transition-all">
              <input type="date" value={bookingDates.checkOut} onChange={(e) => setBookingDates((d) => ({ ...d, checkOut: e.target.value }))} className="w-full bg-transparent border-none px-4 py-3.5 text-[#1B2B41] text-[14px] font-semibold outline-none rounded-xl [color-scheme:light]" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748B] flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-[#B88E2F]">group</span>Guests</label>
            <div className="bg-[#F4F3F0] border-2 border-[#E8E4DE] rounded-xl focus-within:border-[#B88E2F] transition-all">
              <input type="number" min={1} value={numGuests} onChange={(e) => setNumGuests(Math.max(1, parseInt(e.target.value, 10) || 1))} className="w-full bg-transparent border-none px-4 py-3.5 text-[#1B2B41] text-[14px] font-semibold outline-none rounded-xl" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 xl:flex-col">
            <button type="submit" disabled={hotelSearchLoading} className="h-[52px] xl:h-[52px] w-full bg-[#1B2B41] text-white rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-[#263345] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
              {hotelSearchLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : <><span className="material-symbols-outlined text-[20px]">search</span>Search hotels</>}
            </button>
            {exploreSearchActive && (
              <button type="button" onClick={clearExploreHotelSearch} className="h-[52px] w-full border-2 border-[#E2E2E2] text-[#1B2B41] rounded-xl font-bold uppercase tracking-widest text-[11px] hover:border-[#B88E2F] transition-all">Show all</button>
            )}
          </div>
        </form>
      </div>
    </div>

    <main id="dashboard-hotel-results" className="max-w-7xl mx-auto px-6 py-12">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#F1F1F1] pb-4">
          <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight italic">{exploreSearchActive ? 'Search results' : 'Available hotels'}</h2>
          {exploreSearchActive && (
            <p className="text-[12px] font-bold text-[#64748B] uppercase tracking-widest">
              {searchLocation.trim() ? `“${searchLocation.trim()}” · ${searchResults.length} propert${searchResults.length === 1 ? 'y' : 'ies'}` : `${searchResults.length} propert${searchResults.length === 1 ? 'y' : 'ies'}`}
            </p>
          )}
        </div>

        {hotelsToRender.length === 0 ? (
          <div className="bg-white border border-[#E2E2E2] rounded-2xl p-12 text-center">
            {exploreSearchActive ? (
              <>
                <p className="text-[#64748B] font-medium">No hotels match these dates and filters. Try different check-in dates, guest count, or destination.</p>
                <button type="button" onClick={clearExploreHotelSearch} className="mt-6 text-[12px] font-bold uppercase tracking-widest text-[#B88E2F] hover:underline">Show all hotels</button>
              </>
            ) : (
              <p className="text-[#64748B] font-medium">No verified hotels are available right now.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {hotelsToRender.map((hotel) => (
              <div key={hotel.id} className="bg-white border border-[#E2E2E2] overflow-hidden cursor-pointer hover:border-[#B88E2F] transition-all rounded-2xl group shadow-sm hover:shadow-xl" onClick={() => handleHotelClick(hotel)}>
                {hotel.images && hotel.images.length > 0 && (
                  <div className="relative h-56 overflow-hidden bg-[#F1F1F1]">
                    <img src={hotel.images[0].startsWith('data:') ? hotel.images[0] : (hotel.images[0].startsWith('http') ? hotel.images[0] : `${API_URL.replace('/api', '')}${hotel.images[0]}`)} className="w-full h-full object-cover grayscale-[0.05] group-hover:scale-110 transition-transform duration-700" alt={hotel.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}
                <div className="p-8">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-base font-bold text-[#1B2B41] uppercase leading-tight tracking-tight">{hotel.title}</h3>
                    <div className="flex items-center gap-1 bg-[#1B2B41]/5 px-2 py-1 rounded-md"><span className="material-symbols-outlined text-[12px] text-yellow-400">star</span><span className="text-[10px] font-bold text-[#1B2B41]">{Number(hotel.rating || 0).toFixed(1)}</span></div>
                    <span className="text-[9px] font-bold text-[#A0AEC0] bg-[#F5F3EF] px-2 py-1 rounded-md">ID-{hotel.id}</span>
                  </div>
                  <div className="flex items-start gap-2 mb-6">
                    <span className="material-symbols-outlined text-lg text-[#B88E2F] shrink-0 mt-0.5">location_on</span>
                    <p className="text-sm font-semibold text-[#475569] leading-snug">{hotel.location || 'Location not provided'}</p>
                  </div>
                  <button className="w-full mt-2 py-4 border border-[#E2E2E2] text-xs font-bold text-[#1B2B41] uppercase tracking-[0.15em] hover:bg-[#1B2B41] hover:text-white transition-all rounded-xl">View Hotel Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  </>
);

export default ExploreTab;
