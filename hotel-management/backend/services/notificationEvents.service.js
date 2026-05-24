const notificationService = require('./notification.service');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_ROLES
} = require('../constants/notification.constants');

const notifyBookingCreated = async ({ bookingId, bookingReference, userId, hotelId }) => {
  const adminRecipients = await notificationService.getAdminRecipientsForHotel(hotelId);
  const recipients = [
    ...adminRecipients,
    { role: USER_ROLES.USER, userId }
  ];

  return notificationService.enqueueEvent({
    eventType: 'booking.created',
    priority: 8,
    payload: {
      title: 'New booking created',
      message: `Booking ${bookingReference || bookingId} has been created.`,
      type: NOTIFICATION_TYPES.BOOKING,
      referenceId: bookingId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients
    }
  });
};

const notifyBookingCancelled = async ({ bookingId, bookingReference, userId, hotelId }) => {
  const adminRecipients = await notificationService.getAdminRecipientsForHotel(hotelId);
  const recipients = [
    ...adminRecipients,
    { role: USER_ROLES.USER, userId }
  ];
  return notificationService.enqueueEvent({
    eventType: 'booking.cancelled',
    priority: 8,
    payload: {
      title: 'Booking cancelled',
      message: `Booking ${bookingReference || bookingId} was cancelled.`,
      type: NOTIFICATION_TYPES.BOOKING,
      referenceId: bookingId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients
    }
  });
};

const notifyPaymentFailed = async ({ bookingId, userId, hotelId, reason }) => {
  const adminRecipients = await notificationService.getAdminRecipientsForHotel(hotelId);
  const recipients = [
    ...adminRecipients,
    { role: USER_ROLES.USER, userId }
  ];
  return notificationService.enqueueEvent({
    eventType: 'payment.failed',
    priority: 10,
    payload: {
      title: 'Payment failed',
      message: `Payment failed for booking ${bookingId}. ${reason || ''}`.trim(),
      type: NOTIFICATION_TYPES.PAYMENT,
      referenceId: bookingId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients
    }
  });
};

const notifyStayExtended = async ({
  bookingId,
  bookingReference,
  userId,
  hotelId,
  guestName,
  additionalNights,
  newCheckOutDate,
  message
}) => {
  const adminRecipients = await notificationService.getAdminRecipientsForHotel(hotelId);
  const nightLabel =
    Number(additionalNights) === 1 ? '1 night' : `${Number(additionalNights) || 0} nights`;
  const body =
    message ||
    `${guestName || 'Guest'} extended ${nightLabel} — new checkout ${newCheckOutDate || 'updated'}.`;

  return notificationService.enqueueEvent({
    eventType: 'booking.stay_extended',
    priority: 9,
    payload: {
      title: 'Stay extended',
      message: body,
      type: NOTIFICATION_TYPES.BOOKING,
      referenceId: bookingId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients: adminRecipients
    }
  });
};

const notifyPaymentSuccess = async ({ bookingId, userId, hotelId }) => {
  const adminRecipients = await notificationService.getAdminRecipientsForHotel(hotelId);
  const recipients = [
    ...adminRecipients,
    { role: USER_ROLES.USER, userId }
  ];
  return notificationService.enqueueEvent({
    eventType: 'payment.success',
    priority: 8,
    payload: {
      title: 'Payment successful',
      message: `Payment received for booking ${bookingId}.`,
      type: NOTIFICATION_TYPES.PAYMENT,
      referenceId: bookingId,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      recipients
    }
  });
};

const notifyHotelCreated = async ({ hotelId, hotelName }) => {
  const superAdmins = await notificationService.getSuperAdminRecipients();
  return notificationService.enqueueEvent({
    eventType: 'hotel.created',
    priority: 8,
    payload: {
      title: 'New hotel/property added',
      message: `${hotelName || 'A hotel'} was added and is pending/created in the system.`,
      type: NOTIFICATION_TYPES.SYSTEM,
      referenceId: hotelId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients: superAdmins
    }
  });
};

const notifyAdminAccountChanged = async ({ adminId, action }) => {
  const superAdmins = await notificationService.getSuperAdminRecipients();
  return notificationService.enqueueEvent({
    eventType: 'admin.account.changed',
    priority: 8,
    payload: {
      title: 'Admin account change',
      message: `Admin account ${adminId} ${action || 'was updated'}.`,
      type: NOTIFICATION_TYPES.SYSTEM,
      referenceId: adminId,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      recipients: superAdmins
    }
  });
};

const notifyHotelListingRejected = async ({ ownerId, hotelId, hotelName, reason }) => {
  if (!ownerId) return null;
  const name = hotelName || 'your property';
  const detail =
    reason && String(reason).trim()
      ? String(reason).trim()
      : 'You may review our partner requirements and submit a new application when ready.';
  return notificationService.saveNotification({
    userId: ownerId,
    role: USER_ROLES.USER,
    title: 'Partner listing not approved',
    message: `Your listing request for "${name}" was not approved. ${detail}`,
    type: NOTIFICATION_TYPES.SYSTEM,
    referenceId: hotelId,
    priority: NOTIFICATION_PRIORITIES.HIGH
  });
};

const notifySystemAlert = async ({ title, message, referenceId = null }) => {
  const superAdmins = await notificationService.getSuperAdminRecipients();
  return notificationService.enqueueEvent({
    eventType: 'system.alert',
    priority: 10,
    payload: {
      title: title || 'System alert',
      message: message || 'An internal system issue occurred.',
      type: NOTIFICATION_TYPES.SYSTEM,
      referenceId,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      recipients: superAdmins
    }
  });
};

module.exports = {
  notifyBookingCreated,
  notifyBookingCancelled,
  notifyStayExtended,
  notifyPaymentFailed,
  notifyPaymentSuccess,
  notifyHotelCreated,
  notifyHotelListingRejected,
  notifyAdminAccountChanged,
  notifySystemAlert
};
