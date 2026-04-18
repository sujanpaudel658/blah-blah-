const express = require('express');
const router = express.Router();
const db = require('../config/db');
const {
    initiatePayment,
    initiatePayOnlineForBooking,
    verifyPayment,
    refundPayment,
    cancelBooking,
    manualConfirmBooking,
    checkInBooking,
    checkOutBooking,
    extendStay,
    generateQRToken,
    scanCheckIn,
    getPendingRefunds,
    confirmRefund,
    rejectRefund,
    requestPayout,
    getPendingPayouts,
    approvePayout,
    rejectPayout,
    updateBookingGuestDetails,
    updateBookingNumGuests,
    rescheduleBooking
} = require('../controllers/paymentController');
const { protect, requireRole } = require('../middleware/auth');
const { checkBanStatus } = require('../services/noShow.service');

router.post('/initiate', protect, checkBanStatus, initiatePayment);

router.post('/pay-online', protect, checkBanStatus, initiatePayOnlineForBooking);

router.post('/verify', verifyPayment);

router.post('/refund', protect, requireRole(['admin', 'superadmin']), refundPayment);

router.post('/cancel', protect, cancelBooking);

router.post('/confirm-manual', protect, requireRole(['admin', 'superadmin']), manualConfirmBooking);

router.post('/check-in', protect, requireRole(['admin', 'superadmin']), checkInBooking);

router.post('/check-out', protect, requireRole(['admin', 'superadmin']), checkOutBooking);

router.post('/extend-stay', protect, checkBanStatus, extendStay);

router.patch('/booking/guest-details', protect, updateBookingGuestDetails);
router.patch('/booking/num-guests', protect, updateBookingNumGuests);
router.patch('/booking/reschedule', protect, rescheduleBooking);

router.get('/qr-token/:bookingId', protect, generateQRToken);
router.post('/scan-checkin', protect, requireRole(['admin', 'superadmin']), scanCheckIn);

router.get('/refund/pending', protect, requireRole(['superadmin']), getPendingRefunds);
router.post('/refund/approve', protect, requireRole(['superadmin']), confirmRefund);
router.post('/refund/reject', protect, requireRole(['superadmin']), rejectRefund);

router.post('/payout/request', protect, requireRole(['admin']), requestPayout);
router.get('/payout/pending', protect, requireRole(['superadmin']), getPendingPayouts);
router.post('/payout/approve', protect, requireRole(['superadmin']), approvePayout);
router.post('/payout/reject', protect, requireRole(['superadmin']), rejectPayout);

router.get('/hotel/:hotelId', protect, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const { hotelId } = req.params;

        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotelId)) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this hotel' });
        }

        const [bookings] = await db.query(
            `SELECT b.*, r.room_number, rt.name as room_type, u.full_name as guest_user_name, p.payment_method,
                    bgd.guest_name, bgd.guest_email, bgd.guest_phone, bgd.special_requests
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             LEFT JOIN users u ON b.user_id = u.id
             LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
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

router.get('/reference/:reference', protect, requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const { reference } = req.params;
        const [bookings] = await db.query(
            `SELECT b.*, r.room_number, rt.name as room_type, h.name as hotel_name,
                    bgd.guest_name, bgd.guest_email, bgd.guest_phone, bgd.special_requests
             FROM bookings b
             JOIN rooms r ON b.room_id = r.id
             JOIN room_types rt ON r.room_type_id = rt.id
             JOIN hotels h ON b.hotel_id = h.id
             LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
             WHERE b.booking_reference = ?`,
            [reference]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        const booking = bookings[0];

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
