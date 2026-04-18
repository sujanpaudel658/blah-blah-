const db = require('../config/db');
const notificationService = require('./notification.service');
const { setBookingStatus, setRoomStatus } = require('./statusTimeline.service');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require('../constants/notification.constants');

const UNPAID_NO_SHOW_REASON =
    'Auto-cancel: unpaid booking with no check-in within 1 hour after standard check-in time.';

// Hotel check-in time → HH:MM:SS for SQL.
function normalizeCheckInTime(raw) {
    const t = String(raw || '14:00:00').trim();
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) {
        const [h, m, s] = t.split(':').map((x) => parseInt(x, 10));
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }
    if (/^\d{1,2}:\d{2}$/.test(t)) {
        const [h, m] = t.split(':').map((x) => parseInt(x, 10));
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
        }
    }
    return '14:00:00';
}

function applyNoShowBanIfNeeded(userId, newCount, logPrefix) {
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
        return db
            .query('UPDATE users SET account_status = ?, ban_until = ? WHERE id = ?', [
                newStatus,
                banUntil,
                userId
            ])
            .then(() => {
                console.log(`${logPrefix} User ${userId} account_status → ${newStatus}`);
            });
    }
    return Promise.resolve();
}

// Pay-at-hotel still unpaid + no check-in → cancel after grace window.
async function finalizePayAtHotelNoShow(booking, logPrefix = '[NoShowService]') {
    const now = new Date();
    const statusResult = await setBookingStatus(db, {
        bookingId: booking.id,
        toStatus: 'cancelled',
        reason: UNPAID_NO_SHOW_REASON,
        extraFields: {
            cancelled_at: now
        }
    });
    if (!statusResult || !statusResult.changed) return;

    console.log(`${logPrefix} Unpaid no-show auto-cancel: ${booking.booking_reference} (booking ${booking.id})`);

    const newCount = (booking.no_show_count || 0) + 1;
    await db.query('UPDATE users SET no_show_count = ? WHERE id = ?', [newCount, booking.user_id]);

    await applyNoShowBanIfNeeded(booking.user_id, newCount, logPrefix);

    if (booking.room_id) {
        await setRoomStatus(db, {
            roomId: booking.room_id,
            toStatus: 'available',
            source: 'no_show_service',
            referenceType: 'booking',
            referenceId: booking.id,
            notes: 'Released: pay-at-hotel no-show (1h after check-in time)'
        });
    }

    try {
        await notificationService.saveNotification({
            userId: booking.user_id,
            role: 'user',
            title: 'Booking auto-cancelled',
            message: `Booking ${booking.booking_reference} was auto-cancelled because check-in did not happen within the allowed unpaid window.`,
            type: NOTIFICATION_TYPES.BOOKING,
            referenceId: booking.id,
            priority: NOTIFICATION_PRIORITIES.MEDIUM
        });
    } catch (e) {
        console.error('[NoShowService] Notification error:', e.message);
    }
}

// Cron: unpaid + past check-in date/time + 1h → auto-cancel.
async function processPayAtHotelNoShowAfterDeadline() {
    try {
        if (String(process.env.DISABLE_PAY_AT_HOTEL_NO_SHOW || '').toLowerCase() === 'true') {
            return;
        }

        const checkInTime = normalizeCheckInTime(process.env.DEFAULT_CHECK_IN_TIME);

        const [candidates] = await db.query(
            `
            SELECT b.*, u.no_show_count
            FROM bookings b
            INNER JOIN users u ON b.user_id = u.id
            WHERE b.status IN ('confirmed', 'pending')
              AND b.payment_status = 'pending'
              AND b.checked_in_at IS NULL
              AND NOW() >= DATE_ADD(TIMESTAMP(b.check_in_date, ?), INTERVAL 1 HOUR)
            `,
            [checkInTime]
        );

        if (candidates.length === 0) return;

        for (const booking of candidates) {
            await finalizePayAtHotelNoShow(booking);
        }
    } catch (error) {
        console.error('[NoShowService] Pay-at-hotel no-show error:', error.message);
    }
}

// confirmed no-show: status, optional refund row, ban tier, release room.
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

    await applyNoShowBanIfNeeded(booking.user_id, newCount, logPrefix);

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

// Same day after 12:00: drop `pending` bookings that never confirmed; free room.
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

// Block banned / temp-banned guests (no-show policy).
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
    processPayAtHotelNoShowAfterDeadline,
    checkBanStatus
};
