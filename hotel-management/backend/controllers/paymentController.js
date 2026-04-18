const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const emailService = require('../services/email.service');
const { LOYALTY_THRESHOLD } = require('./loyaltyController');
const notificationService = require('../services/notification.service');
const { setBookingStatus, setRoomStatus } = require('../services/statusTimeline.service');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require('../constants/notification.constants');
const notificationEvents = require('../services/notificationEvents.service');

function normalizeKhaltiKey(raw) {
    if (raw == null) return '';
    let s = String(raw).trim();
    if (s.charCodeAt(0) === 0xfeff) s = s.slice(1).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    return s;
}
const KHALTI_SECRET_KEY = normalizeKhaltiKey(process.env.KHALTI_SECRET_KEY || '');

const IS_LIVE = KHALTI_SECRET_KEY.toLowerCase().includes('live');

const RAW_KEY = KHALTI_SECRET_KEY.replace(/^(Key|Live)\s+/i, '');
const KHALTI_AUTH_HEADER = `Key ${RAW_KEY}`;

const KHALTI_A_BASE = 'https://a.khalti.com';
const KHALTI_BASE = IS_LIVE ? 'https://khalti.com' : 'https://dev.khalti.com';

const KHALTI_INITIATE_URL = `${KHALTI_A_BASE}/api/v2/epayment/initiate/`;
const KHALTI_LOOKUP_URL = `${KHALTI_A_BASE}/api/v2/epayment/lookup/`;
const KHALTI_LOOKUP_FALLBACK_URL = `${KHALTI_BASE}/api/v2/epayment/lookup/`;

async function lookupKhaltiPaymentStatus(pidx) {
    const urlsToTry = [KHALTI_LOOKUP_URL, KHALTI_LOOKUP_FALLBACK_URL];
    const headersToTry = [
        { 'Authorization': KHALTI_AUTH_HEADER, 'Content-Type': 'application/json' }
    ];
    if (KHALTI_SECRET_KEY && KHALTI_SECRET_KEY !== RAW_KEY) {
        headersToTry.push({ 'Authorization': KHALTI_SECRET_KEY, 'Content-Type': 'application/json' });
    }

    let lastError = null;
    for (const url of urlsToTry) {
        for (const headers of headersToTry) {
            try {
                const response = await axios.post(url, { pidx }, { headers, timeout: 15000 });
                return response.data;
            } catch (e) {
                lastError = e;
                const code = e.response?.status;
                if (code === 401 || code === 403) continue;
                if (code === 404 || code === 429 || code >= 500) continue;
                throw e;
            }
        }
    }
    throw lastError || new Error('Khalti lookup failed');
}

const PLATFORM_FEE_RATE = 0.1;

async function notifyUserBooking(userId, bookingId, title, message, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
    if (!userId) return;
    try {
        await notificationService.saveNotification({
            userId,
            role: 'user',
            title,
            message,
            type: NOTIFICATION_TYPES.BOOKING,
            referenceId: bookingId,
            priority
        });
    } catch (error) {
        console.error('[notifications] user booking notify failed:', error.message);
    }
}

async function notifyHotelAdminsBooking(hotelId, bookingId, title, message, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
    try {
        const recipients = await notificationService.getAdminRecipientsForHotel(hotelId);
        await Promise.allSettled(
            recipients.map((recipient) =>
                notificationService.saveNotification({
                    userId: recipient.userId,
                    role: 'admin',
                    title,
                    message,
                    type: NOTIFICATION_TYPES.BOOKING,
                    referenceId: bookingId,
                    priority
                })
            )
        );
    } catch (error) {
        console.error('[notifications] admin booking notify failed:', error.message);
    }
}

