const {
  db,
  setBookingStatus,
  setRoomStatus,
  notificationEvents,
  notifyUserBooking,
  processKhaltiRefund,
  NOTIFICATION_PRIORITIES,
  emailService
} = require('./payment.shared');
const { REFUND_REJECTION_CATEGORIES } = require('../../constants/refund.constants');

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
    const id = parseInt(bookingId, 10);
    const ng = parseInt(num_guests, 10);
    if (!id || !Number.isFinite(ng) || ng < 1) {
      return res.status(400).json({
        success: false,
        message: 'Valid bookingId and num_guests (at least 1) are required.'
      });
    }

    const [rows] = await db.query(
      `SELECT b.id, b.user_id, b.status, rt.max_occupancy
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       WHERE b.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = rows[0];
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own booking' });
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Guest count can only be changed before check-in.'
      });
    }
    const maxOcc = Number(booking.max_occupancy || 99);
    if (ng > maxOcc) {
      return res.status(400).json({
        success: false,
        message: `This room allows at most ${maxOcc} guest(s).`
      });
    }

    await db.query('UPDATE bookings SET num_guests = ? WHERE id = ?', [ng, id]);
    res.json({ success: true, message: 'Number of guests updated.' });
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
      const br = bookingRows[0];
      const amtLabel = Number(request.amount || 0).toLocaleString();
      await notifyUserBooking(
        br.user_id,
        request.booking_id,
        'Refund approved',
        `Your refund of NRs. ${amtLabel} for booking ${br.booking_reference} has been processed.`,
        NOTIFICATION_PRIORITIES.HIGH
      );

      try {
        const [userRows] = await db.query(
          'SELECT email, full_name FROM users WHERE id = ? LIMIT 1',
          [br.user_id]
        );
        const [hotelRows] = await db.query('SELECT name FROM hotels WHERE id = ? LIMIT 1', [request.hotel_id]);
        const u = userRows[0];
        const h = hotelRows[0];
        if (u?.email) {
          await emailService.sendRefundProcessedEmail(u.email, {
            guestName: u.full_name || 'Guest',
            bookingReference: br.booking_reference,
            hotelName: h?.name || 'Hotel',
            amount: request.amount
          });
        }
      } catch (mailErr) {
        console.error('[refund] confirmation email failed:', mailErr.message);
      }
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
    const { requestId, rejectionCategory, additionalNotes } = req.body;
    const category = typeof rejectionCategory === 'string' ? rejectionCategory.trim() : '';
    const notesExtra =
      additionalNotes != null && String(additionalNotes).trim() ? String(additionalNotes).trim() : null;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'requestId is required.' });
    }
    if (!category || !REFUND_REJECTION_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Select a valid rejection reason from the list.'
      });
    }

    const [rows] = await db.query(
      `SELECT rr.id, rr.booking_id, rr.user_id, rr.hotel_id, rr.amount,
              b.booking_reference,
              h.name AS hotel_name
       FROM refund_requests rr
       JOIN bookings b ON b.id = rr.booking_id
       JOIN hotels h ON h.id = rr.hotel_id
       WHERE rr.id = ? AND rr.status = 'pending'`,
      [requestId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pending refund request not found.' });
    }

    const row = rows[0];

    await db.query(
      `UPDATE refund_requests
       SET status = 'rejected',
           rejection_category = ?,
           admin_notes = ?
       WHERE id = ?`,
      [category, notesExtra, requestId]
    );

    const msgParts = [`Reason: ${category}.`];
    if (notesExtra) msgParts.push(`Details: ${notesExtra}`);
    await notifyUserBooking(
      row.user_id,
      row.booking_id,
      'Refund request not approved',
      `Your refund request for booking ${row.booking_reference} could not be approved. ${msgParts.join(' ')}`,
      NOTIFICATION_PRIORITIES.HIGH
    );

    try {
      const [userRows] = await db.query('SELECT email, full_name FROM users WHERE id = ? LIMIT 1', [row.user_id]);
      const u = userRows[0];
      if (u?.email) {
        await emailService.sendRefundRejectedEmail(u.email, {
          guestName: u.full_name || 'Guest',
          bookingReference: row.booking_reference,
          hotelName: row.hotel_name,
          rejectionCategory: category,
          additionalNotes: notesExtra
        });
      }
    } catch (mailErr) {
      console.error('[refund] rejection email failed:', mailErr.message);
    }

    res.json({ success: true, message: 'Refund request rejected.' });
  } catch (error) {
    console.error('rejectRefund:', error);
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

module.exports = {
  refundPayment,
  cancelBooking,
  updateBookingGuestDetails,
  updateBookingNumGuests,
  rescheduleBooking,
  getPendingRefunds,
  confirmRefund,
  rejectRefund,
  manualConfirmBooking
};
