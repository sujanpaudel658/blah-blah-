import React from 'react';

const AnalyticsModal = ({
  showAnalyticsModal,
  setShowAnalyticsModal,
  analyticsLoading,
  analyticsData
}) => {
  if (!showAnalyticsModal) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent p-4 sm:p-6 fade-in"
      onClick={() => setShowAnalyticsModal(false)}
      role="presentation"
    >
      <div
        className="bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-xl flex flex-col shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1A2332] px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em]">System Audits</h2>
            <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] mt-1">Live Booking & Revenue Overview</p>
          </div>
          <button onClick={() => setShowAnalyticsModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-8 custom-scrollbar flex-1">
          {analyticsLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#C4993E] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading analytics...</p>
            </div>
          ) : analyticsData ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Bookings', value: analyticsData.overview.total_bookings || 0, color: '#1B2B41' },
                  { label: 'Total Revenue', value: `NRS ${Number(analyticsData.overview.total_revenue || 0).toLocaleString()}`, color: '#108548' },
                  { label: 'Platform Fee (10%)', value: `NRS ${Number(analyticsData.overview.total_commission || 0).toLocaleString()}`, color: '#607AFB' },
                  { label: 'Cancelled', value: analyticsData.overview.cancelled || 0, color: '#B91C1C' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] p-5 rounded-lg text-center">
                    <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Confirmed', value: analyticsData.overview.confirmed || 0, bg: 'bg-[#E7F3ED]', text: 'text-[#108548]' },
                  { label: 'Pending', value: analyticsData.overview.pending || 0, bg: 'bg-[#FFF8E6]', text: 'text-[#A36B00]' },
                  { label: 'Checked In', value: analyticsData.overview.checked_in || 0, bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]' },
                  { label: 'Checked Out', value: analyticsData.overview.checked_out || 0, bg: 'bg-[#F1F5F9]', text: 'text-[#475569]' },
                  { label: 'Refunded', value: `NRS ${Number(analyticsData.overview.total_refunded || 0).toLocaleString()}`, bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]' },
                ].map((item, i) => (
                  <div key={i} className={`${item.bg} p-4 rounded-lg text-center`}>
                    <p className={`text-lg font-bold ${item.text}`}>{item.value}</p>
                    <p className="text-[8px] font-bold text-[#64748B] uppercase tracking-wider mt-1">{item.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#1B2B41] uppercase tracking-[0.2em] mb-4 border-b border-[#F1F1F1] pb-3">Revenue by Hotel</h3>
                <div className="overflow-x-auto">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>Hotel</th>
                        <th>City</th>
                        <th>Bookings</th>
                        <th>Active</th>
                        <th className="text-right">Revenue</th>
                        <th className="text-right">Fee</th>
                        <th className="text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.hotelRevenue.map((hotel, i) => (
                        <tr key={i}>
                          <td className="font-bold text-[#1B2B41]">{hotel.name}</td>
                          <td className="text-[#64748B]">{hotel.city}</td>
                          <td>{hotel.total_bookings || 0}</td>
                          <td>
                            <span className="bg-[#E7F3ED] text-[#108548] px-2 py-0.5 rounded text-[10px] font-bold">
                              {hotel.active_bookings || 0}
                            </span>
                          </td>
                          <td className="text-right font-bold text-[#1B2B41]">NRS {Number(hotel.revenue || 0).toLocaleString()}</td>
                          <td className="text-right font-bold text-[#607AFB]">NRS {Number(hotel.commission || 0).toLocaleString()}</td>
                          <td className={`text-right font-bold ${Number(hotel.balance) < 0 ? 'text-[#B91C1C]' : 'text-[#108548]'}`}>
                            NRS {Number(hotel.balance || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#1B2B41] uppercase tracking-[0.2em] mb-4 border-b border-[#F1F1F1] pb-3">Recent Bookings</h3>
                <div className="overflow-x-auto">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Guest</th>
                        <th>Hotel</th>
                        <th>Dates</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Fee</th>
                        <th className="text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.recentBookings.map((b, i) => (
                        <tr key={i}>
                          <td className="font-mono text-[10px] text-[#64748B]">{b.booking_reference}</td>
                          <td className="font-bold text-[#1B2B41]">{b.guest_name}</td>
                          <td>{b.hotel_name}</td>
                          <td className="text-[11px] whitespace-nowrap">{new Date(b.check_in_date).toLocaleDateString()} - {new Date(b.check_out_date).toLocaleDateString()}</td>
                          <td className="font-bold text-right">NRS {Number(b.total_amount).toLocaleString()}</td>
                          <td className="font-bold text-right text-[#607AFB]">NRS {Number(b.commission_amount || 0).toLocaleString()}</td>
                          <td className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              b.status === 'confirmed' ? 'bg-[#E7F3ED] text-[#108548]' :
                              b.status === 'pending' ? 'bg-[#FFF8E6] text-[#A36B00]' :
                              b.status === 'cancelled' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                              'bg-[#F1F5F9] text-[#475569]'
                            }`}>
                              {(b.status || '').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center"><p className="text-xs text-[#94A3B8]">No analytics data available.</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModal;