const initializeKhaltiPayment = async (details) => {
    const response = await axios.post(KHALTI_INITIATE_URL, details, {
        headers: {
            'Authorization': KHALTI_AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

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
            if (updated.length > 0) {
                const bookingUpdate = await setBookingStatus(db, {
                    bookingId: updated[0].booking_id,
                    toStatus: 'confirmed',
                    reason: 'Payment verification upgrade',
                    extraFields: { payment_status: 'paid', confirmed_at: new Date() }
                });
                if (bookingUpdate?.roomId) {
                    await setRoomStatus(db, {
                        roomId: bookingUpdate.roomId,
                        toStatus: 'booked',
                        source: 'payment_verify_upgrade',
                        referenceType: 'booking',
                        referenceId: updated[0].booking_id
                    });
                }
            }
            return updated[0];
        }
    } catch (e) {
        console.error(`Verification failed for payment ${paymentId}:`, e.message);
    }
    return null;
};

const initiatePayment = async (req, res) => {
    try {
        const { hotel_id, room_type_id, check_in_date, check_out_date, num_guests, num_rooms, payment_method, customer_info, amount } = req.body;
        const user_id = req.user.id;

        if (!hotel_id || !room_type_id || !check_in_date || !check_out_date) {
            return res.status(400).json({ success: false, message: "Missing required booking details" });
        }

        const [bookerRows] = await db.query(
            'SELECT email, full_name, phone FROM users WHERE id = ?',
            [user_id]
        );
        if (!bookerRows.length || !bookerRows[0].email) {
            return res.status(400).json({
                success: false,
                message: 'Your account has no email on file. Update your profile before booking.'
            });
        }
        const booker = bookerRows[0];
        const ci = {
            name:
                (customer_info && String(customer_info.name || '').trim()) ||
                booker.full_name ||
                'Guest',
            email: String(booker.email).trim(),
            phone:
                (customer_info && String(customer_info.phone || '').trim()) ||
                booker.phone ||
                '9800000000'
        };

        const [availableRooms] = await db.query(`
            SELECT r.id, r.room_number, rt.base_price, rt.name as type_name, rt.max_occupancy
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

        const numRooms = parseInt(num_rooms, 10) || 1;

        if (availableRooms.length < numRooms) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableRooms.length} rooms of this type are available for the selected dates. Please select fewer rooms or try another category.`
            });
        }

        const targetRoom = availableRooms[0];

        if (num_guests > targetRoom.max_occupancy * numRooms) {
            return res.status(400).json({
                success: false,
                code: 'EXCEEDS_CAPACITY',
                message: `Booking failed. Only ${targetRoom.max_occupancy * numRooms} guests are permitted per ${numRooms} ${targetRoom.type_name} room(s).`,
                max_occupancy: targetRoom.max_occupancy * numRooms
            });
        }

        const stayDuration = new Date(check_out_date) - new Date(check_in_date);
        const nights = Math.max(1, Math.ceil(stayDuration / (1000 * 60 * 60 * 24)));
        let expectedTotal = targetRoom.base_price * nights * numRooms;

        const currentYear = new Date().getFullYear();
        const [loyaltyRows] = await db.query(
            `SELECT COUNT(*) as completed_stays FROM bookings 
             WHERE user_id = ? AND hotel_id = ? 
               AND status IN ('confirmed', 'checked_in', 'checked_out')
               AND YEAR(check_in_date) = ?
               AND (loyalty_free_night = 0 OR loyalty_free_night IS NULL)`,
            [user_id, hotel_id, currentYear]
        );
        const [redeemedRows] = await db.query(
            `SELECT COUNT(*) as redeemed_count FROM bookings 
             WHERE user_id = ? AND hotel_id = ? 
               AND loyalty_free_night = 1 
               AND YEAR(check_in_date) = ?`,
            [user_id, hotel_id, currentYear]
        );

        const completedStays = loyaltyRows[0].completed_stays || 0;
        const totalCyclesCompleted = Math.floor(completedStays / LOYALTY_THRESHOLD);
        const redeemedCount = redeemedRows[0].redeemed_count || 0;
        const hasLoyaltyReward = totalCyclesCompleted > redeemedCount;

        let loyaltyDiscount = 0;
        let applyLoyalty = false;
        if (hasLoyaltyReward && req.body.apply_loyalty !== false) {
            loyaltyDiscount = targetRoom.base_price * numRooms;
            expectedTotal = expectedTotal - loyaltyDiscount;
            applyLoyalty = true;
        }

        if (Math.abs(Number(amount) - expectedTotal) > 0.05) {
            return res.status(400).json({
                success: false,
                message: `Price validation failed. Expected: ${expectedTotal}, Received: ${amount}`,
                expected: expectedTotal,
                loyalty_applied: applyLoyalty,
                loyalty_discount: loyaltyDiscount
            });
        }

        const method = String(payment_method || 'khalti').toLowerCase();
        if (method === 'khalti' && !String(RAW_KEY).trim()) {
            return res.status(503).json({
                success: false,
                code: 'KHALTI_NOT_CONFIGURED',
                message:
                    'Online payment is not configured. Add KHALTI_SECRET_KEY to the server .env file, or use pay-at-hotel if the hotel allows it.'
            });
        }

        const booking_ref = `BK-${Date.now()}`;
        const bookingIds = [];
        
        const baseGuestsPerRoom = Math.floor(num_guests / numRooms);
        const remainingGuests = num_guests % numRooms;

        const shuffledRooms = availableRooms.sort(() => 0.5 - Math.random()).slice(0, numRooms);

        for (let i = 0; i < numRooms; i++) {
            const currentRoomId = shuffledRooms[i].id;
            const guestsForThisRoom = baseGuestsPerRoom + (i < remainingGuests ? 1 : 0);
            const unique_booking_ref = `${booking_ref}-${i + 1}`;

            let current_total = targetRoom.base_price * nights;
            const perRoomLoyaltyDiscount = applyLoyalty ? targetRoom.base_price : 0;
            current_total = current_total - perRoomLoyaltyDiscount;
            const commission = current_total * 0.10;

            const [bookingInsert] = await db.query(
                `INSERT INTO bookings (booking_reference, user_id, hotel_id, room_id, check_in_date, check_out_date, num_guests, total_nights, price_per_night, total_amount, commission_amount, loyalty_free_night, loyalty_discount, status, payment_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
                [unique_booking_ref, user_id, hotel_id, currentRoomId, check_in_date, check_out_date, guestsForThisRoom || 1, nights, targetRoom.base_price, current_total, commission, applyLoyalty ? 1 : 0, perRoomLoyaltyDiscount]
            );

            await db.query(
                `INSERT INTO booking_guest_details (booking_id, guest_name, guest_email, guest_phone) VALUES (?, ?, ?, ?)`,
                [bookingInsert.insertId, ci.name, ci.email, ci.phone]
            );

            bookingIds.push(bookingInsert.insertId);

            if (i === 0) {
                const [purchasedItemData] = await db.query(`
                    SELECT b.*, h.name as hotel_name, h.email as hotel_email, r.room_number,
                           bgd.guest_name, bgd.guest_email, bgd.guest_phone,
                           u.email AS booker_email
                    FROM bookings b
                    JOIN users u ON b.user_id = u.id
                    JOIN hotels h ON b.hotel_id = h.id
                    JOIN rooms r ON b.room_id = r.id
                    LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
                    WHERE b.id = ?
                `, [bookingInsert.insertId]);

                if (purchasedItemData.length > 0) {
                    const bd = purchasedItemData[0];
                    const emailData = {
                        userName: bd.guest_name,
                        hotelName: bd.hotel_name,
                        roomNumber: `${numRooms} room(s) starting with ${bd.room_number}`,
                        checkIn: new Date(bd.check_in_date).toLocaleDateString(),
                        checkOut: new Date(bd.check_out_date).toLocaleDateString(),
                        amount: expectedTotal,
                        bookingReference: bd.booking_reference
                    };

                    const guestNotifyTo = bd.booker_email || bd.guest_email;
                    const pendingEmailJobs = [];
                    if (guestNotifyTo) {
                      pendingEmailJobs.push(
                        emailService.sendBookingInitiated(guestNotifyTo, emailData)
                      );
                    }
                    if (bd.hotel_email) {
                      pendingEmailJobs.push(
                        emailService.sendAdminBookingInitiated(bd.hotel_email, emailData)
                      );
                    }
                    if (pendingEmailJobs.length > 0) {
                      await Promise.allSettled(pendingEmailJobs);
                    }
                }
            }
        }

        if (bookingIds.length > 0) {
            await notificationEvents.notifyBookingCreated({
                bookingId: bookingIds[0],
                bookingReference: booking_ref,
                userId: user_id,
                hotelId: hotel_id
            });
        }

        if (method === 'cash') {
            for (const bkId of bookingIds) {
                const bookingUpdate = await setBookingStatus(db, {
                    bookingId: bkId,
                    toStatus: 'confirmed',
                    changedBy: req.user.id,
                    reason: 'Pay-at-hotel booking confirmed',
                    extraFields: {
                        payment_status: 'pending',
                        confirmed_by: req.user.id,
                        confirmed_at: new Date()
                    }
                });
                if (bookingUpdate?.roomId) {
                    await setRoomStatus(db, {
                        roomId: bookingUpdate.roomId,
                        toStatus: 'booked',
                        changedBy: req.user.id,
                        source: 'payment_cash_confirm',
                        referenceType: 'booking',
                        referenceId: bkId
                    });
                }
                if (bookingUpdate?.userId) {
                    await notifyUserBooking(
                        bookingUpdate.userId,
                        bkId,
                        'Booking confirmed (pay at hotel)',
                        'Your booking is confirmed. Please complete payment at check-in.'
                    );
                }
                if (bookingUpdate?.hotelId) {
                    await notifyHotelAdminsBooking(
                        bookingUpdate.hotelId,
                        bkId,
                        'New pay-at-hotel booking confirmed',
                        `Booking #${bkId} is confirmed and will be paid at check-in.`
                    );
                }
            }

              if (bookingIds.length > 0) {
                const [fullDetails] = await db.query(`
                  SELECT b.*, h.name as hotel_name, h.email as hotel_email, r.room_number,
                       bgd.guest_name, bgd.guest_email, bgd.guest_phone,
                       u.email AS booker_email
                  FROM bookings b
                  JOIN users u ON b.user_id = u.id
                  JOIN hotels h ON b.hotel_id = h.id
                  JOIN rooms r ON b.room_id = r.id
                  LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
                  WHERE b.id = ?
                `, [bookingIds[0]]);

                if (fullDetails.length > 0) {
                  const bd = fullDetails[0];
                  const emailData = {
                    userName: bd.guest_name,
                    hotelName: bd.hotel_name,
                    roomNumber: `${numRooms} room(s) starting with ${bd.room_number}`,
                    checkIn: new Date(bd.check_in_date).toLocaleDateString(),
                    checkOut: new Date(bd.check_out_date).toLocaleDateString(),
                    amount: expectedTotal,
                    bookingReference: bd.booking_reference,
                    paymentMessage: 'Payment method: Pay at hotel. Please pay at check-in.',
                    paymentStatus: 'Pay at hotel (pending)',
                    amountLabel: 'Amount Due'
                  };

                  const guestNotifyTo = bd.booker_email || bd.guest_email;
                  const confirmEmailJobs = [];
                  if (guestNotifyTo) {
                    confirmEmailJobs.push(
                      emailService.sendBookingConfirmation(guestNotifyTo, emailData)
                    );
                  }
                  if (bd.hotel_email) {
                    confirmEmailJobs.push(
                      emailService.sendAdminBookingNotification(bd.hotel_email, emailData)
                    );
                  }
                  if (confirmEmailJobs.length > 0) {
                    await Promise.allSettled(confirmEmailJobs);
                  }
                }
              }

            return res.json({
                success: true,
                method: 'cash',
                message: 'Booking confirmed successfully. Please pay at the hotel. System fee has been deducted from your balance.'
            });
        }

        const clientOrigin = req.headers.origin 
            || (req.headers.referer ? new URL(req.headers.referer).origin : null) 
            || process.env.FRONTEND_URL 
            || 'http://localhost:3000';

        let paymentInit;
        try {
            paymentInit = await initializeKhaltiPayment({
                amount: Math.round(expectedTotal * 100), // paisa
                purchase_order_id: bookingIds.join('-').substring(0, 100),
                purchase_order_name: `${numRooms}x ${targetRoom.type_name}`.substring(0, 50),
                customer_info: {
                    name: (ci.name || 'Guest').substring(0, 50),
                    email: (ci.email || 'guest@example.com').substring(0, 50),
                    phone: (ci.phone || '9800000000').substring(0, 20)
                },
                return_url: `${clientOrigin}/payment/callback`,
                website_url: clientOrigin,
            });
        } catch (khaltiErr) {
            const khaltiBody = khaltiErr.response?.data;
            console.error('Khalti initiate error:', khaltiBody || khaltiErr.message);
            if (bookingIds.length > 0) {
                const ph = bookingIds.map(() => '?').join(',');
                await db.query(`DELETE FROM bookings WHERE id IN (${ph})`, bookingIds);
            }
            return res.status(502).json({
                success: false,
                code: 'KHALTI_INIT_FAILED',
                message:
                    khaltiBody?.detail ||
                    khaltiBody?.error_key ||
                    'Could not start Khalti payment. Check KHALTI_SECRET_KEY (test vs live) and server logs.',
                error: khaltiBody || khaltiErr.message
            });
        }

        if (!paymentInit || !paymentInit.payment_url) {
            if (bookingIds.length > 0) {
                const ph = bookingIds.map(() => '?').join(',');
                await db.query(`DELETE FROM bookings WHERE id IN (${ph})`, bookingIds);
            }
            return res.status(502).json({
                success: false,
                code: 'KHALTI_NO_PAYMENT_URL',
                message: 'Payment gateway did not return a payment URL. Check Khalti credentials and API response.',
                error: paymentInit
            });
        }

        for (const bkId of bookingIds) {
            await db.query(`INSERT INTO payments (booking_id, amount, payment_method, transaction_id, pidx, status) VALUES (?, ?, 'khalti', ?, ?, 'pending')`,
                [bkId, targetRoom.base_price * nights, paymentInit.pidx, paymentInit.pidx]
            );
        }

        res.json({
            success: true,
            method: 'khalti',
            payment: paymentInit,
        });

    } catch (error) {
        console.error('Payment Init Error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initialize payment',
            error: error.response?.data || error.message
        });
    }
};

