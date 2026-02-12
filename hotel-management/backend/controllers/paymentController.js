const axios = require('axios');
const db = require('../config/db');
const emailService = require('../services/email.service');

// Khalti Config
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

// Detect if it's a Live or Test key
const IS_LIVE = KHALTI_SECRET_KEY.toLowerCase().includes('live');

// Strict Auth Header Format: "Key <YOUR_SECRET_KEY>"
// If the key in .env already has "Key " or "Live ", we normalize it to "Key "
const RAW_KEY = KHALTI_SECRET_KEY.replace(/^(Key|Live)\s+/i, '');
const KHALTI_AUTH_HEADER = `Key ${RAW_KEY}`;

const KHALTI_A_BASE = 'https://a.khalti.com'; // Standard V2 base for initiate/lookup
const KHALTI_BASE = IS_LIVE ? 'https://khalti.com' : 'https://dev.khalti.com';

const KHALTI_INITIATE_URL = `${KHALTI_A_BASE}/api/v2/epayment/initiate/`;
const KHALTI_LOOKUP_URL = `${KHALTI_A_BASE}/api/v2/epayment/lookup/`;

// --- REUSABLE HELPERS ---

const initializeKhaltiPayment = async (details) => {
    const response = await axios.post(KHALTI_INITIATE_URL, details, {
        headers: {
            'Authorization': KHALTI_AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

/**
 * Common logic to process a refund through Khalti Merchant Transaction API
 */
const processKhaltiRefund = async (payment, remarks = 'Refund initiated') => {
    if (!payment.transaction_id) {
        throw new Error('Transaction ID missing. Payment must be verified before refund.');
    }

    const refundUrl = `${KHALTI_BASE}/api/v2/merchant-transaction/${payment.transaction_id}/refund/`;
    const refundResponse = await axios.post(refundUrl, {
        amount: Math.round(parseFloat(payment.amount) * 100), // paisa
        remarks: remarks
    }, {
        headers: {
            'Authorization': KHALTI_AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    });

    return refundResponse.data;
};

/**
 * Verifies a pending payment and updates it to completed if successful
 */
const verifyAndUpgradePayment = async (paymentId, pidx) => {
    try {
        const vRes = await axios.post(KHALTI_LOOKUP_URL, { pidx }, {
            headers: { 'Authorization': KHALTI_AUTH_HEADER, 'Content-Type': 'application/json' }
        });

        if (vRes.data.status === 'Completed') {
            await db.query(
                "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?",
                [vRes.data.transaction_id, paymentId]
            );
            const [updated] = await db.query("SELECT * FROM payments WHERE id = ?", [paymentId]);
            return updated[0];
        }
    } catch (e) {
        console.error(`Verification failed for payment ${paymentId}:`, e.message);
    }
    return null;
};

const initiatePayment = async (req, res) => {
    try {
        const { hotel_id, room_type_id, check_in_date, check_out_date, num_guests, customer_info, amount } = req.body;
        const user_id = req.user.id;

        if (!hotel_id || !room_type_id || !check_in_date || !check_out_date) {
            return res.status(400).json({ success: false, message: "Missing required booking details" });
        }

        /* 
           PRE-BOOKING VALIDATION PHASE
           ---------------------------- 
           Verify room availability and calculate stay duration before 
           touching the database or initiating payment.
        */

        // 1. Availability check: ensure no overlap with existing confirmed stays
        const [availableRooms] = await db.query(`
            SELECT r.id, r.room_number, rt.base_price, rt.name as type_name
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.hotel_id = ? 
            AND r.room_type_id = ? 
            AND r.status = 'available'
            AND r.id NOT IN (
                SELECT room_id FROM bookings 
                WHERE status IN ('confirmed', 'checked_in')
                AND (
                    (check_in_date < ? AND check_out_date > ?)
                )
            )
        `, [hotel_id, room_type_id, check_out_date, check_in_date]);

        if (availableRooms.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No rooms of this type are available for the selected dates. Please try another category or different dates."
            });
        }

        // 2. Select a room randomly from available ones
        // Logic: Distribute usage across identical units to prevent uneven wear and tear.
        const targetRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
        const room_id = targetRoom.id;

        const stayDuration = new Date(check_out_date) - new Date(check_in_date);
        const nights = Math.max(1, Math.ceil(stayDuration / (1000 * 60 * 60 * 24)));
        const expectedTotal = targetRoom.base_price * nights;

        // Strict Price Verification
        // SECURITY NOTE: Recalculate on server to prevent client-side tampering. 
        // We do not trust the 'amount' field sent directly from the frontend payload.
        if (Number(amount) !== expectedTotal) {
            return res.status(400).json({
                success: false,
                message: `Price validation failed. Expected: ${expectedTotal}, Received: ${amount}`
            });
        }

        /*
           PERSISTENCE & PAYMENT INITIATION
           --------------------------------
           Record the intent into our ledger before handing off to Khalti.
        */

        // Reference generation (BK- prefix kept for legacy accounting compatibility)
        const booking_ref = `BK-${Date.now()}`;
        const [bookingInsert] = await db.query(
            `INSERT INTO bookings (booking_reference, user_id, hotel_id, room_id, check_in_date, check_out_date, num_guests, total_nights, price_per_night, total_amount, status, payment_status, guest_name, guest_email, guest_phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)`,
            [booking_ref, user_id, hotel_id, room_id, check_in_date, check_out_date, num_guests || 1, nights, targetRoom.base_price, expectedTotal, customer_info.name, customer_info.email, customer_info.phone]
        );

        const bookingId = bookingInsert.insertId;

        // Safety check: ensure the record was verified by a fresh read
        const [purchasedItemData] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);

        // 4. Khalti Protocol Handshake
        const paymentInit = await initializeKhaltiPayment({
            amount: expectedTotal * 100, // Amount in paisa
            purchase_order_id: bookingId.toString(),
            purchase_order_name: `${targetRoom.type_name} Reservation at ${targetRoom.room_number}`,
            customer_info: {
                name: customer_info.name || 'Guest',
                email: customer_info.email || '',
                phone: customer_info.phone || ''
            },
            return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/callback`,
            website_url: process.env.FRONTEND_URL || 'http://localhost:3000',
        });

        // Record attempt in payments table (Store pidx specifically for refunds later)
        await db.query(`INSERT INTO payments (booking_id, amount, payment_method, transaction_id, pidx, status) VALUES (?, ?, 'khalti', ?, ?, 'pending')`,
            [bookingId, expectedTotal, paymentInit.pidx, paymentInit.pidx]
        );

        // 5. Send Payment Info: Matching user's preferred response structure
        res.json({
            success: true,
            purchasedItemData: purchasedItemData[0],
            payment: paymentInit,
        });

    } catch (error) {
        console.error('Payment Init Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Failed to initialize payment",
            error: error.response?.data || error.message
        });
    }
};

/**
 * Mandatory Verification (Lookup API)
 * Strictly follows "Payment Verification (Lookup)" section of doc
 */
const verifyPayment = async (req, res) => {
    try {
        let { pidx, purchase_order_id } = req.body;

        if (!pidx && purchase_order_id) {
            // Find the pidx from our database using booking ID (purchase_order_id)
            const [payments] = await db.query(
                "SELECT pidx FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1",
                [purchase_order_id]
            );
            if (payments.length > 0) {
                pidx = payments[0].pidx;
            }
        }

        if (!pidx) {
            return res.status(400).json({ success: false, message: 'pidx or purchase_order_id is required for lookup' });
        }

        // POST /epayment/lookup/
        const response = await axios.post(KHALTI_LOOKUP_URL, { pidx }, {
            headers: {
                'Authorization': KHALTI_AUTH_HEADER,
                'Content-Type': 'application/json'
            }
        });

        const statusData = response.data;

        // status values: 'Completed', 'Pending', 'User canceled', 'Expired', 'Refunded'
        if (statusData.status === 'Completed') {
            const booking_id = statusData.purchase_order_id;

            // 1. Mark as Paid
            await db.query(
                "UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = ?",
                [booking_id]
            );

            await db.query(
                "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE booking_id = ?",
                [statusData.transaction_id, booking_id]
            );

            // 2. Fetch Deep Details for Email
            const [fullDetails] = await db.query(`
        SELECT
        b.*,
            h.name as hotel_name,
            h.email as hotel_email,
            r.room_number
                FROM bookings b
                JOIN hotels h ON b.hotel_id = h.id
                JOIN rooms r ON b.room_id = r.id
                WHERE b.id = ?
            `, [booking_id]);

            if (fullDetails.length > 0) {
                const bd = fullDetails[0];
                const emailData = {
                    userName: bd.guest_name,
                    hotelName: bd.hotel_name,
                    roomNumber: bd.room_number,
                    checkIn: new Date(bd.check_in_date).toLocaleDateString(),
                    checkOut: new Date(bd.check_out_date).toLocaleDateString(),
                    amount: bd.total_amount,
                    bookingReference: bd.booking_reference
                };

                // Send Guest Confirmation
                console.log(`Sending guest email to: ${bd.guest_email} `);
                emailService.sendBookingConfirmation(bd.guest_email, emailData);

                // Send Admin Notification
                console.log(`Sending admin alert to: ${bd.hotel_email} `);
                emailService.sendAdminBookingNotification(bd.hotel_email, emailData);

                // 3. Set Room status is managed by bookings table
                // No need to set status = 'occupied' permanently anymore
            }

            return res.json({
                success: true,
                message: 'Payment verified successfully. Welcome to Nepal Stays!',
                status: 'Completed',
                data: statusData
            });

        } else if (statusData.status === 'Pending') {
            return res.json({
                success: false,
                message: 'Transaction is in pending state. Hold, do not provide service.',
                status: 'Pending',
                data: statusData
            });
        } else {
            // Status: 'User canceled', 'Expired', 'Refunded'
            return res.status(400).json({
                success: false,
                message: `Transaction ${statusData.status}. Payment failed.`,
                status: statusData.status,
                data: statusData
            });
        }

    } catch (error) {
        console.error('Khalti Lookup Failure:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to verify transaction status with Khalti',
            error: error.response?.data || error.message
        });
    }
};

const refundPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        // 1. Get payment details
        let [paymentRows] = await db.query(
            "SELECT * FROM payments WHERE booking_id = ? AND status = 'completed'",
            [bookingId]
        );

        if (paymentRows.length === 0) {
            // Check for pending that might be paid
            const [pending] = await db.query("SELECT * FROM payments WHERE booking_id = ? AND status = 'pending'", [bookingId]);
            if (pending.length > 0) {
                const upgraded = await verifyAndUpgradePayment(pending[0].id, pending[0].pidx);
                if (upgraded) paymentRows = [upgraded];
            }
        }

        if (paymentRows.length === 0) {
            return res.status(404).json({ success: false, message: 'No completed payment found for this booking. If you paid, please verify status first.' });
        }

        const payment = paymentRows[0];
        const refundData = await processKhaltiRefund(payment, 'Admin initiated refund');

        if (refundData.status === 'Refunded' || refundData.status === 'Completed') {
            // 3. Update DB
            await db.query(
                "UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE id = ?",
                [bookingId]
            );
            await db.query(
                "UPDATE payments SET status = 'refunded', notes = ? WHERE id = ?",
                [`Refunded via Khalti.Ref: ${refundData.refund_id || 'N/A'} `, payment.id]
            );

            // 4. Free up the room (optional but good)
            const [booking] = await db.query("SELECT room_id FROM bookings WHERE id = ?", [bookingId]);
            if (booking.length > 0) {
                await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking[0].room_id]);
            }

            return res.json({
                success: true,
                message: 'Refund successful. Booking has been cancelled.',
                data: refundData
            });
        } else {
            return res.status(400).json({
                success: false,
                message: `Refund failed: ${refundData.message || 'Unknown error'} `,
                data: refundData
            });
        }

    } catch (error) {
        console.error('Khalti Refund Failure:', error.response?.data || error.message);
        const errorDetail = error.response?.data?.message || error.response?.data?.detail || error.message;
        res.status(500).json({
            success: false,
            message: `Refund failed: ${errorDetail} `,
            error: error.response?.data || error.message
        });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        // 1. Check if there are any completed payments that need refunding
        let [paymentRows] = await db.query(
            "SELECT * FROM payments WHERE booking_id = ? AND status = 'completed'",
            [bookingId]
        );

        // If no completed payment found, check if there's a pending one to verify first
        if (paymentRows.length === 0) {
            const [pendingPayments] = await db.query(
                "SELECT * FROM payments WHERE booking_id = ? AND status = 'pending'",
                [bookingId]
            );

            if (pendingPayments.length > 0) {
                const upgraded = await verifyAndUpgradePayment(pendingPayments[0].id, pendingPayments[0].pidx);
                if (upgraded) paymentRows = [upgraded];
            }
        }

        let refundResult = null;
        if (paymentRows.length > 0) {
            const payment = paymentRows[0];
            try {
                const refundData = await processKhaltiRefund(payment, 'Automated refund on cancellation');

                if (refundData.status === 'Refunded' || refundData.status === 'Completed') {
                    await db.query(
                        "UPDATE payments SET status = 'refunded', notes = ? WHERE id = ?",
                        [`Refunded on cancellation.Ref: ${refundData.refund_id || 'N/A'} `, payment.id]
                    );
                    refundResult = { success: true, message: 'Payment refunded successfully' };
                }
            } catch (refundError) {
                console.error('Auto-refund failed:', refundError.response?.data || refundError.message);
                // We'll still proceed with cancellation but note the failed refund
                refundResult = { success: false, message: 'Payment refund failed', error: refundError.response?.data || refundError.message };
            }
        }

        // 2. Update Booking
        await db.query(
            "UPDATE bookings SET status = 'cancelled', payment_status = ? WHERE id = ?",
            [refundResult?.success ? 'refunded' : 'pending', bookingId]
        );

        // 3. Free up the room
        const [booking] = await db.query("SELECT room_id FROM bookings WHERE id = ?", [bookingId]);
        if (booking.length > 0) {
            await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking[0].room_id]);
        }

        return res.json({
            success: true,
            message: refundResult?.success
                ? 'Booking cancelled and payment refunded.'
                : (refundResult ? `Booking cancelled but refund failed: ${refundResult.error} ` : 'Booking cancelled successfully.'),
            refund: refundResult
        });

    } catch (error) {
        console.error('Cancel Booking Failure:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

const manualConfirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        // 1. Update Booking & Payment status
        await db.query(
            "UPDATE bookings SET status = 'confirmed', payment_status = 'paid' WHERE id = ?",
            [bookingId]
        );

        // Update payment record if exists
        await db.query(
            "UPDATE payments SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE booking_id = ?",
            [bookingId]
        );

        return res.json({
            success: true,
            message: 'Booking confirmed manually.'
        });

    } catch (error) {
        console.error('Manual Confirm Failure:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm booking',
            error: error.message
        });
    }
};

const checkInBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID is required' });

        // 1. Update Booking status
        await db.query("UPDATE bookings SET status = 'checked_in' WHERE id = ?", [bookingId]);

        // 2. Mark Room as Occupied
        const [booking] = await db.query("SELECT room_id FROM bookings WHERE id = ?", [bookingId]);
        if (booking.length > 0) {
            await db.query("UPDATE rooms SET status = 'occupied' WHERE id = ?", [booking[0].room_id]);
        }

        res.json({ success: true, message: 'Guest checked in successfully. Room status updated to Occupied.' });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ success: false, message: 'Failed to check in', error: error.message });
    }
};

const checkOutBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID is required' });

        // 1. Update Booking status
        await db.query("UPDATE bookings SET status = 'checked_out' WHERE id = ?", [bookingId]);

        // 2. Mark Room as Available (or Cleaning)
        const [booking] = await db.query("SELECT room_id FROM bookings WHERE id = ?", [bookingId]);
        if (booking.length > 0) {
            await db.query("UPDATE rooms SET status = 'available' WHERE id = ?", [booking[0].room_id]);
        }

        res.json({ success: true, message: 'Guest checked out successfully. Room is now available.' });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, message: 'Failed to check out', error: error.message });
    }
};

module.exports = {
    initiatePayment,
    verifyPayment,
    refundPayment,
    cancelBooking,
    manualConfirmBooking,
    checkInBooking,
    checkOutBooking
};
