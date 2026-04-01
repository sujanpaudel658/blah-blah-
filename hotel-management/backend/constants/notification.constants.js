const USER_ROLES = Object.freeze({
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin',
  USER: 'user'
});

const NOTIFICATION_TYPES = Object.freeze({
  BOOKING: 'booking',
  PAYMENT: 'payment',
  OFFER: 'offer',
  SYSTEM: 'system',
  SECURITY: 'security',
  LOYALTY: 'loyalty'
});

const NOTIFICATION_PRIORITIES = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
});

const OFFER_TYPES = Object.freeze({
  PERCENTAGE: 'percentage',
  FLAT: 'flat',
  SEASONAL: 'seasonal',
  COUPON: 'coupon',
  LOYALTY: 'loyalty'
});

const USER_SEGMENTS = Object.freeze({
  NEW: 'new',
  FREQUENT: 'frequent',
  INACTIVE: 'inactive',
  ALL: 'all'
});

module.exports = {
  USER_ROLES,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  OFFER_TYPES,
  USER_SEGMENTS
};