const initiatePayOnlineForBooking = async (req, res) => {
    try {
        let ids = [];
        if (Array.isArray(req.body.bookingIds) && req.body.bookingIds.length > 0) {
            ids = [...new Set(req.body.bookingIds.map((id) => parseInt(id, 10)).filter((n) => n > 0))];
        } else if (req.body.bookingId != null && req.body.bookingId !== '') {
            const one = parseInt(req.body.bookingId, 10);
            if (one > 0) ids = [one];
        }
        if (ids.length === 0) {
            return res.status(400).json({ success: false, message: 'bookingId or bookingIds is required' });
        }

        if (!String(RAW_KEY).trim()) {
            return res.status(503).json({
                success: false,
                code: 'KHALTI_NOT_CONFIGURED',
                message:
                    'Online payment is not configured. Add KHALTI_SECRET_KEY to the server .env file, or pay at the hotel on arrival.'
            });
        }

        const ph = ids.map(() => '?').join(',');
        const [rows] = await db.query(
            `SELECT b.*,
                    bgd.guest_name, bgd.guest_phone, bgd.guest_email,
                    u.email AS booker_email, u.full_name AS booker_name, u.phone AS booker_phone,
                    rt.name AS room_type_name
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN rooms r ON r.id = b.room_id
             JOIN room_types rt ON rt.id = r.room_type_id
             LEFT JOIN booking_guest_details bgd ON bgd.booking_id = b.id
             WHERE b.id IN (${ph})`,
            ids
        );

        if (rows.length !== ids.length) {
            return res.status(404).json({ success: false, message: 'One or more bookings were not found' });
        }

        for (const booking of rows) {
            if (booking.user_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'You can only pay for your own booking.' });
            }
            if (booking.status !== 'confirmed' || booking.payment_status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'Online prepay is only available for confirmed bookings that are not yet paid online.'
                });
            }
        }

        const groupKeys = rows.map((r) => {
            const m = String(r.booking_reference || '').match(/^(BK-\d+)-\d+$/);
            return m ? m[1] : `solo:${r.id}`;
        });
        if (new Set(groupKeys).size !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Those bookings are not part of the same reservation. Pay for each separately.'
            });
        }

        const [pendingKhalti] = await db.query(
            `SELECT id FROM payments WHERE booking_id IN (${ph}) AND payment_method = 'khalti' AND status = 'pending'`,
            ids
        );
        if (pendingKhalti.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a Khalti payment in progress. Use Verify Payment or wait a moment and try again.'
            });
        }

        const booking = rows[0];
        const bookerEmail = String(booking.booker_email || booking.guest_email || '').trim();
        if (!bookerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Your account has no email on file. Update your profile before paying online.'
            });
        }

        const total = rows.reduce((sum, r) => sum + Number(r.total_amount), 0);
        if (!Number.isFinite(total) || total <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid booking amount.' });
        }

        const clientOrigin =
            req.headers.origin ||
            (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
            process.env.FRONTEND_URL ||
            'http://localhost:3000';

        const ciName =
            String(booking.guest_name || booking.booker_name || 'Guest').substring(0, 50);
        const ciPhone = String(
            booking.guest_phone || booking.booker_phone || '9800000000'
        ).substring(0, 20);

        const sortedIds = [...ids].sort((a, b) => a - b);
        const purchaseOrderId = sortedIds.join('-').substring(0, 100);
        const purchaseOrderName =
            rows.length > 1
                ? `${rows.length} rooms · ${booking.room_type_name || 'Hotel stay'}`.substring(0, 50)
                : String(booking.room_type_name || 'Hotel stay').substring(0, 50);

        let paymentInit;
        try {
            paymentInit = await initializeKhaltiPayment({
                amount: Math.round(total * 100),
                purchase_order_id: purchaseOrderId,
                purchase_order_name: purchaseOrderName,
                customer_info: {
                    name: ciName,
                    email: bookerEmail.substring(0, 50),
                    phone: ciPhone
                },
                return_url: `${clientOrigin}/payment/callback`,
                website_url: clientOrigin
            });
        } catch (khaltiErr) {
            const khaltiBody = khaltiErr.response?.data;
            console.error('Khalti pay-online initiate error:', khaltiBody || khaltiErr.message);
            return res.status(502).json({
                success: false,
                code: 'KHALTI_INIT_FAILED',
                message:
                    khaltiBody?.detail ||
                    khaltiBody?.error_key ||
                    'Could not start Khalti payment. Check KHALTI_SECRET_KEY and server logs.',
                error: khaltiBody || khaltiErr.message
            });
        }

        if (!paymentInit || !paymentInit.payment_url) {
            return res.status(502).json({
                success: false,
                code: 'KHALTI_NO_PAYMENT_URL',
                message: 'Payment gateway did not return a payment URL.',
                error: paymentInit
            });
        }

        for (const row of rows) {
            const amt = Number(row.total_amount);
            await db.query(
                `INSERT INTO payments (booking_id, amount, payment_method, transaction_id, pidx, status) VALUES (?, ?, 'khalti', ?, ?, 'pending')`,
                [row.id, amt, paymentInit.pidx, paymentInit.pidx]
            );
        }

        res.json({
            success: true,
            method: 'khalti',
            payment: paymentInit
        });
    } catch (error) {
        console.error('initiatePayOnlineForBooking error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to start online payment' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        let { pidx, purchase_order_id } = req.body;
        console.log(`[Khalti] Verification request received. pidx: ${pidx}, id: ${purchase_order_id}`);
        const resolveBookingIds = async (statusDataLike, fallbackPidx) => {
            const raw = String(statusDataLike?.purchase_order_id || '').trim();
            if (raw) {
                const ids = raw
                    .split('-')
                    .map((id) => parseInt(String(id).trim(), 10))
                    .filter((id) => !Number.isNaN(id));
                if (ids.length) return ids;
            }
            const [rows] = await db.query(
                'SELECT DISTINCT booking_id FROM payments WHERE pidx = ? AND booking_id IS NOT NULL ORDER BY booking_id',
                [fallbackPidx]
            );
            return rows.map((r) => Number(r.booking_id)).filter((n) => Number.isFinite(n));
        };

        if (!pidx && purchase_order_id) {
            const searchId = String(purchase_order_id).split('-')[0];
            const [payments] = await db.query(
                "SELECT pidx FROM payments WHERE booking_id = ? OR pidx = ? ORDER BY created_at DESC LIMIT 1",
                [searchId, purchase_order_id]
            );
            
            if (payments.length > 0) {
                pidx = payments[0].pidx;
                console.log(`[Khalti] Resolved pidx from database: ${pidx}`);
            }
        }

        if (!pidx) {
            return res.status(400).json({ 
                success: false, 
                message: 'Transaction token (pidx) not found. If this was a fresh payment, please wait a moment or try again from your dashboard.' 
            });
        }
        if (!String(RAW_KEY).trim()) {
            return res.status(503).json({
                success: false,
                message: 'Khalti is not configured on server. Add a valid KHALTI_SECRET_KEY and restart backend.'
            });
        }
        pidx = String(pidx).trim();

        const statusData = await lookupKhaltiPaymentStatus(pidx);
        console.log(`[Khalti] Remote status for ${pidx}: ${statusData.status}`);

        if (statusData.status === 'Completed') {
            const extConn = await db.getConnection();
            try {
                await extConn.beginTransaction();

                const [extDone] = await extConn.query(
                    "SELECT id FROM payments WHERE pidx = ? AND status = 'completed' AND notes LIKE 'stay_extension:%'",
                    [pidx]
                );
                if (extDone.length > 0) {
                    await extConn.commit();
                    return res.json({
                        success: true,
                        message: 'Payment verified successfully.',
                        status: 'Completed',
                        data: statusData
                    });
                }

                const [pendingExt] = await extConn.query(
                    `SELECT p.id AS payment_row_id, p.booking_id, p.amount, p.notes,
                            b.hotel_id, b.room_id, b.check_out_date, b.price_per_night, b.payment_status, b.status AS booking_status
                     FROM payments p
                     INNER JOIN bookings b ON b.id = p.booking_id
                     WHERE p.pidx = ? AND p.status = 'pending' AND p.notes LIKE 'stay_extension:%'
                     FOR UPDATE`,
                    [pidx]
                );

                if (pendingExt.length > 0) {
                    const pr = pendingExt[0];
                    const m = String(pr.notes || '').match(/^stay_extension:(\d+)$/);
                    if (!m) {
                        await extConn.rollback();
                        return res.status(400).json({ success: false, message: 'Invalid extension payment record' });
                    }
                    const addNights = parseInt(m[1], 10);
                    const extGross = Number(pr.amount);
                    const expectedGross = Math.round(Number(pr.price_per_night) * addNights * 100) / 100;
                    if (Math.abs(extGross - expectedGross) > 0.05) {
                        await extConn.rollback();
                        return res.status(400).json({ success: false, message: 'Extension amount mismatch; contact support.' });
                    }
                    if (pr.booking_status !== 'checked_in') {
                        await extConn.rollback();
                        return res.status(400).json({ success: false, message: 'Booking is not checked in; extension cannot be applied.' });
                    }

                    const [extConflicts] = await extConn.query(
                        `SELECT id FROM bookings
                         WHERE room_id = ? AND id != ? AND status IN ('confirmed', 'checked_in')
                         AND check_in_date < DATE_ADD(?, INTERVAL ? DAY)
                         AND check_out_date > ?`,
                        [pr.room_id, pr.booking_id, pr.check_out_date, addNights, pr.check_out_date]
                    );
                    if (extConflicts.length > 0) {
                        await extConn.rollback();
                        return res.status(409).json({
                            success: false,
                            message: 'Another reservation now overlaps your extension. Contact support with your payment reference for help.'
                        });
                    }

                    const extCommission = Math.round(extGross * PLATFORM_FEE_RATE * 100) / 100;
                    await applyStayExtension(
                        extConn,
                        { id: pr.booking_id, hotel_id: pr.hotel_id, payment_status: pr.payment_status },
                        addNights,
                        extGross,
                        extCommission
                    );

                    await extConn.query(
                        'UPDATE payments SET status = ?, transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
                        ['completed', statusData.transaction_id, pr.payment_row_id]
                    );
                    await extConn.commit();
                    return res.json({
                        success: true,
                        message: 'Stay extension paid. Your new check-out date is updated.',
                        status: 'Completed',
                        data: statusData
                    });
                }

                await extConn.commit();
            } catch (extErr) {
                try {
                    await extConn.rollback();
                } catch (_) { /* noop */ }
                console.error('Extension verify error:', extErr);
                return res.status(500).json({ success: false, message: 'Failed to apply stay extension' });
            } finally {
                extConn.release();
            }

            const booking_ids = await resolveBookingIds(statusData, pidx);
            const rawPoid = String(statusData.purchase_order_id || '');
            if (/^EXT\d+$/i.test(rawPoid) && booking_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Extension payment could not be matched. If you already paid, refresh your bookings.'
                });
            }

            for (const bId of booking_ids) {
                const bookingUpdate = await setBookingStatus(db, {
                    bookingId: bId,
                    toStatus: 'confirmed',
                    reason: 'Khalti payment completed',
                    extraFields: {
                        payment_status: 'paid',
                        confirmed_at: new Date()
                    }
                });

                await db.query(
                    "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE booking_id = ? OR pidx = ?",
                    [statusData.transaction_id, bId, pidx]
                );

                const [fullDetails] = await db.query(`
                    SELECT b.*, h.name as hotel_name, h.email as hotel_email, r.room_number,
                           bgd.guest_name, bgd.guest_email, bgd.guest_phone,
                           u.email AS booker_email
                    FROM bookings b
                    JOIN users u ON b.user_id = u.id
                    JOIN hotels h ON b.hotel_id = h.id
                    JOIN rooms r ON b.room_id = r.id
                    LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
                    WHERE b.id = ?
                        `, [bId]);

                if (fullDetails.length > 0) {
                    const bd = fullDetails[0];
                    const emailData = {
                        userName: bd.guest_name,
                        hotelName: bd.hotel_name,
                        roomNumber: bd.room_number,
                        checkIn: new Date(bd.check_in_date).toLocaleDateString(),
                        checkOut: new Date(bd.check_out_date).toLocaleDateString(),
                        amount: bd.total_amount,
                    bookingReference: bd.booking_reference,
                    paymentMessage: 'Payment received successfully via Khalti.',
                    paymentStatus: 'Paid online',
                    amountLabel: 'Amount Paid'
                    };

                    const guestNotifyTo = bd.booker_email || bd.guest_email;
                  const confirmEmailJobs = [];
                    if (guestNotifyTo) {
                    confirmEmailJobs.push(
                      emailService.sendBookingConfirmation(guestNotifyTo, emailData)
                    );
                    }

                  if (bd.hotel_email) {
                    confirmEmailJobs.push(
                      emailService.sendAdminBookingNotification(bd.hotel_email, emailData)
                    );
                  }

                  if (confirmEmailJobs.length > 0) {
                    await Promise.allSettled(confirmEmailJobs);
                  }

                    await notificationEvents.notifyPaymentSuccess({
                        bookingId: bd.id,
                        userId: bd.user_id,
                        hotelId: bd.hotel_id
                    });

                    await setRoomStatus(db, {
                        roomId: bd.room_id,
                        toStatus: 'booked',
                        source: 'payment_khalti_confirm',
                        referenceType: 'booking',
                        referenceId: bId
                    });
                }

                if (bookingUpdate?.userId) {
                    await notifyUserBooking(
                        bookingUpdate.userId,
                        bId,
                        'Booking confirmed and paid',
                        'Your payment was successful. Booking is now confirmed.'
                    );
                }
                if (bookingUpdate?.hotelId) {
                    await notifyHotelAdminsBooking(
                        bookingUpdate.hotelId,
                        bId,
                        'Online booking confirmed',
                        `Booking #${bId} has been paid online and confirmed.`
                    );
                }
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
            const bookingIds = await resolveBookingIds(statusData, pidx);

            for (const bookingId of bookingIds) {
                const [bookingRows] = await db.query(
                    'SELECT id, user_id, hotel_id FROM bookings WHERE id = ? LIMIT 1',
                    [bookingId]
                );
                if (bookingRows.length) {
                    await notificationEvents.notifyPaymentFailed({
                        bookingId: bookingRows[0].id,
                        userId: bookingRows[0].user_id,
                        hotelId: bookingRows[0].hotel_id,
                        reason: statusData.status
                    });
                }
            }

            return res.status(400).json({
                success: false,
                message: `Transaction ${statusData.status}. Payment failed.`,
                status: statusData.status,
                data: statusData
            });
        }

        } catch (error) {
        const khaltiError = error.response?.data || error.message;
        const statusCode = error.response?.status || 500;
        console.error('[Khalti] Critical Lookup Failure:', khaltiError);
        await notificationEvents.notifySystemAlert({
            title: 'Payment gateway issue',
            message: `Khalti verification failed: ${String(error.response?.status || '')} ${String(error.message || '').slice(0, 180)}`
        });
        
        res.status(statusCode).json({
            success: false,
            message: 'Failed to verify transaction status with Khalti',
            details: khaltiError,
            tip:
                statusCode === 401 || statusCode === 403
                    ? 'Khalti key mismatch (test/live or invalid key). Update KHALTI_SECRET_KEY and restart backend.'
                    : statusCode === 400
                        ? 'Invalid/expired pidx. Retry payment from dashboard if this token is stale.'
                        : 'Ensure backend can reach both a.khalti.com and khalti.com, then retry verification.'
        });
    }
};

