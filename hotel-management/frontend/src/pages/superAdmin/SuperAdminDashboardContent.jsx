import React from 'react';
import { API_URL } from '../../config/api';
import StatCard from '../../components/admin/StatCard';

const SuperAdminDashboardContent = ({
  hotelNetworkRef,
  stats,
  totalRevenue,
  totalCommission,
  message,
  pendingHotels,
  hotels,
  openPendingReview,
  handleDeletePendingHotel,
  setShowAddHotelModal,
  openHotelDetail,
  openAnalyticsModal,
  openTransactionsModal,
  openRefundsModal,
  openPayoutsModal,
  refundRequests,
  payoutRequests,
  generateMasterReport,
  reportLoading
}) => (
  <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard label="HOTEL NETWORK" value={stats.hotels} icon="domain" trend="+2 New" />
      <StatCard label="HOTEL MANAGERS" value={stats.admins} icon="badge" />
      <StatCard label="REGISTERED GUESTS" value={stats.guests} icon="group" />
      <StatCard label="TOTAL REVENUE" value={`NRS ${totalRevenue.toLocaleString()}`} icon="payments" trend="Gross" />
      <StatCard label="PLATFORM FEE" value={`NRS ${totalCommission.toLocaleString()}`} icon="account_balance_wallet" trend="10% Net" isMajor={true} />
    </div>

    {message.text && (
      <div className={`mb-8 p-4 border rounded-sm text-xs font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-[#E7F3ED] border-[#108548] text-[#108548]' : 'bg-[#FEEDEC] border-[#B91C1C] text-[#B91C1C]'}`}>
        {message.text}
      </div>
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 admin-card p-10">
        {pendingHotels.length > 0 && (
          <div className="mb-10 border-b border-[#F1F1F1] pb-10">
            <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight mb-6">Pending Approvals</h2>
            <div className="grid grid-cols-1 gap-4">
              {pendingHotels.map(hotel => (
                <div key={hotel.id} className="bg-[#FFFDF5] border border-[#B88E2F] p-6 rounded-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 shadow-sm">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase">{hotel.name}</h3>
                      <span className="text-[9px] bg-[#B88E2F] text-white px-2 py-0.5 rounded-sm uppercase tracking-widest">Action Required</span>
                    </div>
                    <p className="text-[10px] text-[#64748B] uppercase tracking-wider mb-2">{hotel.city}, {hotel.country}</p>
                    <div className="text-[10px] text-[#1B2B41]">
                      <span className="font-bold text-[#A0AEC0]">OWNER:</span> {hotel.owner_name || 'N/A'} <span className="text-[#E2E2E2] mx-2">|</span>
                      <span className="font-bold text-[#A0AEC0]">EMAIL:</span> {hotel.owner_email || 'N/A'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openPendingReview(hotel.id)}
                      className="admin-button border border-[#1B2B41] !text-[#1B2B41] !bg-white hover:bg-[#1B2B41] hover:!text-white !text-[9px] px-5 py-3 tracking-[0.2em]"
                    >
                      Review details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePendingHotel(hotel.id)}
                      className="admin-button !bg-[#B91C1C] !text-white !text-[9px] px-5 py-3 tracking-[0.2em]"
                    >
                      Reject request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={hotelNetworkRef} className="flex justify-between items-end mb-8 border-b border-[#F1F1F1] pb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight">Hotel Network</h2>
            <p className="text-[11px] text-[#64748B] font-medium mt-1 uppercase tracking-widest">All Registered Hotels</p>
          </div>
          <button onClick={() => setShowAddHotelModal(true)} className="admin-button admin-button-primary text-[10px] px-6 py-3 tracking-[0.2em]">
            Register New Hotel
          </button>
        </div>

        {hotels.filter((h) => h.status === 'verified').length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.filter((h) => h.status === 'verified').map(hotel => {
              let hotelImages = [];
              if (hotel.image) { try { hotelImages = JSON.parse(hotel.image); } catch (e) { hotelImages = [hotel.image]; } }
              return (
                <div
                  key={hotel.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openHotelDetail(hotel.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openHotelDetail(hotel.id);
                    }
                  }}
                  className="admin-card overflow-hidden hover:border-[#B88E2F] transition-colors group cursor-pointer text-left"
                >
                  {hotelImages.length > 0 && (
                    <div className="relative h-40 overflow-hidden bg-slate-100 pointer-events-none">
                      <img src={hotelImages[0].startsWith('data:') ? hotelImages[0] : (hotelImages[0].startsWith('http') ? hotelImages[0] : `${API_URL.replace("/api", "")}${hotelImages[0]}`)} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold text-[#1B2B41] uppercase">{hotel.name}</h3>
                      <span className="text-[10px] font-bold text-[#64748B]">ID: {hotel.id}</span>
                    </div>
                    <p className="text-[11px] text-[#B88E2F] font-bold mb-3 uppercase tracking-wider">{hotel.city}, {hotel.country}</p>
                    <p className="text-[10px] text-[#64748B] line-clamp-2 h-8 leading-relaxed italic">{hotel.description}</p>
                    <p className="text-[9px] text-[#C4993E] font-bold uppercase tracking-widest mt-3">Click for details &amp; manager email</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-[#E2E2E2]">
            <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.2em]">No hotels registered yet</p>
          </div>
        )}
      </div>

      <div className="space-y-8 min-w-[320px]">
        <div className="admin-card p-10">
          <h3 className="admin-label mb-8 border-b border-[#F1F1F1] pb-6">Reports & Analytics</h3>
          <div className="space-y-4">
            <button
              onClick={openAnalyticsModal}
              className="w-full text-left px-6 py-5 border border-[#E2E2E2] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
            >
              System Audits
              <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">monitoring</span>
            </button>
            <button
              onClick={openTransactionsModal}
              className="w-full text-left px-6 py-5 border border-[#E2E8F0] bg-[#F9FAFB] text-[10px] font-bold text-[#1B2B41] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
            >
              Transaction Logs
              <span className="material-symbols-outlined text-[18px] text-[#A0AEC0] group-hover:text-[#1B2B41]">history_edu</span>
            </button>
            <button
              onClick={openRefundsModal}
              className="w-full relative text-left px-6 py-5 border border-[#E2E8F0] bg-[#FFF8F8] text-[10px] font-bold text-[#B91C1C] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
            >
              {refundRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse z-10"></span>}
              Pending Refunds
              <span className="material-symbols-outlined text-[18px] text-[#B91C1C]">payments</span>
            </button>
            <button
              onClick={openPayoutsModal}
              className="w-full relative text-left px-6 py-5 border border-[#E2E8F0] bg-[#F0FCF5] text-[10px] font-bold text-[#108548] uppercase tracking-[0.2em] hover:bg-white transition-colors rounded-sm flex justify-between items-center group"
            >
              {payoutRequests.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse z-10"></span>}
              Payout Requests
              <span className="material-symbols-outlined text-[18px] text-[#108548]">account_balance_wallet</span>
            </button>

            <button
              onClick={generateMasterReport}
              disabled={reportLoading}
              className="w-full text-left px-6 py-5 bg-[#BC8E2E] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#A67C28] transition-colors rounded-sm mt-8 flex justify-between items-center shadow-md disabled:opacity-50"
            >
              {reportLoading ? 'Generating...' : 'Generate Master Report'}
              <span className="material-symbols-outlined text-[18px]">{reportLoading ? 'hourglass_empty' : 'picture_as_pdf'}</span>
            </button>
          </div>
        </div>

        <div className="admin-card p-8">
          <h3 className="admin-label mb-6 border-b border-[#F1F1F1] pb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
              <div>
                <p className="text-[10px] font-bold text-[#1B2B41]">Database Online</p>
                <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">Connection Verified</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#108548] mt-1.5"></div>
              <div>
                <p className="text-[10px] font-bold text-[#1B2B41]">Authentication Active</p>
                <p className="text-[9px] text-[#A0AEC0] uppercase mt-0.5">All Services Running</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);

export default SuperAdminDashboardContent;
