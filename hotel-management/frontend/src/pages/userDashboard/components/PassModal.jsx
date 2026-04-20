import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const PassModal = ({
  showPassModal,
  selectedPass,
  passRoomIndex,
  setPassRoomIndex,
  qrToken,
  setShowPassModal
}) => {
  if (!showPassModal || !selectedPass) return null;

  const passSlots = selectedPass._groupBookings?.length ? selectedPass._groupBookings : [selectedPass];
  const passSlot = passSlots[Math.min(passRoomIndex, passSlots.length - 1)];

  return (
    <div className="fixed inset-0 bg-[#111B2B]/95 flex items-center justify-center z-[1000] p-6 fade-in">
      <div className="max-w-md w-full bg-white border border-[#E2E2E2] rounded-sm shadow-2xl overflow-hidden">
        <div className="bg-[#1B2B41] px-10 py-8 border-b-4 border-[#B88E2F]">
          <h3 className="text-white text-lg font-bold uppercase tracking-[0.2em]">{selectedPass.hotel_name}</h3>
          <p className="text-[9px] text-[#A0AEC0] font-bold uppercase tracking-[0.3em] mt-2">Official Hotel Entry Pass</p>
        </div>

        <div className="p-10 space-y-10">
          {passSlots.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {passSlots.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPassRoomIndex(i)}
                  className={`px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg border-2 transition-all ${
                    i === passRoomIndex
                      ? 'border-[#B88E2F] bg-[#B88E2F]/10 text-[#1B2B41]'
                      : 'border-[#E2E2E2] text-[#64748B] hover:border-[#94A3B8]'
                  }`}
                >
                  Room {s.room_number || i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-10">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Holder</span>
              <p className="text-xs font-bold text-[#1B2B41] uppercase">{passSlot.guest_name}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Unit Allocation</span>
              <p className="text-xs font-bold text-[#B88E2F] uppercase">{passSlot.room_number || 'PENDING'}</p>
            </div>
          </div>

          <div className="py-6 border-y border-[#F1F1F1] grid grid-cols-2 gap-10">
            <div className="space-y-1">
              <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">Start Date</span>
              <p className="text-xs font-bold text-[#1B2B41]">{new Date(passSlot.check_in_date).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[8px] font-bold text-[#A0AEC0] uppercase tracking-widest block">End Date</span>
              <p className="text-xs font-bold text-[#1B2B41]">{new Date(passSlot.check_out_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex flex-col items-center py-6">
            <div className="p-6 bg-[#F9FAFB] border border-[#E2E2E2] rounded-sm">
              {qrToken ? (
                <QRCodeCanvas
                  value={qrToken}
                  size={160} level={"H"} fgColor="#1B2B41"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-slate-100 animate-pulse text-[10px] font-bold text-slate-400">
                  GENERATING SECURE KEY...
                </div>
              )}
            </div>
            <p className="text-[9px] font-bold text-[#1B2B41] mt-6 uppercase tracking-[0.3em] font-mono">{passSlot.booking_reference}</p>
          </div>

          <button
            type="button"
            onClick={() => { setShowPassModal(false); setPassRoomIndex(0); }}
            className="w-full py-5 bg-[#1B2B41] text-white text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-[#2D3748] transition-all rounded-xl shadow-lg"
          >
            Close Pass
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassModal;