const refundPayment = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    const userId = req.user.id;

    if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID is required' });

    const [bookingRows] = await db.query(
      "SELECT status, hotel_id, room_id, user_id, total_amount, payment_status FROM bookings WHERE id = ?",
      [bookingId]
    );

    if (bookingRows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bookingRows[0];

    if (booking.status === 'checked_in') {
      return res.status(400).json({ success: false, message: 'REFUND_DENIED: Stays already in progress cannot be refunded.' });
    }

    const [payments] = await db.query("SELECT id FROM payments WHERE booking_id = ? AND status = 'completed'", [bookingId]);
    if (payments.length === 0 && booking.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'No completed payment found to refund.' });
    }

    await db.query(
      "INSERT INTO refund_requests (booking_id, user_id, hotel_id, amount, reason) VALUES (?, ?, ?, ?, ?)",
      [bookingId, userId, booking.hotel_id, booking.total_amount, reason || 'User requested refund']
    );

    await setBookingStatus(db, {
      bookingId,
      toStatus: 'cancelled',
      changedBy: userId,
      reason: reason || 'Refund requested by user',
      extraFields: {
        cancelled_at: new Date(),
        cancelled_by: userId
      }
    });

    if (booking.room_id) {
      await setRoomStatus(db, {
        roomId: booking.room_id,
        toStatus: 'available',
        changedBy: userId,
        source: 'refund_request',
        referenceType: 'booking',
        referenceId: bookingId
      });
    }

    await notifyUserBooking(
      booking.user_id,
      bookingId,
      'Refund request submitted',
      'Your booking was cancelled and refund request was sent for review.'
    );

    res.json({ success: true, message: 'Refund request submitted for SuperAdmin approval. Booking marked as cancelled.' });
  } catch (error) {
    console.error('Refund Request Error:', error);
    res.status(500).json({ success: false, message: 'Internal error processing refund request' });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    const [bookingRows] = await db.query("SELECT status, payment_status, hotel_id, room_id, total_amount, user_id, booking_reference FROM bookings WHERE id = ?", [bookingId]);
    
    if (bookingRows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bookingRows[0];

    if (booking.user_id !== req.user.id && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own booking.' });
    }

    if (booking.status === 'checked_in') {
      return res.status(400).json({ success: false, message: 'CANCEL_DENIED: Cannot cancel an active stay.' });
    }

    if (booking.payment_status === 'paid') {
      await db.query(
        "INSERT INTO refund_requests (booking_id, user_id, hotel_id, amount, reason) VALUES (?, ?, ?, ?, ?)",
        [bookingId, req.user.id, booking.hotel_id, booking.total_amount, reason || 'Cancellation request']
      );
    }

    await setBookingStatus(db, {
      bookingId,
      toStatus: 'cancelled',
      changedBy: req.user.id,
      reason: reason || 'Booking cancelled by user',
      extraFields: {
        cancelled_at: new Date(),
        cancelled_by: req.user.id
      }
    });

    if (booking.room_id) {
      await setRoomStatus(db, {
        roomId: booking.room_id,
        toStatus: 'available',
        changedBy: req.user.id,
        source: 'booking_cancel',
        referenceType: 'booking',
        referenceId: bookingId
      });
    }

    await notificationEvents.notifyBookingCancelled({
      bookingId: Number(bookingId),
      bookingReference: booking.booking_reference,
      userId: booking.user_id,
      hotelId: booking.hotel_id
    });

    res.json({ success: true, message: booking.payment_status === 'paid' ? 'Booking cancelled. Refund request sent to SuperAdmin.' : 'Booking cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Cancellation failed' });
  }
};

