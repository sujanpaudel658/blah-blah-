const { db, jwt, setBookingStatus, setRoomStatus, NOTIFICATION_PRIORITIES, RAW_KEY, initializeKhaltiPayment, PLATFORM_FEE_RATE, notifyUserBooking } = require('./payment.shared');

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



module.exports = {
  applyStayExtension,
  updateHotelBalanceOnCheckIn,
  extendStay,
  checkInBooking,
  checkOutBooking,
  generateQRToken,
  scanCheckIn
};
