import React from 'react';

const PendingReviewModal = ({
  pendingReviewOpen,
  setPendingReviewOpen,
  setPendingReviewData,
  setPendingReviewId,
  pendingReviewLoading,
  pendingReviewError,
  pendingReviewData,
  pendingReviewId,
  handleDeletePendingHotel,
  handleVerifyHotel
}) => {
  if (!pendingReviewOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent p-4 sm:p-6 fade-in"
      onClick={() => {
        setPendingReviewOpen(false);
        setPendingReviewData(null);
        setPendingReviewId(null);
      }}
      role="presentation"
    >
      <div
        className="bg-white max-w-4xl w-full max-h-[92vh] overflow-hidden rounded-xl flex flex-col shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1B2B41] px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Review hotel request</h2>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.2em] mt-1">
              Verify details, room categories, and rooms before approval
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingReviewOpen(false);
              setPendingReviewData(null);
              setPendingReviewId(null);
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar p-6 space-y-6">
          {pendingReviewLoading && (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-[#E2E8F0] border-t-[#B88E2F] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading full request…</p>
            </div>
          )}
          {pendingReviewError && !pendingReviewLoading && (
            <p className="text-sm font-bold text-[#B91C1C]">{pendingReviewError}</p>
          )}
          {pendingReviewData && !pendingReviewLoading && (
            <>
              <div className="border border-[#E2E8F0] rounded-lg p-5 space-y-2">
                <h3 className="text-sm font-black text-[#1B2B41] uppercase">{pendingReviewData.hotel?.name}</h3>
                <p className="text-[11px] text-[#64748B]">
                  {pendingReviewData.hotel?.city}, {pendingReviewData.hotel?.country}
                </p>
                <p className="text-[11px] text-[#1B2B41] normal-case whitespace-pre-wrap">{pendingReviewData.hotel?.address}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-2">
                  <p><span className="font-bold text-[#94A3B8]">Phone:</span> {pendingReviewData.hotel?.phone || '—'}</p>
                  <p><span className="font-bold text-[#94A3B8]">Email:</span> {pendingReviewData.hotel?.email || '—'}</p>
                  <p className="md:col-span-2"><span className="font-bold text-[#94A3B8]">Description:</span> {pendingReviewData.hotel?.description || '—'}</p>
                </div>
                <div className="pt-3 border-t border-[#F1F5F9] text-[11px]">
                  <p className="font-bold text-[#94A3B8] uppercase tracking-widest text-[9px] mb-1">Owner</p>
                  <p>{pendingReviewData.hotel?.owner_name} — {pendingReviewData.hotel?.owner_email}</p>
                  {pendingReviewData.hotel?.owner_phone && (
                    <p className="text-[#64748B]">{pendingReviewData.hotel.owner_phone}</p>
                  )}
                </div>
                <p className="text-[10px] text-[#108548] font-bold pt-2">
                  Listing agreement accepted:{' '}
                  {pendingReviewData.hotel?.listing_contract_accepted ? 'Yes' : 'No'}
                  {pendingReviewData.hotel?.listing_contract_accepted_at &&
                    ` (${new Date(pendingReviewData.hotel.listing_contract_accepted_at).toLocaleString()})`}
                </p>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-3">Room categories &amp; prices</h4>
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Base price (NPR)</th>
                        <th className="px-4 py-2">Max guests</th>
                        <th className="px-4 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pendingReviewData.roomTypes || []).map((rt) => (
                        <tr key={rt.id} className="border-t border-[#E2E8F0]">
                          <td className="px-4 py-2 font-bold text-[#1B2B41]">{rt.name}</td>
                          <td className="px-4 py-2">NPR {Number(rt.base_price).toLocaleString()}</td>
                          <td className="px-4 py-2">{rt.max_occupancy}</td>
                          <td className="px-4 py-2 normal-case text-[#64748B]">{rt.description || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.2em] mb-3">Physical rooms</h4>
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F8FAFC] text-[#64748B] uppercase tracking-wider text-[9px]">
                      <tr>
                        <th className="px-4 py-2">Room #</th>
                        <th className="px-4 py-2">Floor</th>
                        <th className="px-4 py-2">Category</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pendingReviewData.rooms || []).map((r) => (
                        <tr key={r.id} className="border-t border-[#E2E8F0]">
                          <td className="px-4 py-2 font-bold">{r.room_number}</td>
                          <td className="px-4 py-2">{r.floor ?? '—'}</td>
                          <td className="px-4 py-2">{r.type_name}</td>
                          <td className="px-4 py-2 uppercase text-[10px]">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => pendingReviewId && handleDeletePendingHotel(pendingReviewId)}
                  className="px-6 py-3 bg-[#B91C1C] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm"
                >
                  Delete request
                </button>
                <button
                  type="button"
                  onClick={() => pendingReviewId && handleVerifyHotel(pendingReviewId)}
                  className="px-6 py-3 bg-[#108548] text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-sm"
                >
                  Approve hotel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingReviewModal;