const updateBookingGuestDetails = async (req, res) => {
  try {
    const { bookingId, guest_name, guest_phone, special_requests } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const [bookingRows] = await db.query(
      'SELECT id, user_id, status FROM bookings WHERE id = ? LIMIT 1',
      [bookingId]
    );
    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = bookingRows[0];
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Guest details can only be edited before check-in'
      });
    }

    await db.query(
      `UPDATE booking_guest_details
       SET guest_name = COALESCE(?, guest_name),
           guest_phone = COALESCE(?, guest_phone),
           special_requests = COALESCE(?, special_requests)
       WHERE booking_id = ?`,
      [
        guest_name !== undefined ? String(guest_name).trim() : null,
        guest_phone !== undefined ? String(guest_phone).trim() : null,
        special_requests !== undefined ? String(special_requests).trim() : null,
        bookingId
      ]
    );

    res.json({ success: true, message: 'Guest details updated successfully.' });
  } catch (error) {
    console.error('updateBookingGuestDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to update guest details' });
  }
};

const updateBookingNumGuests = async (req, res) => {
  try {
    const { bookingId, num_guests } = req.body;
    const nextGuests = Number(num_guests);
    if (!bookingId || !Number.isFinite(nextGuests) || nextGuests < 1) {
      return res.status(400).json({
        success: false,
        message: 'bookingId and a valid num_guests are required'
      });
    }

    const [bookingRows] = await db.query(
      `SELECT b.id, b.user_id, b.status, b.room_id, rt.max_occupancy
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       WHERE b.id = ?
       LIMIT 1`,
      [bookingId]
    );
    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = bookingRows[0];
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Guest count can only be edited before check-in'
      });
    }

    const maxOcc = Number(booking.max_occupancy || 0);
    if (maxOcc > 0 && nextGuests > maxOcc) {
      return res.status(400).json({
        success: false,
        code: 'EXCEEDS_CAPACITY',
        message: `This room allows up to ${maxOcc} guest(s).`,
        max_occupancy: maxOcc
      });
    }

    await db.query('UPDATE bookings SET num_guests = ? WHERE id = ?', [Math.floor(nextGuests), bookingId]);
    res.json({ success: true, message: 'Guest count updated successfully.' });
  } catch (error) {
    console.error('updateBookingNumGuests error:', error);
    res.status(500).json({ success: false, message: 'Failed to update guest count' });
  }
};

