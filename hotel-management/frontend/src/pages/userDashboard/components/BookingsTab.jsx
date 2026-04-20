import React from 'react';

const BookingsTab = ({
  displayBookings,
  setPassRoomIndex,
  setSelectedPass,
  setShowPassModal,
  payOnlineBookingId,
  handlePayOnlineForBooking,
  setSelectedBill,
  setShowBillModal,
  setSelectedBookingForReview,
  setShowReviewModal,
  handleCancelBooking,
  handleVerifyPayment,
  openEditBookingModal,
  canExtendStay,
  openExtendModal
}) => (
  <section className="max-w-7xl mx-auto px-6 py-12">
    <div className="flex flex-col gap-10">
      <div className="space-y-2 border-b border-[#F1F1F1] pb-6">
        <h2 className="text-2xl font-bold text-[#1B2B41] uppercase tracking-tight italic">My Bookings</h2>
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">History of your past and current hotel bookings</p>
      </div>

      {displayBookings.length > 0 ? (
        <div className="space-y-6">
          {displayBookings.map((booking) => (
            <div key={booking.id} className={`bg-white border p-10 flex flex-col md:flex-row gap-12 rounded-2xl shadow-sm hover:border-[#1B2B41] transition-all hover:shadow-lg ${booking.status === 'checked_out' || booking.status === 'cancelled' ? 'opacity-80' : ''}`}>
              <div className="shrink-0 space-y-4">
                <div className="w-20 h-20 bg-[#F9FAFB] border border-[#E2E2E2] flex items-center justify-center text-[#1B2B41] rounded-2xl">
                  <span className="material-symbols-outlined text-4xl font-light">{booking.status === 'checked_out' ? 'history' : 'inventory_2'}</span>
                </div>
                <div className={`px-4 py-2 border text-[9px] font-bold uppercase tracking-widest text-center rounded-lg ${booking.status === 'checked_out' ? 'bg-slate-100 border-slate-300 text-slate-500' : booking.status === 'confirmed' ? 'bg-[#E7F3ED] border-[#108548] text-[#108548]' : booking.status === 'checked_in' ? 'bg-[#E8EEF8] border-[#3B5BA9] text-[#3B5BA9]' : 'bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]'}`}>
                  {booking.status.replace('_', ' ')}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-1 font-mono">HOTEL_BOOKING</p>
                    <h4 className="text-base font-bold text-[#1B2B41] uppercase tracking-tight">{booking.hotel_name}</h4>
                    {booking._groupBookings?.length > 1 && <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mt-1">{booking._groupBookings.length} rooms</p>}
                  </div>
                  <div className="flex items-center gap-2 text-[#64748B] text-[10px] font-bold uppercase">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span>{booking.hotel_city}, NEPAL</span>
                  </div>
                </div>

                <div className={`grid ${booking.status === 'checked_in' ? 'grid-cols-3' : 'grid-cols-2'} gap-10 py-6 md:py-0 border-y md:border-y-0 md:border-x border-[#F1F1F1] md:px-10`}>
                  <div className="space-y-1"><p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Check-in</p><p className="text-xs font-bold text-[#1B2B41]">{new Date(booking.check_in_date).toLocaleDateString()}</p></div>
                  <div className="space-y-1"><p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Check-out</p><p className="text-xs font-bold text-[#1B2B41]">{new Date(booking.check_out_date).toLocaleDateString()}</p></div>
                  {booking.status === 'checked_in' && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Stay duration</p>
                      <p className="text-xs font-bold text-[#1B2B41]">
                        {(Number(booking.total_nights) || Math.max(1, Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24))))} night(s)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-6">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest mb-1">{booking.payment_status === 'paid' ? 'Total price (paid)' : 'Total amount due'}</p>
                    <p className="text-2xl font-bold text-[#1B2B41]">NRS {Number(booking.total_amount).toLocaleString()}</p>
                    {booking.loyalty_free_night === 1 && (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <span className="material-symbols-outlined text-[12px] text-[#B88E2F]" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
                        <span className="text-[8px] font-bold text-[#B88E2F] uppercase tracking-widest">Loyalty Reward Applied (-NRS {Number(booking.loyalty_discount || 0).toLocaleString()})</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap md:flex-nowrap justify-end gap-3 w-full md:w-auto">
                    {booking.status === 'confirmed' && (
                      <button onClick={() => { setPassRoomIndex(0); setSelectedPass(booking); setShowPassModal(true); }} className="px-6 py-4 bg-white border-2 border-[#1B2B41] text-[#1B2B41] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F1F5F9] transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">vpn_key</span>Access Pass</button>
                    )}
                    {booking.status === 'confirmed' && booking.payment_status === 'pending' && (
                      <button type="button" title="Pay with Khalti now instead of at the hotel" disabled={payOnlineBookingId === booking.id} onClick={() => handlePayOnlineForBooking(booking)} className="px-6 py-4 bg-white border-2 border-[#3B5BA9] text-[#3B5BA9] text-[10px] font-bold uppercase tracking-widest hover:bg-[#EFF6FF] transition-all rounded-xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"><span className="material-symbols-outlined text-sm">payments</span>{payOnlineBookingId === booking.id ? 'Opening…' : 'Pay online (Khalti)'}</button>
                    )}
                    {booking.payment_status === 'paid' && (
                      <button onClick={() => { setSelectedBill(booking); setShowBillModal(true); }} className="px-6 py-4 bg-white border-2 border-[#64748B] text-[#1B2B41] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F8FAFC] transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">receipt_long</span>Invoice</button>
                    )}
                    {booking.status === 'checked_out' && (booking._groupBookings || [booking]).some((m) => !Number(m.is_reviewed)) && (
                      <button onClick={() => { const slots = booking._groupBookings || [booking]; const next = slots.find((m) => !Number(m.is_reviewed)); setSelectedBookingForReview(next || booking); setShowReviewModal(true); }} className="px-6 py-4 bg-[#B88E2F]/10 border border-[#B88E2F] text-[#B88E2F] text-[10px] font-bold uppercase tracking-widest hover:bg-[#B88E2F] hover:text-white transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">star</span>Rate Experience</button>
                    )}
                    {(booking._groupBookings || [booking]).every((m) => Number(m.is_reviewed) > 0) && (<div className="px-6 py-4 bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">verified</span> Review Submitted</div>)}
                    {['pending', 'confirmed'].includes(booking.status) && (<button type="button" onClick={() => handleCancelBooking(booking)} className="px-6 py-4 bg-white border-2 border-rose-500 text-rose-700 text-[10px] font-bold uppercase tracking-widest hover:bg-rose-50 transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">cancel</span>Cancel booking</button>)}
                    {booking.status === 'pending' && (<button onClick={() => handleVerifyPayment(booking)} className="px-5 py-3 bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#9E7A28] transition-all rounded-sm">Verify Payment</button>)}
                    {['pending', 'confirmed'].includes(booking.status) && (<button type="button" onClick={() => openEditBookingModal(booking)} className="px-6 py-4 bg-white border-2 border-[#64748B] text-[#1B2B41] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F8FAFC] transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">edit_note</span>Edit booking</button>)}
                    {canExtendStay(booking) && (<button type="button" onClick={() => openExtendModal(booking)} className="px-6 py-4 bg-[#3B5BA9] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#2d4780] transition-all rounded-xl flex items-center gap-3"><span className="material-symbols-outlined text-sm">event_repeat</span>Extend stay</button>)}
                  </div>
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase font-mono tracking-tighter">REF: {booking.booking_reference}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 bg-white border border-[#E2E2E2] text-center rounded-sm">
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.3em]">No bookings found</p>
        </div>
      )}
    </div>
  </section>
);

export default BookingsTab;
