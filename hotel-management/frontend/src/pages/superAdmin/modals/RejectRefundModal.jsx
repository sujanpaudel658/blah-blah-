import React from 'react';
import { REFUND_REJECTION_REASONS } from '../constants';

const RejectRefundModal = ({
  showRefundsModal,
  refundRejectTarget,
  setRefundRejectTarget,
  rejectCategory,
  setRejectCategory,
  rejectExtraNotes,
  setRejectExtraNotes,
  submitRejectRefund
}) => {
  if (!showRefundsModal || !refundRejectTarget) return null;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-transparent p-4"
      onClick={() => setRefundRejectTarget(null)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)] border border-slate-200/90 ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reject-refund-title"
        aria-modal="true"
      >
        <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4">
          <h3 id="reject-refund-title" className="text-sm font-bold uppercase tracking-[0.12em] text-[#1B2B41]">
            Reject refund request
          </h3>
          <p className="mt-1 text-[11px] text-[#64748B]">
            Booking <span className="font-mono font-semibold">{refundRejectTarget.booking_reference}</span> ·{' '}
            {refundRejectTarget.guest_name}
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Reason category
            </label>
            <select
              value={rejectCategory}
              onChange={(e) => setRejectCategory(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-[13px] font-medium text-[#1B2B41] outline-none focus:border-[#B91C1C]/50 focus:ring-2 focus:ring-[#B91C1C]/15"
            >
              <option value="">— Select a reason —</option>
              {REFUND_REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Additional details for the guest (optional)
            </label>
            <textarea
              value={rejectExtraNotes}
              onChange={(e) => setRejectExtraNotes(e.target.value)}
              rows={4}
              placeholder="Explain the decision or any next steps…"
              className="w-full resize-y rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1B2B41] placeholder:text-[#94A3B8] outline-none focus:border-[#B91C1C]/50 focus:ring-2 focus:ring-[#B91C1C]/15"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRefundRejectTarget(null)}
              className="flex-1 rounded-lg border border-[#E2E8F0] py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#64748B] transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRejectRefund}
              className="flex-1 rounded-lg bg-[#B91C1C] py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#991B1B]"
            >
              Confirm rejection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectRefundModal;