const rescheduleBooking = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { bookingId, check_in_date, check_out_date } = req.body;
    if (!bookingId || !check_in_date || !check_out_date) {
      return res.status(400).json({
        success: false,
        message: 'bookingId, check_in_date and check_out_date are required'
      });
    }

    const newCheckIn = new Date(check_in_date);
    const newCheckOut = new Date(check_out_date);
    if (Number.isNaN(newCheckIn.getTime()) || Number.isNaN(newCheckOut.getTime()) || newCheckOut <= newCheckIn) {
      return res.status(400).json({ success: false, message: 'Invalid date range.' });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT id, user_id, room_id, status, price_per_night, num_guests, loyalty_free_night
       FROM bookings WHERE id = ? FOR UPDATE`,
      [bookingId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const booking = rows[0];
    if (booking.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You can only modify your own booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending/confirmed bookings can be rescheduled.'
      });
    }

    const [conflicts] = await connection.query(
      `SELECT id FROM bookings
       WHERE room_id = ?
         AND id != ?
         AND status IN ('confirmed', 'checked_in')
         AND check_in_date < ?
         AND check_out_date > ?`,
      [booking.room_id, bookingId, check_out_date, check_in_date]
    );
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Selected dates conflict with another reservation for this room.'
      });
    }

    const nights = Math.max(1, Math.ceil((newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
    const pricePerNight = Number(booking.price_per_night || 0);
    let newTotal = Number((pricePerNight * nights).toFixed(2));
    let loyaltyDiscount = 0;

    if (Number(booking.loyalty_free_night || 0) === 1 && nights >= 1) {
      loyaltyDiscount = pricePerNight;
      newTotal = Number(Math.max(0, newTotal - loyaltyDiscount).toFixed(2));
    }

    const commission = Number((newTotal * PLATFORM_FEE_RATE).toFixed(2));

    await connection.query(
      `UPDATE bookings
       SET check_in_date = ?,
           check_out_date = ?,
           total_nights = ?,
           total_amount = ?,
           loyalty_discount = ?,
           commission_amount = ?
       WHERE id = ?`,
      [check_in_date, check_out_date, nights, newTotal, loyaltyDiscount, commission, bookingId]
    );

    await connection.commit();
    res.json({
      success: true,
      message: 'Booking rescheduled successfully.',
      booking: {
        id: Number(bookingId),
        check_in_date,
        check_out_date,
        total_nights: nights,
        total_amount: newTotal,
        loyalty_discount: loyaltyDiscount,
        commission_amount: commission
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('rescheduleBooking error:', error);
    res.status(500).json({ success: false, message: 'Failed to reschedule booking' });
  } finally {
    connection.release();
  }
};

const getPendingRefunds = async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT rr.*, b.booking_reference, h.name as hotel_name,
             COALESCE(bgd.guest_name, u.full_name) as guest_name
      FROM refund_requests rr
      JOIN bookings b ON rr.booking_id = b.id
      JOIN hotels h ON rr.hotel_id = h.id
      JOIN users u ON rr.user_id = u.id
      LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
      WHERE rr.status = 'pending'
      ORDER BY rr.created_at DESC
    `);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const confirmRefund = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { requestId } = req.body;
    const [requests] = await connection.query("SELECT * FROM refund_requests WHERE id = ?", [requestId]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Request missing' });
    const request = requests[0];

    const [payments] = await connection.query("SELECT * FROM payments WHERE booking_id = ? AND status = 'completed'", [request.booking_id]);
    if (payments.length > 0) {
      try {
        await processKhaltiRefund(payments[0], 'SuperAdmin Approved');
        await connection.query("UPDATE payments SET status = 'refunded' WHERE id = ?", [payments[0].id]);
      } catch (e) { console.error('Auto-refund Khalti error:', e.message); }
    }

    await connection.query("UPDATE refund_requests SET status = 'approved', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?", [req.user.id, requestId]);

    const [bookingRows] = await connection.query(
      "SELECT room_id, user_id, hotel_id, booking_reference FROM bookings WHERE id = ?",
      [request.booking_id]
    );

    await setBookingStatus(connection, {
      bookingId: request.booking_id,
      toStatus: 'cancelled',
      changedBy: req.user.id,
      reason: 'Refund approved by super admin',
      extraFields: {
        payment_status: 'refunded',
        cancelled_at: new Date(),
        cancelled_by: req.user.id
      }
    });

    if (bookingRows.length > 0 && bookingRows[0].room_id) {
      await setRoomStatus(connection, {
        roomId: bookingRows[0].room_id,
        toStatus: 'available',
        changedBy: req.user.id,
        source: 'refund_approved',
        referenceType: 'booking',
        referenceId: request.booking_id
      });
    }

    await connection.commit();

    if (bookingRows.length > 0) {
      await notifyUserBooking(
        bookingRows[0].user_id,
        request.booking_id,
        'Refund approved',
        `Refund for booking ${bookingRows[0].booking_reference} was approved.`
      );
    }
    res.json({ success: true, message: 'Refund complete' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Approval failed' });
  } finally {
    connection.release();
  }
};

const rejectRefund = async (req, res) => {
  try {
    const { requestId, notes } = req.body;
    await db.query("UPDATE refund_requests SET status = 'rejected', admin_notes = ? WHERE id = ?", [notes, requestId]);
    res.json({ success: true, message: 'Rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Rejection failed' });
  }
};


const manualConfirmBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'Booking ID is required' });
        }

        const bookingUpdate = await setBookingStatus(db, {
            bookingId,
            toStatus: 'confirmed',
            changedBy: req.user.id,
            reason: 'Manual confirmation by admin',
            extraFields: {
                payment_status: 'paid',
                confirmed_by: req.user.id,
                confirmed_at: new Date()
            }
        });

        await db.query(
            "UPDATE payments SET status = 'completed', paid_at = CURRENT_TIMESTAMP WHERE booking_id = ?",
            [bookingId]
        );

        if (bookingUpdate?.roomId) {
            await setRoomStatus(db, {
                roomId: bookingUpdate.roomId,
                toStatus: 'booked',
                changedBy: req.user.id,
                source: 'manual_confirm',
                referenceType: 'booking',
                referenceId: bookingId
            });
        }

        const [fullDetails] = await db.query(`
            SELECT b.*, h.name as hotel_name, h.email as hotel_email, r.room_number,
                   bgd.guest_name, bgd.guest_email, bgd.guest_phone,
                   u.email AS booker_email
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id
            LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
            WHERE b.id = ?
        `, [bookingId]);

        if (fullDetails.length > 0) {
            const bd = fullDetails[0];
            const emailData = {
                userName: bd.guest_name,
                hotelName: bd.hotel_name,
                roomNumber: bd.room_number,
                checkIn: new Date(bd.check_in_date).toLocaleDateString(),
                checkOut: new Date(bd.check_out_date).toLocaleDateString(),
                amount: bd.total_amount,
            bookingReference: bd.booking_reference,
            paymentMessage: 'Payment has been marked as completed by admin.',
            paymentStatus: 'Paid (manual confirmation)',
            amountLabel: 'Amount Paid'
            };

            const guestNotifyTo = bd.booker_email || bd.guest_email;
          const confirmEmailJobs = [];
            if (guestNotifyTo) {
            confirmEmailJobs.push(
              emailService.sendBookingConfirmation(guestNotifyTo, emailData)
            );
            }
            if (bd.hotel_email) {
            confirmEmailJobs.push(
              emailService.sendAdminBookingNotification(bd.hotel_email, emailData)
            );
          }
          if (confirmEmailJobs.length > 0) {
            await Promise.allSettled(confirmEmailJobs);
            }
        }

        if (bookingUpdate?.userId) {
            await notifyUserBooking(
                bookingUpdate.userId,
                bookingId,
                'Booking manually confirmed',
                'An admin confirmed your booking and marked payment as completed.'
            );
        }

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

const applyStayExtension = async (connection, booking, additionalNights, extGross, extCommission) => {
  const [upd] = await connection.query(
    `UPDATE bookings SET
      check_out_date = DATE_ADD(check_out_date, INTERVAL ? DAY),
      total_nights = total_nights + ?,
      total_amount = total_amount + ?,
      commission_amount = commission_amount + ?
    WHERE id = ? AND status = 'checked_in'`,
    [additionalNights, additionalNights, extGross, extCommission, booking.id]
  );
  if (upd.affectedRows === 0) {
    throw new Error('Booking is no longer checked in; extension aborted.');
  }
  const paid = booking.payment_status === 'paid';
  const hotelDelta = paid ? (Number(extGross) - Number(extCommission)) : -Number(extCommission);
  await connection.query('UPDATE hotels SET balance = balance + ? WHERE id = ?', [hotelDelta, booking.hotel_id]);
};

