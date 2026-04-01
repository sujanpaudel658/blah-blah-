const db = require('../config/db');
const notificationService = require('./notification.service');
const { setBookingStatus, setRoomStatus } = require('./statusTimeline.service');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require('../constants/notification.constants');

/**
 * Shared: mark booking no-show, penalties, ban, free room.
 * Expects `booking` from a join with users (no_show_count on booking row).
 */
async function finalizeNoShowBooking(booking, logPrefix = '[NoShowService]') {
    const statusResult = await setBookingStatus(db, {
        bookingId: booking.id,
        toStatus: 'no_show',
        reason: 'Auto no-show processing'
    });
    if (!statusResult || !statusResult.changed) return;

    console.log(`${logPrefix} Finalizing no-show for REF: ${booking.booking_reference}`);

    const newCount = (booking.no_show_count || 0) + 1;
    await db.query('UPDATE users SET no_show_count = ? WHERE id = ?', [newCount, booking.user_id]);

    if (booking.payment_status === 'paid') {
        const penaltyAmount = Number(booking.price_per_night);
        const refundAmount = Number(booking.total_amount) - penaltyAmount;

        if (refundAmount > 0) {
            await db.query(
                `
                INSERT INTO refund_requests (booking_id, user_id, hotel_id, amount, reason, status)
                VALUES (?, ?, ?, ?, 'System: Automated No-Show Penalty (1st night withheld)', 'pending')
                `,
                [booking.id, booking.user_id, booking.hotel_id, refundAmount]
            );
        }
    }

    let newStatus = 'active';
    let banUntil = null;

    if (newCount >= 5) {
        newStatus = 'perm_banned';
    } else if (newCount >= 3) {
        newStatus = 'temp_banned';
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        banUntil = date;
    }

    if (newStatus !== 'active') {
        await db.query('UPDATE users SET account_status = ?, ban_until = ? WHERE id = ?', [
            newStatus,
            banUntil,
            booking.user_id
        ]);
        console.log(`${logPrefix} User ${booking.user_id} status updated to ${newStatus}`);
    }

    if (booking.room_id) {
        await setRoomStatus(db, {
            roomId: booking.room_id,
            toStatus: 'available',
            source: 'no_show_service',
            referenceType: 'booking',
            referenceId: booking.id,
            notes: 'Released after no-show'
        });
    }

    try {
        await notificationService.saveNotification({
            userId: booking.user_id,
            role: 'user',
            title: 'Booking marked as no-show',
            message: `Booking ${booking.booking_reference} was marked as no-show.`,
            type: NOTIFICATION_TYPES.BOOKING,
            referenceId: booking.id,
            priority: NOTIFICATION_PRIORITIES.MEDIUM
        });
    } catch (e) {
        console.error('[NoShowService] Notification error:', e.message);
    }
}

/**
 * Same-day after 12:00 (DB session time): only still-unconfirmed bookings release the room.
 * Confirmed stays are kept for prepaid (payment_status paid) and pay-at-hotel (confirmed + pending payment).
 */
async function processNoonCheckInRelease() {
    try {
        if (String(process.env.DISABLE_NOON_NO_SHOW || '').toLowerCase() === 'true') return;

        const [pendingRelease] = await db.query(
            `
            SELECT id, room_id, booking_reference
            FROM bookings
            WHERE status = 'pending'
              AND check_in_date = CURDATE()
              AND CURTIME() >= '12:00:00'
            `
        );

        if (pendingRelease.length === 0) {
            return;
        }

        for (const b of pendingRelease) {
            console.log(`[NoShowService] Noon release (pending→cancelled): ${b.booking_reference}`);
            const changed = await setBookingStatus(db, {
                bookingId: b.id,
                toStatus: 'cancelled',
                reason: 'Auto: Unconfirmed booking — no check-in by 12:00 on check-in date.',
                extraFields: {
                    cancellation_reason: 'Auto: Unconfirmed booking — no check-in by 12:00 on check-in date.',
                    cancelled_at: new Date()
                }
            });
            if (changed && changed.changed && b.room_id) {
                await setRoomStatus(db, {
                    roomId: b.room_id,
                    toStatus: 'available',
                    source: 'no_show_service',
                    referenceType: 'booking',
                    referenceId: b.id,
                    notes: 'Released due to noon unconfirmed booking expiry'
                });
            }
        }
    } catch (error) {
        console.error('[NoShowService] Noon release error:', error.message);
    }
}

async function processNoShows() {
    try {
        const [noShows] = await db.query(`
            SELECT b.*, u.no_show_count, u.account_status 
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.status = 'confirmed'
            AND b.payment_status NOT IN ('paid', 'pending')
            AND b.check_in_date < DATE_SUB(NOW(), INTERVAL 1 DAY)
        `);

        if (noShows.length === 0) return;

        for (const booking of noShows) {
            await finalizeNoShowBooking(booking);
        }
    } catch (error) {
        console.error('[NoShowService] CRITICAL ERROR:', error.message);
    }
}

/**
 * Middleware to check if a user is currently banned.
 */
async function checkBanStatus(req, res, next) {
    try {
        const userId = req.user.id;
        const [users] = await db.query('SELECT account_status, ban_until FROM users WHERE id = ?', [userId]);

        if (users.length === 0) return next();
        const user = users[0];

        if (user.account_status === 'perm_banned') {
            return res.status(403).json({
                success: false,
                message:
                    'This account has been permanently suspended due to repeated no-shows. Please contact support.'
            });
        }

        if (user.account_status === 'temp_banned') {
            const now = new Date();
            const banDate = new Date(user.ban_until);

            if (now < banDate) {
                return res.status(403).json({
                    success: false,
                    message: `Account suspended until ${banDate.toLocaleDateString()}. Please adhere to your booking dates in the future.`
                });
            }
            await db.query("UPDATE users SET account_status = 'active', ban_until = NULL WHERE id = ?", [userId]);
        }

        next();
    } catch (error) {
        next();
    }
}

module.exports = {
    processNoShows,
    processNoonCheckInRelease,
    checkBanStatus
};
