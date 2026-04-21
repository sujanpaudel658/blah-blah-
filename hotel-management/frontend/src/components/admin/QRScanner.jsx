import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ isOpen, onClose, onScanSuccess, scannedBooking }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        if (isOpen && !scannedBooking) {
            setTimeout(() => {
                try {
                    const scanner = new Html5QrcodeScanner(
                        "reader",
                        {
                            fps: 20,
                            qrbox: (viewfinderWidth, viewfinderHeight) => {
                                return {
                                    width: Math.min(viewfinderWidth * 0.75, 300),
                                    height: Math.min(viewfinderHeight * 0.75, 300)
                                };
                            },
                            aspectRatio: 1.0,
                        },
                        false
                    );
                    scanner.render(onScanSuccess, (err) => { });
                    scannerRef.current = scanner;
                } catch (err) {
                    console.error("Scanner init error:", err);
                }
            }, 100);
        }

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (e) { }
            }
        };
    }, [isOpen, scannedBooking, onScanSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-[#111B2B]/80 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-sm overflow-hidden shadow-xl border border-[#E2E2E2] fade-in">
                <div className="bg-[#1B2B41] px-6 py-4 flex items-center justify-between text-white">
                    <div>
                        <h3 className="text-base font-bold uppercase tracking-widest">Authentication Terminal</h3>
                        <p className="text-[10px] text-[#A0AEC0] mt-0.5 font-bold uppercase tracking-widest leading-none">Scanning Security Protocol</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                <div className="p-8">
                    {!scannedBooking ? (
                        <div className="space-y-6">
                            <div
                                id="reader"
                                className="border border-[#E2E2E2] bg-[#F9FAFB] min-h-[300px]"
                            ></div>
                            <div className="text-center">
                                <span className="text-xs font-bold text-[#1B2B41] uppercase tracking-widest">Awaiting Valid Input</span>
                                <p className="text-[11px] text-[#64748B] mt-1 font-medium">Position the digital pass QR code within the highlighted boundaries.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-5 border border-[#E7F3ED] bg-[#F9FAFB] flex items-center gap-4">
                                <div className="w-10 h-10 bg-[#108548] text-white flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-lg">verified</span>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-[#108548] uppercase tracking-widest leading-none mb-1">Status: Verified</p>
                                    <h4 className="text-lg font-bold text-[#1B2B41]">{scannedBooking.guest_name}</h4>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-px bg-[#E2E2E2] border border-[#E2E2E2]">
                                <div className="bg-white p-4">
                                    <span className="admin-label mb-1">Booking Reference</span>
                                    <p className="text-xs font-bold text-[#1B2B41]">{scannedBooking.booking_reference}</p>
                                </div>
                                <div className="bg-white p-4">
                                    <span className="admin-label mb-1">Allocated Unit</span>
                                    <p className="text-xs font-bold text-[#B88E2F]">UNIT {scannedBooking.room_number || 'TBD'}</p>
                                </div>
                                <div className="bg-white p-4">
                                    <span className="admin-label mb-1">Check-in Date</span>
                                    <p className="text-xs font-bold text-[#1B2B41]">{new Date(scannedBooking.check_in_date).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-white p-4">
                                    <span className="admin-label mb-1">Account Sync</span>
                                    <div className="flex gap-1.5 mt-1">
                                        <span className={`status-badge border ${scannedBooking.payment_status === 'paid' ? 'bg-[#E7F3ED] text-[#108548] border-[#E7F3ED]' : 'bg-[#FFF8E6] text-[#A36B00] border-[#FFF8E6]'}`}>
                                            {scannedBooking.payment_status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 admin-button admin-button-primary h-11"
                                >
                                    CONFIRM AND DISMISS
                                </button>
                                <button
                                    onClick={() => { /* Logic to Reset if needed */ }}
                                    className="admin-button admin-button-secondary h-11 px-4"
                                >
                                    <span className="material-symbols-outlined text-lg">refresh</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-[#F9FAFB] px-8 py-3 border-t border-[#F1F1F1] flex justify-center">
                    <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-[0.2em]">Secure Terminal Version 4.2.0</span>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
