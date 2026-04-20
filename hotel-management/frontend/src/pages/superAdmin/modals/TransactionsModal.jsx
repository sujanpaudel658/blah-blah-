import React from 'react';
import { getPaymentStatusStyle } from '../transactionHelpers';

const TransactionsModal = ({
  showTransactionsModal,
  setShowTransactionsModal,
  transactionsLoading,
  transactionsData,
  txSearchQuery,
  setTxSearchQuery,
  txFilterStatus,
  setTxFilterStatus,
  filteredTransactions
}) => {
  if (!showTransactionsModal) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999] bg-transparent p-4 sm:p-6 fade-in"
      onClick={() => setShowTransactionsModal(false)}
      role="presentation"
    >
      <div
        className="bg-white max-w-6xl w-full max-h-[90vh] overflow-hidden rounded-xl flex flex-col shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1A2332] px-8 py-6 flex items-center justify-between text-white shrink-0">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-[0.15em]">Transaction Logs</h2>
            <p className="text-[10px] text-[#A0AEC0] font-bold uppercase tracking-[0.2em] mt-1">All Payment Records</p>
          </div>
          <button onClick={() => setShowTransactionsModal(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {transactionsLoading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#C4993E] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Loading transactions...</p>
            </div>
          ) : transactionsData ? (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-6 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#1B2B41]">{transactionsData.summary.total || 0}</p>
                  <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#108548] font-mono">{transactionsData.summary.completed || 0}</p>
                  <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#A36B00] font-mono">{transactionsData.summary.pending || 0}</p>
                  <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#1A2332]">NRS {Number(transactionsData.summary.total_collected || 0).toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Gross Revenue</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#607AFB]">NRS {Number(transactionsData.summary.total_commission || 0).toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-[#607AFB] uppercase tracking-widest">System Fee (10%)</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-[#B91C1C]">NRS {Number(transactionsData.summary.total_refunded || 0).toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-widest">Refunded</p>
                </div>
              </div>

              <div className="p-4 border-b border-[#E2E8F0] flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">search</span>
                  <input
                    type="text"
                    placeholder="Search by guest, ref, or hotel..."
                    className="bg-[#F9FAFB] border border-[#E2E2E2] rounded px-9 py-2 text-xs w-full outline-none focus:border-[#1B2B41]"
                    value={txSearchQuery}
                    onChange={(e) => setTxSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  {['all', 'completed', 'pending', 'refunded'].map(s => (
                    <button
                      key={s}
                      onClick={() => setTxFilterStatus(s)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
                        txFilterStatus === s
                          ? 'bg-[#1B2B41] text-white border-[#1B2B41]'
                          : 'bg-white text-[#64748B] border-[#E2E2E2] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Guest</th>
                      <th>Hotel</th>
                      <th>Reference</th>
                      <th>Gross</th>
                      <th>Net Fee</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length > 0 ? filteredTransactions.map((tx, i) => (
                      <tr key={i}>
                        <td className="font-mono text-[10px] text-[#94A3B8]">#{tx.payment_id}</td>
                        <td>
                          <div className="font-bold text-[#1B2B41] text-[11px]">{tx.guest_name}</div>
                          <div className="text-[9px] text-[#94A3B8]">{tx.guest_email}</div>
                        </td>
                        <td className="text-[11px]">{tx.hotel_name}</td>
                        <td className="font-mono text-[10px] text-[#64748B]">{tx.booking_reference}</td>
                        <td className="font-bold text-[#1B2B41]">NRS {Number(tx.amount).toLocaleString()}</td>
                        <td className="font-bold text-[#607AFB]">NRS {Number(tx.commission_amount || 0).toLocaleString()}</td>
                        <td className="text-[10px] uppercase font-bold text-[#64748B]">{tx.payment_method || 'khalti'}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${getPaymentStatusStyle(tx.payment_status)}`}>
                            {tx.payment_status}
                          </span>
                        </td>
                        <td className="text-[10px] text-[#64748B]">{new Date(tx.payment_date).toLocaleDateString()}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="9" className="text-center py-10 text-[#94A3B8] italic text-xs">
                          No transactions matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center"><p className="text-xs text-[#94A3B8]">No transaction data available.</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionsModal;
