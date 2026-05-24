const db = require('../config/db');
const notificationEvents = require('./notificationEvents.service');

function formatCheckoutDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadBookingExtensionContext(bookingId, connection = null) {
  const runner = connection || db;
  const [rows] = await runner.query(
    `SELECT b.id, b.booking_reference, b.user_id, b.hotel_id, b.check_out_date,
            COALESCE(bgd.guest_name, u.full_name, 'Guest') AS guest_name
     FROM bookings b
     LEFT JOIN users u ON b.user_id = u.id
     LEFT JOIN booking_guest_details bgd ON bgd.booking_id = b.id
     WHERE b.id = ?
     LIMIT 1`,
    [bookingId]
  );
  return rows[0] || null;
}

async function notifyHotelAdminsStayExtended({ bookingId, additionalNights, newCheckOutDate, connection = null }) {
  const ctx = await loadBookingExtensionContext(bookingId, connection);
  if (!ctx) return;

  const nights = Number(additionalNights) || 0;
  const checkoutLabel = formatCheckoutDate(newCheckOutDate || ctx.check_out_date);
  const guestName = ctx.guest_name || 'Guest';
  const nightLabel = nights === 1 ? '1 night' : `${nights} nights`;

  await notificationEvents.notifyStayExtended({
    bookingId: ctx.id,
    bookingReference: ctx.booking_reference,
    userId: ctx.user_id,
    hotelId: ctx.hotel_id,
    guestName,
    additionalNights: nights,
    newCheckOutDate: checkoutLabel,
    message: `${guestName} extended ${nightLabel} — new checkout ${checkoutLabel}.`
  });
}

module.exports = {
  notifyHotelAdminsStayExtended,
  formatCheckoutDate
};
