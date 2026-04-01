const db = require('../config/db');

function getQueryable(queryable) {
    return queryable && typeof queryable.query === 'function' ? queryable : db;
}

async function setBookingStatus(queryable, options) {
    const q = getQueryable(queryable);
    const {
        bookingId,
        toStatus,
        changedBy = null,
        reason = null,
        extraFields = null
    } = options || {};

    if (!bookingId || !toStatus) return null;

    const [rows] = await q.query(
        `SELECT id, status, room_id, user_id, hotel_id
         FROM bookings
         WHERE id = ?`,
        [bookingId]
    );
    if (!rows.length) return null;

    const current = rows[0];
    const updates = [];
    const params = [];

    if (current.status !== toStatus) {
        updates.push('status = ?');
        params.push(toStatus);
    }

    if (extraFields && typeof extraFields === 'object') {
        for (const [key, value] of Object.entries(extraFields)) {
            updates.push(`${key} = ?`);
            params.push(value);
        }
    }

    if (updates.length > 0) {
        params.push(bookingId);
        await q.query(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (current.status !== toStatus) {
        await q.query(
            `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [bookingId, current.status, toStatus, changedBy, reason]
        );
    }

    return {
        bookingId: current.id,
        roomId: current.room_id,
        userId: current.user_id,
        hotelId: current.hotel_id,
        fromStatus: current.status,
        toStatus,
        changed: current.status !== toStatus
    };
}

async function setRoomStatus(queryable, options) {
    const q = getQueryable(queryable);
    const {
        roomId,
        toStatus,
        changedBy = null,
        source = null,
        referenceType = null,
        referenceId = null,
        notes = null
    } = options || {};

    if (!roomId || !toStatus) return null;

    const [rows] = await q.query('SELECT id, status FROM rooms WHERE id = ?', [roomId]);
    if (!rows.length) return null;

    const current = rows[0];

    if (current.status !== toStatus) {
        await q.query('UPDATE rooms SET status = ? WHERE id = ?', [toStatus, roomId]);
    }

    await q.query(
        `INSERT INTO room_status_history
         (room_id, from_status, to_status, source, reference_type, reference_id, changed_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [roomId, current.status, toStatus, source, referenceType, referenceId, changedBy, notes]
    );

    return {
        roomId: current.id,
        fromStatus: current.status,
        toStatus,
        changed: current.status !== toStatus
    };
}

module.exports = {
    setBookingStatus,
    setRoomStatus
};
