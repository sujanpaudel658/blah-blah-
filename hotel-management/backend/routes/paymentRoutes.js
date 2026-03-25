const express = require('express');
const router = express.Router();
const {
    initiatePayment,
    verifyPayment,
    refundPayment,
    cancelBooking,
    manualConfirmBooking,
    checkInBooking,
    checkOutBooking,
    generateQRToken,
    scanCheckIn
} = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/auth');
const db = require('../config/db');

// Initiate Khalti Payment (Requires Auth)
router.post('/initiate', protect, initiatePayment);

// Verify Khalti Payment
router.post('/verify', verifyPayment);

// Refund Khalti Payment (Admin only)
router.post('/refund', protect, requireRole(['admin', 'superadmin']), refundPayment);

// Cancel Booking (Admin/User)
router.post('/cancel', protect, cancelBooking);

// Manual Confirm (Admin only)
router.post('/confirm-manual', protect, requireRole(['admin', 'superadmin']), manualConfirmBooking);

// Check-In Booking (Admin only)
router.post('/check-in', protect, requireRole(['admin', 'superadmin']), checkInBooking);

// Check-Out Booking (Admin only)
router.post('/check-out', protect, requireRole(['admin', 'superadmin']), checkOutBooking);

// QR Check-In Endpoints
router.get('/qr-token/:bookingId', protect, generateQRToken);
router.post('/scan-checkin', protect, requireRole(['admin', 'superadmin']), scanCheckIn);

// Get bookings for a specific hotel (Admin only)
router.get('/hotel/:hotelId', protect, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const { hotelId } = req.params;

        // Verify if admin has access to this hotel
        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotelId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this hotel' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, r.room_number, rt.name as room_type, u.full_name as guest_user_name, p.payment_method
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             LEFT JOIN users u ON b.user_id = u.id
             LEFT JOIN payments p ON b.id = p.booking_id
             WHERE b.hotel_id = ?
             GROUP BY b.id
             ORDER BY b.created_at DESC`,
            [hotelId]
        );

        res.json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error('Fetch hotel bookings error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }
});

// Get booking by reference (Admin only)
router.get('/reference/:reference', protect, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const { reference } = req.params;
        const [bookings] = await db.query(
            `SELECT b.*, r.room_number, rt.name as room_type, h.name as hotel_name
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             JOIN hotels h ON b.hotel_id = h.id
             WHERE b.booking_reference = ?`,
            [reference]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Check ownership
        if (req.user.role === 'admin' && req.user.hotel_id !== booking.hotel_id) {
            return res.status(403).json({ success: false, message: 'This booking belongs to another property' });
        }

        res.json({ success: true, booking });
    } catch (error) {
        console.error('Fetch booking by reference error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
