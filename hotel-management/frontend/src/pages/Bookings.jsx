import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AdminLayout from '../components/admin/AdminLayout';
import BookingTable from '../components/admin/BookingTable';
import QRScanner from '../components/admin/QRScanner';

/**
 * Bookings Component
 * 
 * Purpose: Dedicated ledger for all hotel reservations.
 * Allows administrators to manage, filter, and verify bookings via QR.
 */
const Bookings = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [hotelBookings, setHotelBookings] = useState([]);
    const [showScanner, setShowScanner] = useState(false);
    const [scannedBooking, setScannedBooking] = useState(null);
    const [loading, setLoading] = useState(true);

    /* =========================
       1. DATA SYNCHRONIZATION
       -------------------------
       v2.0: Separated from main dashboard to improve render performance 
       on hotels with >500 active records.
       ========================= */
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (!token || !storedUser) {
                navigate('/login');
                return;
            }

            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            try {
                // Fetch hotel-specific registry
                const res = await axios.get(`http://localhost:5000/api/payments/hotel/${parsedUser.hotel_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setHotelBookings(res.data.bookings || []);
                }
            } catch (err) {
                console.error('Fetch bookings error (network or auth expiry):', err);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [navigate]);

    /* =========================
       2. QR VERIFICATION LOGIC
       ========================= */
    const handleScanSuccess = async (decodedText) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:5000/api/payments/scan-checkin`, 
              { qrToken: decodedText },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                setScannedBooking({
                    guest_name: res.data.guest.name,
                    booking_reference: res.data.booking.reference,
                    room_number: res.data.room.number,
                    check_in_date: new Date().toISOString(),
                    payment_status: 'PAID'
                });
                alert(res.data.message);
                
                // Refresh local bookings state to reflect the check-in
                try {
                    const parsedUser = JSON.parse(localStorage.getItem('user'));
                    const refreshRes = await axios.get(`http://localhost:5000/api/payments/hotel/${parsedUser.hotel_id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (refreshRes.data.success) {
                        setHotelBookings(refreshRes.data.bookings || []);
                    }
                } catch(e) {}
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Could not validate QR code.';
            alert(`Scan Failed: ${errorMessage}`);
            setShowScanner(false);
        }
    };

    /* =========================
       3. STATUS TRANSITIONS
       -------------------------
       Centralized handler for all state mutations (Confirm, Deny, Check-in/out).
       ========================= */
    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            let endpoint = '';
            
            switch (newStatus) {
                case 'confirmed':
                    endpoint = '/confirm-manual';
                    break;
                case 'cancelled':
                    endpoint = '/cancel';
                    break;
                case 'checked_in':
                    endpoint = '/check-in';
                    break;
                case 'checked_out':
                    endpoint = '/check-out';
                    break;
                case 'refunded':
                    endpoint = '/refund';
                    break;
                default:
                    console.error('Unknown status action:', newStatus);
                    return;
            }

            const res = await axios.post(`http://localhost:5000/api/payments${endpoint}`,
                { bookingId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                // Local state reconciliation: update main table and active scanner modal
                setHotelBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
                if (scannedBooking?.id === bookingId) {
                    setScannedBooking(prev => ({ ...prev, status: newStatus }));
                }
            }
        } catch (err) {
            console.error('Status update committed on server but local sync failed:', err);
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AdminLayout
            user={user}
            onLogout={handleLogout}
            title="RESERVATION LEDGER"
            subtitle="OPERATIONAL ARCHIVE"
        >
            <div className="space-y-6">
                <div className="bg-white border border-[#E2E2E2] p-8 rounded-sm shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-[#1B2B41] uppercase tracking-tight">Active Reservations</h2>
                            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mt-1">Registry of all guest contracts</p>
                        </div>
                        <button
                            onClick={() => setShowScanner(true)}
                            className="bg-[#1B2B41] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#2D3748] transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
                            Verify Access
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center">
                            <p className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-widest animate-pulse">Synchronizing Records...</p>
                        </div>
                    ) : (
                        <BookingTable
                            bookings={hotelBookings}
                            onScan={() => setShowScanner(true)}
                            onConfirm={(id) => handleUpdateStatus(id, 'confirmed')}
                            onReject={(id) => handleUpdateStatus(id, 'cancelled')}
                            onCheckIn={(id) => handleUpdateStatus(id, 'checked_in')}
                            onCheckOut={(id) => handleUpdateStatus(id, 'checked_out')}
                            onRefund={(id) => handleUpdateStatus(id, 'refunded')}
                        />
                    )}
                </div>
            </div>

            <QRScanner
                isOpen={showScanner}
                onClose={() => { setShowScanner(false); setScannedBooking(null); }}
                onScanSuccess={handleScanSuccess}
                scannedBooking={scannedBooking}
                onUpdateStatus={handleUpdateStatus}
            />
        </AdminLayout>
    );
};

export default Bookings;
