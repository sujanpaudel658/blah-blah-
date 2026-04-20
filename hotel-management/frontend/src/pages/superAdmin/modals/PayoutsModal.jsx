import React from 'react';

const PayoutsModal = ({
  showPayoutsModal,
  setShowPayoutsModal,
  payoutsLoading,
  payoutRequests,
  handleApprovePayout,
  handleRejectPayout
}) => {
  if (!showPayoutsModal) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent p-4 sm:p-6 fade-in"
      onClick={() => setShowPayoutsModal(false)}
      role="presentation"
    >
      <div
        className="bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-xl flex flex-col shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#108548] px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Hotel Payout Management</h2>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.2em] mt-1">Review and fulfill withdrawal requests from properties</p>
          </div>
          <button onClick={() => setShowPayoutsModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-6">
          {payoutsLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#108548] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading requests...</p>
            </div>
          ) : payoutRequests.length > 0 ? (
            <div className="space-y-4">
              {payoutRequests.map((req) => (
                <div key={req.id} className="bg-[#F0FCF5] border border-[#DCFCE7] rounded-lg p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-[#1B2B41] uppercase mb-1">{req.hotel_name}</h3>
                    <div className="flex gap-4 items-center">
                      <span className="text-[10px] bg-white border border-[#DCFCE7] px-2 py-0.5 rounded font-bold text-[#64748B]">Current Balance: Rs. {Number(req.current_balance).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-[#64748B] italic mt-3">" {req.notes} "</p>
                    <p className="text-[10px] text-[#94A3B8] mt-4 uppercase tracking-widest">Requested on: {new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 min-w-[200px]">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">Payout Amount</p>
                      <p className="text-xl font-black text-[#108548]">NRS {Number(req.amount).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => handleRejectPayout(req.id)}
                        className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-wider rounded hover:bg-gray-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprovePayout(req.id)}
                        className="flex-1 px-4 py-2 bg-[#1B2B41] text-[#C4993E] text-[10px] font-bold uppercase tracking-wider rounded hover:bg-[#263345] transition-colors shadow-sm"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-200 mb-4">account_balance</span>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-[0.2em]">No pending payout requests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayoutsModal;
