import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const BillModal = ({ showBillModal, selectedBill, contentRef, handlePrint, setShowBillModal }) => {
  if (!showBillModal || !selectedBill) return null;

  return (
    <div className="fixed inset-0 bg-[#111B2B]/90 flex items-center justify-center z-[1000] p-6 fade-in overflow-y-auto">
      <div className="max-w-4xl w-full bg-white border border-[#E2E2E2] flex flex-col md:flex-row shadow-2xl rounded-sm">
        <div className="flex-1 bg-[#F5F3EF] p-12 overflow-y-auto rounded-l-2xl">
          <div className="max-w-[400px] mx-auto bg-white border border-[#E2E2E2] shadow-sm p-10 rounded-xl">
            <div ref={contentRef} className="font-mono text-[11px] text-[#1B2B41] leading-relaxed">
              <div className="text-center space-y-2 mb-8 border-b border-dashed border-[#E2E2E2] pb-6">
                <span className="text-[9px] font-bold text-[#B88E2F] uppercase block">Official Statement</span>
                <h1 className="text-lg font-bold uppercase">{selectedBill.hotel_name}</h1>
                <p className="text-[9px] text-[#64748B] uppercase">{selectedBill.hotel_city}, NEPAL</p>
                <p className="text-[10px] font-bold uppercase py-2 bg-[#F9FAFB] border-y border-dashed border-[#E2E2E2]">*** GUEST COPY ***</p>
              </div>

              <div className="space-y-1 mb-6 uppercase">
                <div className="flex justify-between"><span>REF NO:</span><span className="font-bold">{selectedBill.booking_reference}</span></div>
                <div className="flex justify-between"><span>DATE:</span><span>{new Date().toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span>TIME:</span><span>{new Date().toLocaleTimeString()}</span></div>
              </div>

              <div className="border-t border-dashed border-[#E2E2E2] pt-6 space-y-4 mb-8">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase">Guest Entity</span>
                  <span className="font-bold uppercase">{selectedBill.guest_name}</span>
                </div>
                {selectedBill._groupBookings?.length > 1 ? (
                  selectedBill._groupBookings.map((sub) => (
                    <div key={sub.id} className="flex justify-between border-t border-dashed border-[#E2E2E2] pt-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-[#A0AEC0] uppercase block">{sub.room_type} · Room {sub.room_number || '—'}</span>
                        <span className="text-[9px] text-[#64748B]">{sub.total_nights} nights · {sub.booking_reference}</span>
                      </div>
                      <span className="font-bold">NRS {Number(sub.total_amount).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between border-t border-dashed border-[#E2E2E2] pt-4">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-[#A0AEC0] uppercase block">{selectedBill.room_type}</span>
                      <span>{selectedBill.total_nights} Nights x NRS {Number(selectedBill.price_per_night || (selectedBill.total_amount + Number(selectedBill.loyalty_discount || 0)) / selectedBill.total_nights).toLocaleString()}</span>
                    </div>
                    <span className="font-bold">NRS {Number(Number(selectedBill.total_amount) + Number(selectedBill.loyalty_discount || 0)).toLocaleString()}</span>
                  </div>
                )}
                {selectedBill.loyalty_free_night === 1 && Number(selectedBill.loyalty_discount) > 0 && (
                  <div className="flex justify-between border-t border-dashed border-[#E2E2E2] pt-4 text-green-600">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold uppercase block">★ LOYALTY REWARD</span>
                      <span>Free night discount (reservation)</span>
                    </div>
                    <span className="font-bold">-NRS {Number(selectedBill.loyalty_discount).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-[#1B2B41] pt-4 space-y-2">
                <div className="flex justify-between text-base font-bold"><span>TOTAL PRICE:</span><span>NRS {Number(selectedBill.total_amount).toLocaleString()}</span></div>
                <div className="flex justify-between text-[10px] italic"><span>PAYMENT:</span><span className="font-bold uppercase">{selectedBill.payment_method || 'KHALTI PAYMENT'}</span></div>
                {selectedBill.loyalty_free_night === 1 && (
                  <div className="flex justify-between text-[10px] italic text-[#B88E2F]"><span>LOYALTY:</span><span className="font-bold uppercase">FREE NIGHT REDEEMED</span></div>
                )}
              </div>

              <div className="mt-10 pt-10 border-t border-dashed border-[#E2E2E2] text-center space-y-8">
                <div className="flex flex-col items-center">
                  <QRCodeCanvas value={selectedBill.booking_reference} size={80} fgColor="#1B2B41" />
                  <p className="text-[8px] mt-2 font-bold text-[#A0AEC0]">VERIFIED BY STAYNEPAL</p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-tight italic">Booking Complete. Safe Travels.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-72 bg-[#1B2B41] p-10 flex flex-col justify-center gap-6 rounded-r-2xl">
          <button onClick={handlePrint} className="w-full py-4 bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#9E7A28] rounded-xl transition-all shadow-lg">
            Print Receipt
          </button>
          <button onClick={() => setShowBillModal(false)} className="w-full py-4 border border-[#2D4361] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/5 rounded-xl transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
