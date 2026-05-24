import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { API_URL } from '../../../config/api';
import { getImageUrl } from '../../../utils/helpers';
import { formatHotelLocationShort, formatHotelLocationFull, withNormalizedCoords } from '../../../utils/hotelLocation';
import { hasValidMapCoords } from '../../../utils/geoCoords';

const HotelBookingModal = ({
  showModal,
  selectedHotel,
  closeModal,
  activeImageIndex,
  setActiveImageIndex,
  setIsMapFullScreen,
  bookingDates,
  setBookingDates,
  numRooms,
  setNumRooms,
  numGuests,
  setNumGuests,
  rooms,
  setSelectedRoom,
  selectedRoom,
  loyaltyStatus,
  processBooking,
  isReserving,
  hotelReviews
}) => {
  if (!showModal || !selectedHotel) return null;

  return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 fade-in">
          <div className="bg-white max-w-6xl w-full max-h-[95vh] overflow-hidden rounded-2xl flex flex-col relative shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-[110] w-10 h-10 bg-white/90 backdrop-blur-md text-[#1B2B41] flex items-center justify-center hover:bg-[#1B2B41] hover:text-white transition-all rounded-full shadow-lg"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              <div className="relative h-[300px] md:h-[450px] overflow-hidden">
                {selectedHotel.images && selectedHotel.images.length > 0 ? (
                  <>
                    <img
                      src={selectedHotel.images[activeImageIndex].startsWith('data:') ? selectedHotel.images[activeImageIndex] : (selectedHotel.images[activeImageIndex].startsWith('http') ? selectedHotel.images[activeImageIndex] : `${API_URL.replace("/api", "")}${selectedHotel.images[activeImageIndex]}`)}
                      className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                      alt={`Hotel Image ${activeImageIndex + 1}`}
                      key={activeImageIndex}
                    />

                    {selectedHotel.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev === 0 ? selectedHotel.images.length - 1 : prev - 1));
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all rounded-full border border-white/30"
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex((prev) => (prev === selectedHotel.images.length - 1 ? 0 : prev + 1));
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-[110] w-12 h-12 bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all rounded-full border border-white/30"
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>

                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[110] flex gap-2">
                          {selectedHotel.images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveImageIndex(idx)}
                              className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? 'bg-white w-6' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (

                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                    <span className="material-symbols-outlined text-8xl">image</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent"></div>

                <div className="absolute bottom-8 left-8 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="bg-[#B88E2F] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg">Premium Hotel</span>
                    <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">
                      <span className="material-symbols-outlined text-[14px] text-yellow-400">star</span>
                      <span>{Number(selectedHotel.rating || 0).toFixed(1)} Rating</span>
                    </div>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-bold tracking-tight drop-shadow-md">{selectedHotel.title}</h3>
                </div>
              </div>

              <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                  <div className="lg:col-span-2 space-y-12">

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[#B88E2F]">
                        <span className="material-symbols-outlined text-xl">location_on</span>
                        <span className="text-sm font-semibold tracking-wide uppercase">
                          {formatHotelLocationShort(selectedHotel) || 'Location Not Provided'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-6 py-6 border-y border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">hotel</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Configuration</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">Available Rooms</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">verified_user</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Verification</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">StayNepal Certified</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#1B2B41]">
                            <span className="material-symbols-outlined">schedule</span>
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase">Check-In</span>
                            <span className="text-sm font-semibold text-[#1B2B41]">14:00 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <section>
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest mb-4 border-l-4 border-[#B88E2F] pl-4">About This Hotel</h4>
                      <p className="text-lg text-slate-600 leading-relaxed">
                        {selectedHotel.fullDescription || "Hotel information is arriving soon. Our team is verifying this hotel to ensure a high standard of hospitality for your stay."}
                      </p>
                    </section>

                    <section>
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest mb-6 border-l-4 border-[#B88E2F] pl-4 font-inter">Amenities & Facilities</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                          { icon: 'wifi', label: 'High Speed WiFi' },
                          { icon: 'ac_unit', label: 'Air Conditioning' },
                          { icon: 'local_parking', label: 'secure Parking' },
                          { icon: 'restaurant', label: 'Fine Dining' },
                          { icon: 'pool', label: 'Infinity Pool' },
                          { icon: 'fitness_center', label: 'Wellness Club' },
                          { icon: 'local_laundry_service', label: 'Housekeeping' },
                          { icon: 'support_agent', label: '24/7 Concierge' }
                        ].map((amenity, i) => (
                          <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-all group">
                            <span className="material-symbols-outlined text-2xl text-slate-400 group-hover:text-[#B88E2F] transition-colors">{amenity.icon}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{amenity.label}</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-8 pb-12">
                      <div className="flex items-center justify-between border-b border-[#F1F1F1] pb-4">
                        <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest border-l-4 border-[#B88E2F] pl-4 font-inter">Guest Reviews</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-[#1B2B41]">
                            {hotelReviews.length > 0
                              ? (hotelReviews.reduce((acc, r) => acc + Number(r.rating), 0) / hotelReviews.length).toFixed(1)
                              : Number(selectedHotel.rating || 0).toFixed(1)}
                          </span>
                          <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => {
                              const avg = hotelReviews.length > 0
                                ? (hotelReviews.reduce((acc, r) => acc + Number(r.rating), 0) / hotelReviews.length)
                                : Number(selectedHotel.rating || 0);
                              return (
                                <span key={i} className="material-symbols-outlined text-[20px] fill-current" style={{ fontVariationSettings: `'FILL' ${i < Math.round(avg) ? 1 : 0}` }}>
                                  star_rate
                                </span>
                              );
                            })}
                          </div>
                          <span className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-tighter">({hotelReviews.length} Reviews)</span>
                        </div>
                      </div>

                      {hotelReviews.length === 0 ? (
                        <div className="py-12 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                          <span className="material-symbols-outlined text-slate-300 text-4xl mb-3">rate_review</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No verified reviews in our registry yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {hotelReviews.map((review) => (
                            <div key={review.id} className="p-8 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all">
                              <div className="flex justify-between items-start mb-4 gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                  {review.reviewer_profile_image ? (
                                    <img
                                      src={getImageUrl(review.reviewer_profile_image)}
                                      alt=""
                                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 rounded-full bg-[#1B2B41] text-[#B88E2F] flex items-center justify-center text-sm font-bold shrink-0">
                                      {(review.reviewer_name || 'G').trim().charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <h5 className="text-sm font-bold text-[#1B2B41] uppercase mb-1">{review.title || 'Exceptional Stay'}</h5>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="flex text-yellow-400">
                                        {[...Array(5)].map((_, i) => (
                                          <span key={i} className="material-symbols-outlined text-[16px] fill-current" style={{ fontVariationSettings: `'FILL' ${i < Number(review.rating) ? 1 : 0}` }}>
                                            star_rate
                                          </span>
                                        ))}
                                      </div>
                                      <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">{review.reviewer_name}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-tighter shrink-0">{new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xs text-[#64748B] leading-relaxed italic">"{review.comment}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-6">
                      <h4 className="text-sm font-bold text-[#1B2B41] uppercase tracking-widest border-l-4 border-[#B88E2F] pl-4 font-inter">Hotel Location</h4>
                      {(() => {
                        const pin = withNormalizedCoords(selectedHotel);
                        const hasCoords = hasValidMapCoords(pin.latitude, pin.longitude);
                        const lat = pin.latitude;
                        const lng = pin.longitude;
                        const locationLine = formatHotelLocationFull(selectedHotel);
                        return hasCoords ? (
                          <>
                            <div className="h-[350px] shadow-sm rounded-2xl overflow-hidden relative group">
                              <MapContainer
                                key={`${selectedHotel.id}-${lat}-${lng}`}
                                center={[lat, lng]}
                                zoom={16}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                                zoomControl={true}
                                dragging={true}
                              >
                                <TileLayer url="https://{s}.tile.osm.org/{z}/{x}/{y}.png" />
                                <Marker position={[lat, lng]} />
                              </MapContainer>

                              <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
                                <button
                                  onClick={() => setIsMapFullScreen(true)}
                                  className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-100 shadow-xl text-[10px] font-bold text-[#1B2B41] flex items-center gap-2 hover:bg-[#1B2B41] hover:text-white transition-all transform hover:scale-105"
                                >
                                  <span className="material-symbols-outlined text-sm">open_in_full</span>
                                  OPEN FULL MAP
                                </button>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#B88E2F] px-4 py-2 rounded-lg shadow-xl text-[10px] font-bold text-white flex items-center gap-2 hover:bg-[#a17a26] transition-all transform hover:scale-105"
                                >
                                  <span className="material-symbols-outlined text-sm">directions</span>
                                  GET DIRECTIONS
                                </a>
                              </div>

                              <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-100 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[10px] font-bold text-[#1B2B41]">INTERACTIVE MAP</p>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 font-medium">{locationLine}</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">North Reference</span>
                                <p className="text-xs font-mono font-bold text-[#1B2B41]">{lat.toFixed(6)}</p>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">East Reference</span>
                                <p className="text-xs font-mono font-bold text-[#1B2B41]">{lng.toFixed(6)}</p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-[350px] rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">map_off</span>
                            <p className="text-sm font-bold text-[#1B2B41] uppercase tracking-wide">Map unavailable</p>
                            <p className="text-xs text-slate-500 mt-2 max-w-sm">
                              This hotel has not set map coordinates yet. Ask the property to pin their location in the admin dashboard.
                            </p>
                            <p className="text-[10px] font-bold text-[#B88E2F] mt-3 uppercase">{locationLine}</p>
                          </div>
                        );
                      })()}
                    </section>
                  </div>

                  <aside className="relative">
                    <div className="lg:sticky lg:top-0 space-y-6">
                      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Starting From</span>
                            <span className="text-3xl font-bold text-[#1B2B41]">NRS {rooms.length > 0 ? Math.min(...rooms.map(r => Number(r.base_price))).toFixed(2) : '---'}</span>
                            <span className="text-xs text-slate-400 font-semibold italic ml-1">/ Night</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Check-In</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">calendar_today</span>
                                <input
                                  type="date"
                                  value={bookingDates.checkIn}
                                  min={new Date().toISOString().split('T')[0]}
                                  onChange={(e) => setBookingDates(prev => ({ ...prev, checkIn: e.target.value }))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                                />
                              </div>
                            </div>
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Check-Out</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">event</span>
                                <input
                                  type="date"
                                  value={bookingDates.checkOut}
                                  min={bookingDates.checkIn}
                                  onChange={(e) => setBookingDates(prev => ({ ...prev, checkOut: e.target.value }))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-4 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Rooms Needed</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">bed</span>
                                <select
                                  value={numRooms}
                                  onChange={(e) => setNumRooms(parseInt(e.target.value))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-8 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl cursor-pointer appearance-none"
                                >
                                  {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Room' : 'Rooms'}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="group">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Total Guests</label>
                              <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-300 group-focus-within:text-[#B88E2F] transition-colors">group</span>
                                <select
                                  value={numGuests}
                                  onChange={(e) => setNumGuests(parseInt(e.target.value))}
                                  className="w-full bg-slate-50 border border-transparent focus:border-[#B88E2F] focus:bg-white pl-12 pr-8 py-3 text-[11px] font-bold uppercase transition-all outline-none rounded-xl cursor-pointer appearance-none"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1 text-center font-inter">Room Availability</label>
                          <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                            {rooms.length === 0 ? (
                              <div className="p-6 bg-slate-50 rounded-xl text-center">
                                <span className="material-symbols-outlined text-slate-300 mb-2">sensor_door</span>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No availability for selected dates</p>
                              </div>
                            ) : (
                              rooms.map(room => (
                                <div
                                  key={room.room_type_id}
                                  onClick={() => setSelectedRoom(room)}
                                  className={`p-4 rounded-xl border transition-all cursor-pointer group/room ${selectedRoom?.room_type_id === room.room_type_id
                                    ? 'bg-[#1B2B41] border-[#1B2B41] text-white shadow-lg'
                                    : 'bg-white border-slate-100 hover:border-[#B88E2F] hover:bg-slate-50'
                                    }`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className={`text-[11px] font-bold uppercase tracking-tight ${selectedRoom?.room_type_id === room.room_type_id ? 'text-white' : 'text-[#1B2B41]'}`}>{room.type_name}</span>
                                    <span className={`text-xs font-bold ${selectedRoom?.room_type_id === room.room_type_id ? 'text-[#F6C768]' : 'text-[#B88E2F]'}`}>NRS {room.base_price}</span>
                                  </div>
                                  <div className="flex justify-between text-[8px] font-bold uppercase opacity-60">
                                    <span>{room.available_count} Rooms Available</span>
                                    <span>Max Guests: {room.max_occupancy}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {loyaltyStatus && (
                          <div className={`p-5 rounded-xl border ${loyaltyStatus.is_eligible 
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-[#B88E2F]/30' 
                            : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${loyaltyStatus.is_eligible ? 'bg-[#B88E2F] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-[#1B2B41] uppercase tracking-widest">Loyalty Program</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                  {loyaltyStatus.is_eligible 
                                    ? ' 1 FREE NIGHT REWARD AVAILABLE!' 
                                    : `${loyaltyStatus.progress}/${loyaltyStatus.threshold} stays this year`}
                                </p>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ease-out ${loyaltyStatus.is_eligible ? 'bg-gradient-to-r from-[#B88E2F] to-[#D4A843]' : 'bg-[#1B2B41]'}`}
                                style={{ width: `${(loyaltyStatus.progress / loyaltyStatus.threshold) * 100}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-2">
                              {[...Array(loyaltyStatus.threshold)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold ${i < loyaltyStatus.progress 
                                  ? (loyaltyStatus.is_eligible ? 'bg-[#B88E2F] text-white' : 'bg-[#1B2B41] text-white')
                                  : 'bg-slate-200 text-slate-400'}`}>
                                  {i < loyaltyStatus.progress ? '✓' : i + 1}
                                </div>
                              ))}
                            </div>
                            {loyaltyStatus.is_eligible && (
                              <p className="text-[9px] font-bold text-[#B88E2F] mt-3 text-center uppercase tracking-wider animate-pulse">
                                ★ 1 Night Free on this booking ★
                              </p>
                            )}
                            {!loyaltyStatus.is_eligible && loyaltyStatus.threshold - loyaltyStatus.progress <= 2 && loyaltyStatus.progress > 0 && (
                              <p className="text-[8px] font-bold text-slate-400 mt-2 text-center uppercase tracking-wider">
                                Only {loyaltyStatus.threshold - loyaltyStatus.progress} more stay{loyaltyStatus.threshold - loyaltyStatus.progress > 1 ? 's' : ''} for a free night!
                              </p>
                            )}
                          </div>
                        )}

                        <div className="pt-8 border-t border-slate-50 space-y-6">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Stay Cost</p>
                              {(() => {
                                if (!selectedRoom) return <p className="text-3xl font-bold text-[#1B2B41] tracking-tighter">---</p>;
                                const totalNights = Math.max(1, Math.ceil((new Date(bookingDates.checkOut) - new Date(bookingDates.checkIn)) / (1000 * 60 * 60 * 24)));
                                const originalTotal = selectedRoom.base_price * totalNights * numRooms;
                                const loyaltyDisc = (loyaltyStatus && loyaltyStatus.is_eligible) ? selectedRoom.base_price * numRooms : 0;
                                const finalTotal = originalTotal - loyaltyDisc;
                                return (
                                  <div>
                                    {loyaltyDisc > 0 && (
                                      <p className="text-sm font-bold text-slate-400 line-through mb-1">NRS {originalTotal.toLocaleString()}</p>
                                    )}
                                    <p className={`text-3xl font-bold tracking-tighter ${loyaltyDisc > 0 ? 'text-green-600' : 'text-[#1B2B41]'}`}>
                                      NRS {finalTotal.toLocaleString()}
                                    </p>
                                    {loyaltyDisc > 0 && (
                                      <p className="text-[9px] font-bold text-green-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                                        Loyalty Discount: -NRS {loyaltyDisc.toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-[#B88E2F] uppercase tracking-widest">Safe Payment</p>
                            </div>
                          </div>

                          <button
                            onClick={() => processBooking('khalti')}
                            disabled={isReserving || !selectedRoom}
                            className={`w-full py-4 text-[12px] font-bold uppercase tracking-[0.2em] transition-all rounded-xl shadow-xl transform active:scale-[0.98] ${!selectedRoom
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-[#B88E2F] text-white hover:bg-[#a17a26] hover:shadow-[#B88E2F]/20'
                              }`}
                          >
                            {isReserving ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Processing...</span>
                              </div>
                            ) : (
                              selectedRoom ? 'Secure Payment / Book Now' : 'Select a Room'
                            )}
                          </button>

                          <button
                            onClick={() => processBooking('cash')}
                            disabled={isReserving || !selectedRoom}
                            className={`w-full py-4 text-[12px] font-bold uppercase tracking-[0.2em] transition-all rounded-xl border-2 transform active:scale-[0.98] ${!selectedRoom
                              ? 'border-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-[#1B2B41] text-[#1B2B41] hover:bg-[#1B2B41] hover:text-white'
                              }`}
                          >
                            {isReserving ? 'Processing...' : 'Reserve & Pay at Hotel'}
                          </button>

                          <p className="text-[9px] text-center font-bold text-slate-400 uppercase tracking-widest">Secure Payment Powered by StayNepal</p>
                        </div>
                      </div>
                    </div>
                  </aside>

                </div>
              </div>
            </div>
          </div>
        </div>
  );
};

export default HotelBookingModal;
