import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const ReceiptRow = ({ label, value, valueClassName = '' }) => (
  <div className="receipt-row flex justify-between items-start gap-2 w-full">
    <span className="shrink-0">{label}</span>
    <span className={`receipt-row-value font-bold text-right break-all min-w-0 flex-1 ${valueClassName}`}>
      {value}
    </span>
  </div>
);

const BillModal = ({ showBillModal, selectedBill, contentRef, handlePrint, setShowBillModal }) => {
  if (!showBillModal || !selectedBill) return null;

  const nightsLine = `${selectedBill.total_nights} Nights x NRS ${Number(
    selectedBill.price_per_night ||
      (selectedBill.total_amount + Number(selectedBill.loyalty_discount || 0)) / selectedBill.total_nights
  ).toLocaleString()}`;

  return (
    <div className="fixed inset-0 bg-[#111B2B]/90 flex items-center justify-center z-[1000] p-6 fade-in overflow-y-auto print:hidden">
      <div className="max-w-4xl w-full bg-white border border-[#E2E2E2] flex flex-col md:flex-row shadow-2xl rounded-sm">
        <div className="flex-1 bg-[#F5F3EF] p-6 md:p-12 overflow-y-auto rounded-l-2xl flex justify-center">
          <div
            ref={contentRef}
            className="receipt-print-root w-full max-w-[380px] bg-white border border-[#E2E2E2] shadow-sm p-8 md:p-10 rounded-xl box-border overflow-visible"
          >
            <div className="font-mono text-[11px] text-[#1B2B41] leading-relaxed w-full overflow-visible">
              <div className="text-center space-y-2 mb-8 border-b border-dashed border-[#E2E2E2] pb-6">
                <span className="text-[9px] font-bold text-[#B88E2F] uppercase block">Official Statement</span>
                <h1 className="text-lg font-bold uppercase break-words">{selectedBill.hotel_name}</h1>
                <p className="text-[9px] text-[#64748B] uppercase break-words">
                  {selectedBill.hotel_city}, NEPAL
                </p>
                <p className="text-[10px] font-bold uppercase py-2 bg-[#F9FAFB] border-y border-dashed border-[#E2E2E2]">
                  *** GUEST COPY ***
                </p>
              </div>

              <div className="space-y-2 mb-6 uppercase">
                <ReceiptRow label="REF NO:" value={selectedBill.booking_reference} />
                <ReceiptRow label="DATE:" value={new Date().toLocaleDateString()} valueClassName="font-normal" />
                <ReceiptRow label="TIME:" value={new Date().toLocaleTimeString()} valueClassName="font-normal" />
              </div>

              <div className="border-t border-dashed border-[#E2E2E2] pt-6 space-y-4 mb-8">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-[#A0AEC0] uppercase">Guest Entity</span>
                  <span className="font-bold uppercase break-words">{selectedBill.guest_name}</span>
                </div>
                {selectedBill._groupBookings?.length > 1 ? (
                  selectedBill._groupBookings.map((sub) => (
                    <div
                      key={sub.id}
                      className="border-t border-dashed border-[#E2E2E2] pt-4 space-y-2"
                    >
                      <span className="text-[8px] font-bold text-[#A0AEC0] uppercase block break-words">
                        {sub.room_type} · Room {sub.room_number || '—'}
                      </span>
                      <span className="text-[9px] text-[#64748B] block break-all">
                        {sub.total_nights} nights · {sub.booking_reference}
                      </span>
                      <ReceiptRow
                        label="AMOUNT:"
                        value={`NRS ${Number(sub.total_amount).toLocaleString()}`}
                      />
                    </div>
                  ))
                ) : (
                  <div className="border-t border-dashed border-[#E2E2E2] pt-4 space-y-2">
                    <span className="text-[8px] font-bold text-[#A0AEC0] uppercase block">
                      {selectedBill.room_type}
                    </span>
                    <span className="block break-words">{nightsLine}</span>
                    <ReceiptRow
                      label="AMOUNT:"
                      value={`NRS ${Number(
                        Number(selectedBill.total_amount) + Number(selectedBill.loyalty_discount || 0)
                      ).toLocaleString()}`}
                    />
                  </div>
                )}
                {selectedBill.loyalty_free_night === 1 && Number(selectedBill.loyalty_discount) > 0 && (
                  <ReceiptRow
                    label="LOYALTY:"
                    value={`-NRS ${Number(selectedBill.loyalty_discount).toLocaleString()}`}
                    valueClassName="text-green-600"
                  />
                )}
              </div>

              <div className="border-t border-[#1B2B41] pt-4 space-y-2">
                <ReceiptRow
                  label="TOTAL PRICE:"
                  value={`NRS ${Number(selectedBill.total_amount).toLocaleString()}`}
                  valueClassName="text-base"
                />
                <ReceiptRow
                  label="PAYMENT:"
                  value={(selectedBill.payment_method || 'KHALTI PAYMENT').toUpperCase()}
                  valueClassName="text-[10px] italic font-bold uppercase"
                />
                {selectedBill.loyalty_free_night === 1 && (
                  <ReceiptRow
                    label="LOYALTY:"
                    value="FREE NIGHT REDEEMED"
                    valueClassName="text-[10px] italic text-[#B88E2F] font-bold uppercase"
                  />
                )}
              </div>

              <div className="mt-10 pt-10 border-t border-dashed border-[#E2E2E2] text-center space-y-4">
                <div className="flex flex-col items-center">
                  <QRCodeCanvas value={selectedBill.booking_reference} size={80} fgColor="#1B2B41" />
                  <p className="text-[8px] mt-2 font-bold text-[#A0AEC0] break-all px-2">
                    {selectedBill.booking_reference}
                  </p>
                  <p className="text-[8px] font-bold text-[#A0AEC0]">VERIFIED BY STAYNEPAL</p>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-tight italic">
                  Booking Complete. Safe Travels.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:w-72 bg-[#1B2B41] p-10 flex flex-col justify-center gap-6 rounded-r-2xl print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-4 bg-[#B88E2F] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#9E7A28] rounded-xl transition-all shadow-lg"
          >
            Print Receipt
          </button>
          <button
            type="button"
            onClick={() => setShowBillModal(false)}
            className="w-full py-4 border border-[#2D4361] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/5 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
