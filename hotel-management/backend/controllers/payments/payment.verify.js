const { axios, db, setBookingStatus, setRoomStatus, emailService, notificationEvents, KHALTI_AUTH_HEADER, KHALTI_LOOKUP_URL, PLATFORM_FEE_RATE, notifyUserBooking, notifyHotelAdminsBooking } = require('./payment.shared');
const { applyStayExtension } = require('./payment.stayqr');

const verifyPayment = async (req, res) => {
    try {
        let { pidx, purchase_order_id } = req.body;
        console.log(`[Khalti] Verification request received. pidx: ${pidx}, id: ${purchase_order_id}`);

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

        pidx = String(pidx).trim();

        const response = await axios.post(KHALTI_LOOKUP_URL, { pidx }, {
            headers: {
                'Authorization': KHALTI_AUTH_HEADER,
                'Content-Type': 'application/json'
            }
        });

        const statusData = response.data;
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

            // Lookup response often lacks purchase_order_id; fall back to payments row by pidx.
            const rawPoid = String(statusData.purchase_order_id || req.body.purchase_order_id || '').trim();
            let booking_ids = rawPoid
                .split('-')
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id));

            if (booking_ids.length === 0) {
                const [pendingBookings] = await db.query(
                    `SELECT DISTINCT booking_id FROM payments
                     WHERE (pidx = ? OR transaction_id = ?) AND status = 'pending'
                       AND (notes IS NULL OR notes NOT LIKE 'stay_extension:%')`,
                    [pidx, pidx]
                );
                booking_ids = pendingBookings.map((r) => r.booking_id);
            }

            if (booking_ids.length === 0 && !/^EXT\d+$/i.test(rawPoid)) {
                const [alreadyPaid] = await db.query(
                    `SELECT DISTINCT p.booking_id
                     FROM payments p
                     INNER JOIN bookings b ON b.id = p.booking_id
                     WHERE p.pidx = ?
                       AND p.status = 'completed'
                       AND (p.notes IS NULL OR p.notes NOT LIKE 'stay_extension:%')
                       AND b.payment_status = 'paid'`,
                    [pidx]
                );
                if (alreadyPaid.length > 0) {
                    return res.json({
                        success: true,
                        message: 'Payment verified successfully.',
                        status: 'Completed',
                        data: statusData,
                        alreadyVerified: true
                    });
                }

                const [recoverIds] = await db.query(
                    `SELECT DISTINCT p.booking_id
                     FROM payments p
                     INNER JOIN bookings b ON b.id = p.booking_id
                     WHERE p.pidx = ?
                       AND p.status = 'completed'
                       AND (p.notes IS NULL OR p.notes NOT LIKE 'stay_extension:%')
                       AND b.payment_status <> 'paid'`,
                    [pidx]
                );
                if (recoverIds.length > 0) {
                    booking_ids = recoverIds.map((r) => r.booking_id);
                }
            }

            if (booking_ids.length === 0 && !/^EXT\d+$/i.test(rawPoid)) {
                console.error('[Khalti] Completed payment but could not resolve booking ids (no purchase_order_id, no pending row, not idempotent):', {
                    pidx,
                    statusData
                });
                return res.status(400).json({
                    success: false,
                    message: 'Payment verified but booking references missing in Khalti response.',
                    data: statusData
                });
            }

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
            const bookingIds = String(statusData.purchase_order_id || '')
                .split('-')
                .map((id) => parseInt(id.trim(), 10))
                .filter((id) => !isNaN(id));

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
        console.error('[Khalti] Critical Lookup Failure:', khaltiError);
        console.error(error.stack);
        await notificationEvents.notifySystemAlert({
            title: 'Payment gateway issue',
            message: `Khalti verification failed: ${String(error.response?.status || '')} ${String(error.message || '').slice(0, 180)}`
        });

        const errorMessage = error.response?.data
            ? `Khalti Error: ${JSON.stringify(error.response.data)}`
            : `Network/Server Error: ${error.message}`;

        res.status(error.response?.status || 500).json({
            success: false,
            message: `Verification failed: ${errorMessage}`,
            details: khaltiError,
            tip: error.response?.status === 401 ? 'Check if your KHALTI_SECRET_KEY in .env is correct for V2 APIs.' : 'Ensure your network allows connections to a.khalti.com'
        });
    }
};


module.exports = {
    verifyPayment
};
