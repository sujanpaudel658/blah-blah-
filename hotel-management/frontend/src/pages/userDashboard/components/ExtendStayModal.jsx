import React from 'react';

const ExtendStayModal = ({
  showExtendModal,
  extendTarget,
  extendNights,
  setExtendNights,
  extendMethod,
  setExtendMethod,
  extendSubmitting,
  setShowExtendModal,
  setExtendTarget,
  handleExtendStay
}) => {
  if (!showExtendModal || !extendTarget) return null;

  return (
    <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
      <div className="max-w-md w-full bg-white border border-[#E2E2E2] rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#1B2B41] px-8 py-6 border-b-4 border-[#B88E2F]">
          <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em]">Extend your stay</h3>
          <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-widest mt-2">
            Available from your scheduled check-out while you remain checked in
          </p>
        </div>
        <div className="p-8 space-y-6">
          <p className="text-[11px] text-[#64748B] leading-relaxed">
            {extendTarget.hotel_name} — Room {extendTarget.room_number}. Extra nights use your current nightly rate;
          </p>
          <div>
            <label className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest block mb-2">Additional nights (1–90)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={extendNights}
              onChange={(e) => setExtendNights(Math.min(90, Math.max(1, parseInt(e.target.value, 10) || 1)))}
              className="w-full border border-[#E2E2E2] rounded-xl px-4 py-3 text-sm font-bold text-[#1B2B41]"
            />
          </div>
          <p className="text-xs font-bold text-[#1B2B41]">
            Estimated extension: NRS {Math.round(Number(extendTarget.price_per_night) * Number(extendNights) * 100) / 100}
          </p>
          <div className="space-y-3">
            <p className="text-[9px] font-bold text-[#A0AEC0] uppercase tracking-widest">Payment</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="extendPay" checked={extendMethod === 'khalti'} onChange={() => setExtendMethod('khalti')} />
              <span className="text-[11px] font-bold text-[#1B2B41]">Khalti (online)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="extendPay" checked={extendMethod === 'cash'} onChange={() => setExtendMethod('cash')} />
              <span className="text-[11px] font-bold text-[#1B2B41]">Pay at hotel (cash)</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowExtendModal(false); setExtendTarget(null); }}
              className="flex-1 py-4 border border-[#E2E2E2] text-[10px] font-bold uppercase tracking-widest rounded-xl text-[#64748B]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={extendSubmitting}
              onClick={handleExtendStay}
              className="flex-1 py-4 bg-[#3B5BA9] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#2d4780] disabled:opacity-50"
            >
              {extendSubmitting ? '…' : extendMethod === 'khalti' ? 'Continue to pay' : 'Confirm extension'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtendStayModal;