const updateHotelBalanceOnCheckIn = async (connection, bookingId) => {
  const [rows] = await connection.query(
    "SELECT hotel_id, total_amount, commission_amount, payment_status, balance_synced FROM bookings WHERE id = ?",
    [bookingId]
  );
  if (rows.length === 0 || rows[0].balance_synced) return;
  const booking = rows[0];

  if (booking.payment_status === 'paid') {
    const netAmount = Number(booking.total_amount) - Number(booking.commission_amount || 0);
    await connection.query('UPDATE hotels SET balance = balance + ? WHERE id = ?', [netAmount, booking.hotel_id]);
  } else {
    await connection.query('UPDATE hotels SET balance = balance - ? WHERE id = ?', [Number(booking.commission_amount || 0), booking.hotel_id]);
  }

  await connection.query('UPDATE bookings SET balance_synced = 1 WHERE id = ?', [bookingId]);
};

const extendStay = async (req, res) => {
  const { bookingId, additional_nights, payment_method } = req.body;
  const nights = Math.min(90, Math.max(1, parseInt(additional_nights, 10) || 0));
  if (!bookingId || nights < 1) {
    return res.status(400).json({ success: false, message: 'bookingId and additional_nights (1–90) are required' });
  }
  const method = String(payment_method || 'khalti').toLowerCase();
  if (!['khalti', 'cash'].includes(method)) {
    return res.status(400).json({ success: false, message: 'payment_method must be khalti or cash' });
  }

  const connection = await db.getConnection();
  let connReleased = false;
  const safeRelease = () => {
    if (!connReleased) {
      connReleased = true;
      connection.release();
    }
  };
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = rows[0];
    if (booking.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You can only extend your own booking' });
    }
    if (booking.status !== 'checked_in') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Extension is only available while you are checked in' });
    }

    const today = new Date().toISOString().split('T')[0];
    const checkoutStr = new Date(booking.check_out_date).toISOString().split('T')[0];
    if (today < checkoutStr) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Stay extension opens on your scheduled check-out date (${checkoutStr}).`
      });
    }

    const [conflicts] = await connection.query(
      `SELECT id FROM bookings
       WHERE room_id = ? AND id != ? AND status IN ('confirmed', 'checked_in')
       AND check_in_date < DATE_ADD(?, INTERVAL ? DAY)
       AND check_out_date > ?`,
      [booking.room_id, bookingId, booking.check_out_date, nights, booking.check_out_date]
    );
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'Those dates conflict with another reservation for this room. Choose fewer nights or ask the hotel.'
      });
    }

    const pricePerNight = Number(booking.price_per_night);
    const extGross = Math.round(pricePerNight * nights * 100) / 100;
    const extCommission = Math.round(extGross * PLATFORM_FEE_RATE * 100) / 100;

    if (method === 'cash') {
      await applyStayExtension(connection, booking, nights, extGross, extCommission);
      await connection.query(
        `INSERT INTO payments (booking_id, amount, payment_method, transaction_id, status, paid_at, notes)
         VALUES (?, ?, 'cash', ?, 'completed', CURRENT_TIMESTAMP, ?)`,
        [bookingId, extGross, `EXT-${bookingId}-${Date.now()}`, `stay_extension:${nights}`]
      );
      await connection.commit();
      safeRelease();
      return res.json({
        success: true,
        method: 'cash',
        message: 'Stay extended. Pay the hotel for the extra nights; the platform fee is reflected in the hotel balance.',
        extension: { additional_nights: nights, amount: extGross, commission: extCommission }
      });
    }

    await connection.query(
      "DELETE FROM payments WHERE booking_id = ? AND status = 'pending' AND notes LIKE 'stay_extension:%'",
      [bookingId]
    );
    const [ins] = await connection.query(
      `INSERT INTO payments (booking_id, amount, payment_method, status, notes)
       VALUES (?, ?, 'khalti', 'pending', ?)`,
      [bookingId, extGross, `stay_extension:${nights}`]
    );
    const paymentRowId = ins.insertId;
    await connection.commit();
    safeRelease();

    const clientOrigin = req.headers.origin
      || (req.headers.referer ? new URL(req.headers.referer).origin : null)
      || process.env.FRONTEND_URL
      || 'http://localhost:3000';

    try {
      const paymentInit = await initializeKhaltiPayment({
        amount: Math.round(extGross * 100),
        purchase_order_id: `EXT${paymentRowId}`.substring(0, 100),
        purchase_order_name: `Stay extension ${nights} night(s)`.substring(0, 50),
        customer_info: {
          name: (req.user.full_name || 'Guest').substring(0, 50),
          email: req.user.email || 'guest@example.com',
          phone: '9800000000'
        },
        return_url: `${clientOrigin}/payment/callback`,
        website_url: clientOrigin
      });
      await db.query(
        'UPDATE payments SET pidx = ?, transaction_id = ? WHERE id = ?',
        [paymentInit.pidx, paymentInit.pidx, paymentRowId]
      );
      return res.json({
        success: true,
        method: 'khalti',
        payment: paymentInit,
        extension: { additional_nights: nights, amount: extGross, commission: extCommission }
      });
    } catch (err) {
      await db.query('DELETE FROM payments WHERE id = ?', [paymentRowId]);
      console.error('Extend stay Khalti error:', err.response?.data || err.message);
      return res.status(500).json({
        success: false,
        message: 'Could not start payment for extension',
        error: err.response?.data || err.message
      });
    }
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) { /* noop */ }
    console.error('extendStay error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Extension failed' });
  } finally {
    safeRelease();
  }
};

const checkInBooking = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { bookingId } = req.body;
    if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID is required' });

    const [existing] = await connection.query("SELECT status, room_id, user_id, hotel_id FROM bookings WHERE id = ?", [bookingId]);
    if (existing.length > 0 && existing[0].status === 'checked_in') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Already checked in' });
    }

    const bookingUpdate = await setBookingStatus(connection, {
      bookingId,
      toStatus: 'checked_in',
      changedBy: req.user.id,
      reason: 'Manual check-in by admin',
      extraFields: {
        checked_in_at: new Date()
      }
    });

    if (bookingUpdate?.roomId) {
      await setRoomStatus(connection, {
        roomId: bookingUpdate.roomId,
        toStatus: 'occupied',
        changedBy: req.user.id,
        source: 'manual_checkin',
        referenceType: 'booking',
        referenceId: bookingId
      });
    }

    await updateHotelBalanceOnCheckIn(connection, bookingId);

    await connection.commit();
    if (bookingUpdate?.userId) {
      await notifyUserBooking(
        bookingUpdate.userId,
        bookingId,
        'Checked in successfully',
        'Your check-in was completed by the hotel.',
        NOTIFICATION_PRIORITIES.HIGH
      );
    }
    res.json({ success: true, message: 'Check-in successful. Balance synced.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Check-in failed', error: error.message });
  } finally {
    connection.release();
  }
};


const checkOutBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ success: false, message: 'Booking ID is required' });

        const bookingUpdate = await setBookingStatus(db, {
            bookingId,
            toStatus: 'checked_out',
            changedBy: req.user?.id || null,
            reason: 'Manual checkout',
            extraFields: {
                checked_out_at: new Date()
            }
        });

        if (bookingUpdate?.roomId) {
            await setRoomStatus(db, {
                roomId: bookingUpdate.roomId,
                toStatus: 'available',
                changedBy: req.user?.id || null,
                source: 'checkout',
                referenceType: 'booking',
                referenceId: bookingId
            });
        }

        if (bookingUpdate?.userId) {
            await notifyUserBooking(
                bookingUpdate.userId,
                bookingId,
                'Checked out',
                'Checkout was completed. Thank you for staying with us.'
            );
        }

        res.json({ success: true, message: 'Guest checked out successfully. Room is now available.' });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({ success: false, message: 'Failed to check out', error: error.message });
    }
};

const generateQRToken = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const [bookings] = await db.query('SELECT id, booking_reference, hotel_id, user_id FROM bookings WHERE id = ?', [bookingId]);

        if (bookings.length === 0) return res.status(404).json({ success: false, message: 'Booking record not found' });

        const booking = bookings[0];

        if (req.user.role === 'guest' && req.user.id != booking.user_id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const token = jwt.sign({
            bookingId: booking.id,
            ref: booking.booking_reference,
            hotelId: booking.hotel_id,
            timestamp: Date.now()
        }, process.env.JWT_SECRET, { expiresIn: '48h' });

        res.json({ success: true, qrToken: token });
    } catch (error) {
        console.error("QR Generation Error:", error);
        res.status(500).json({ success: false, message: 'Encryption service failure', error: error.message });
    }
};

const scanCheckIn = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { qrToken } = req.body;
        if (!qrToken) return res.status(400).json({ success: false, message: 'QR signature required' });

        let decoded;
        try {
            decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ success: false, message: 'INVALID_QR: Signature tampered or expired' });
        }

        const { bookingId, hotelId } = decoded;

        const [rows] = await connection.query(`
            SELECT b.*, h.name as hotel_name, r.room_number, rt.name as room_type,
                   u.full_name AS account_full_name,
                   COALESCE(bgd.guest_name, u.full_name) AS guest_name,
                   bgd.guest_email AS guest_email,
                   bgd.guest_phone AS guest_phone
            FROM bookings b
            JOIN hotels h ON b.hotel_id = h.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
            WHERE b.id = ?
        `, [bookingId]);

        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'BOOKING_MISSING: Reference not found' });
        }

        const booking = rows[0];

        if (req.user.role === 'admin' && req.user.hotel_id !== booking.hotel_id) {
            await connection.query('INSERT INTO scan_logs (booking_id, hotel_id, scanned_by, status, error_message) VALUES (?, ?, ?, ?, ?)',
                [bookingId, booking.hotel_id, req.user.id, 'failed_wrong_hotel', 'Attempted scan at wrong property']);
            await connection.commit();
            return res.status(403).json({ success: false, message: 'WRONG_PROPERTY: This booking belongs to another hotel' });
        }

        if (booking.status === 'checked_in') {
            await connection.query('INSERT INTO scan_logs (booking_id, hotel_id, scanned_by, status, error_message) VALUES (?, ?, ?, ?, ?)',
                [bookingId, booking.hotel_id, req.user.id, 'failed_already_checked_in', 'Guest already checked in']);
            await connection.commit();
            return res.status(400).json({ success: false, message: 'ALREADY_ACTIVE: Guest has already been checked in' });
        }

        if (booking.status === 'cancelled') {
            await connection.query('INSERT INTO scan_logs (booking_id, hotel_id, scanned_by, status, error_message) VALUES (?, ?, ?, ?, ?)',
                [bookingId, booking.hotel_id, req.user.id, 'failed_cancelled', 'Booking cancelled']);
            await connection.commit();
            return res.status(400).json({ success: false, message: 'NOT_VALID: This booking was cancelled or refunded' });
        }

        const today = new Date().toISOString().split('T')[0];
        const checkInDate = new Date(booking.check_in_date).toISOString().split('T')[0];
        if (today < checkInDate) {
            return res.status(400).json({ success: false, message: `EARLY_ARRIVAL: Check-in only allowed from ${checkInDate}` });
        }

        await setBookingStatus(connection, {
            bookingId,
            toStatus: 'checked_in',
            changedBy: req.user.id,
            reason: 'QR check-in',
            extraFields: {
                checked_in_at: new Date()
            }
        });

        await setRoomStatus(connection, {
            roomId: booking.room_id,
            toStatus: 'occupied',
            changedBy: req.user.id,
            source: 'qr_checkin',
            referenceType: 'booking',
            referenceId: bookingId
        });

        await updateHotelBalanceOnCheckIn(connection, bookingId);

        await connection.query('INSERT INTO scan_logs (booking_id, hotel_id, scanned_by, status) VALUES (?, ?, ?, ?)',
            [bookingId, booking.hotel_id, req.user.id, 'success']);

        await connection.commit();

        await notifyUserBooking(
            booking.user_id,
            bookingId,
            'Checked in via QR',
            `Your check-in for booking ${booking.booking_reference} is complete.`,
            NOTIFICATION_PRIORITIES.HIGH
        );

        res.json({
            success: true,
            message: 'CHECKIN_COMPLETE: Guest successfully processed',
            guest: {
                name: booking.guest_name || booking.account_full_name,
                email: booking.guest_email,
                phone: booking.guest_phone
            },
            room: {
                number: booking.room_number,
                type: booking.room_type
            },
            booking: {
                reference: booking.booking_reference,
                stay: `${new Date(booking.check_in_date).toLocaleDateString()} to ${new Date(booking.check_out_date).toLocaleDateString()}`
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Scan check-in protocol error:', error);
        res.status(500).json({ success: false, message: 'Internal validation failure' });
    } finally {
        connection.release();
    }
};

const requestPayout = async (req, res) => {
  try {
    const { amount, notes } = req.body;
    const hotelId = req.user.hotel_id;

    if (!hotelId) return res.status(403).json({ success: false, message: 'Only hotel admins can request payouts.' });
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid payout amount.' });

    const [hotels] = await db.query("SELECT balance FROM hotels WHERE id = ?", [hotelId]);
    if (hotels.length === 0) return res.status(404).json({ success: false, message: 'Hotel not found.' });
    
    const availableBalance = Number(hotels[0].balance);
    if (amount > availableBalance) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: Rs. ${availableBalance.toLocaleString()}` });
    }

    const [pending] = await db.query("SELECT id FROM hotel_payout_requests WHERE hotel_id = ? AND status = 'pending'", [hotelId]);
    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a pending payout request.' });
    }

    await db.query(
      "INSERT INTO hotel_payout_requests (hotel_id, amount, notes) VALUES (?, ?, ?)",
      [hotelId, amount, notes || 'Standard payout request']
    );

    res.json({ success: true, message: 'Payout request submitted successfully. SuperAdmin will review it shortly.' });
  } catch (error) {
    console.error('Payout Request Error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit payout request.' });
  }
};

