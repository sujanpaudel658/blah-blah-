const { db, emailService, LOYALTY_THRESHOLD, setBookingStatus, setRoomStatus, notificationEvents, RAW_KEY, initializeKhaltiPayment, notifyUserBooking, notifyHotelAdminsBooking } = require('./payment.shared');

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
                amount: Math.round(expectedTotal * 100), // Amount in paisa, strictly rounded to int
                purchase_order_id: bookingIds.join('-').substring(0, 100), // hyphen separated booking IDs
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

module.exports = {
  initiatePayment,
  initiatePayOnlineForBooking
};