const getPendingPayouts = async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, h.name as hotel_name, h.balance as current_balance
      FROM hotel_payout_requests pr
      JOIN hotels h ON pr.hotel_id = h.id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `);
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fetch failed' });
  }
};

const approvePayout = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { requestId, adminNotes } = req.body;

    const [requests] = await connection.query("SELECT * FROM hotel_payout_requests WHERE id = ?", [requestId]);
    if (requests.length === 0) return res.status(404).json({ success: false, message: 'Request missing' });
    const request = requests[0];

    if (request.status !== 'pending') {
       return res.status(400).json({ success: false, message: 'Request already processed.' });
    }

    const [hotels] = await connection.query("SELECT balance FROM hotels WHERE id = ?", [request.hotel_id]);
    if (hotels.length === 0) throw new Error('Hotel not found');
    
    if (Number(hotels[0].balance) < Number(request.amount)) {
       throw new Error('Insufficient hotel balance at time of approval.');
    }

    await connection.query("UPDATE hotels SET balance = balance - ? WHERE id = ?", [request.amount, request.hotel_id]);
    await connection.query("UPDATE hotel_payout_requests SET status = 'completed', admin_notes = ? WHERE id = ?", [adminNotes || 'Approved and processed', requestId]);
    await connection.query(
      `INSERT INTO hotel_payout_transactions
       (payout_request_id, hotel_id, amount, transaction_reference, status, processed_by, processed_at, notes)
       VALUES (?, ?, ?, ?, 'completed', ?, CURRENT_TIMESTAMP, ?)`,
      [
        requestId,
        request.hotel_id,
        request.amount,
        `PAYOUT-${requestId}-${Date.now()}`,
        req.user.id,
        adminNotes || 'Approved and processed'
      ]
    );

    await connection.commit();
    res.json({ success: true, message: 'Payout approved and balance updated.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message || 'Approval failed' });
  } finally {
    connection.release();
  }
};

const rejectPayout = async (req, res) => {
  try {
    const { requestId, adminNotes } = req.body;
    await db.query("UPDATE hotel_payout_requests SET status = 'rejected', admin_notes = ? WHERE id = ?", [adminNotes, requestId]);
    res.json({ success: true, message: 'Payout request rejected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Rejection failed' });
  }
};

module.exports = {
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
};
