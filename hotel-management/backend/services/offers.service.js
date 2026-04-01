const offersRepository = require('../repositories/offers.repository');
const notificationService = require('./notification.service');
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  USER_SEGMENTS
} = require('../constants/notification.constants');

const parseJsonField = (field, fallback = []) => {
  if (!field) return fallback;
  if (Array.isArray(field)) return field;
  try {
    return JSON.parse(field);
  } catch (_) {
    return fallback;
  }
};

const validateOfferInput = (input) => {
  const required = ['title', 'description', 'offerType', 'discountType', 'discountValue', 'validFrom', 'validTo'];
  for (const field of required) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  const validDiscountType = ['percentage', 'flat'].includes(input.discountType);
  if (!validDiscountType) throw new Error('discountType must be percentage or flat');

  const validSegment = Object.values(USER_SEGMENTS).includes(input.userSegment || USER_SEGMENTS.ALL);
  if (!validSegment) throw new Error('Invalid user segment');
};

const normalizeOffer = (offer) => ({
  ...offer,
  applicable_hotels: parseJsonField(offer.applicable_hotels, []),
  applicable_rooms: parseJsonField(offer.applicable_rooms, [])
});

const createOffer = async ({ payload, actor }) => {
  validateOfferInput(payload);

  const offerId = await offersRepository.createOffer({
    title: payload.title,
    description: payload.description,
    offerType: payload.offerType,
    discountType: payload.discountType,
    discountValue: Number(payload.discountValue),
    couponCode: payload.couponCode || null,
    validFrom: payload.validFrom,
    validTo: payload.validTo,
    usageLimit: payload.usageLimit ? Number(payload.usageLimit) : null,
    applicableHotels: payload.applicableHotels || [],
    applicableRooms: payload.applicableRooms || [],
    userSegment: payload.userSegment || USER_SEGMENTS.ALL,
    createdBy: actor?.id || null
  });

  const offer = await offersRepository.getOfferById(offerId);
  const users = await offersRepository.getUsersBySegment(offer.user_segment || USER_SEGMENTS.ALL);
  if (users.length) {
    await offersRepository.assignOfferToUsers(offerId, users);
  }

  const recipients = users.map((id) => ({ role: 'user', userId: id }));
  await notificationService.enqueueEvent({
    eventType: 'offer.created',
    priority: 7,
    payload: {
      title: 'New promotional offer',
      message: `${offer.title} is now available for you.`,
      type: NOTIFICATION_TYPES.OFFER,
      referenceId: offerId,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      recipients
    }
  });

  return normalizeOffer(offer);
};

const listActiveOffers = async () => {
  const offers = await offersRepository.getActiveOffers();
  return offers.map(normalizeOffer);
};

const applyCoupon = async ({ couponCode, userId, orderAmount }) => {
  const offer = await offersRepository.getOfferByCoupon(couponCode);
  if (!offer) throw new Error('Coupon not found');

  const now = new Date();
  if (!offer.is_active || now < new Date(offer.valid_from) || now > new Date(offer.valid_to)) {
    throw new Error('Coupon is not active');
  }

  if (offer.usage_limit) {
    const usedCount = await offersRepository.getOfferUsageCount(offer.id);
    if (usedCount >= Number(offer.usage_limit)) {
      throw new Error('Coupon usage limit reached');
    }
  }

  const amount = Number(orderAmount || 0);
  if (amount <= 0) throw new Error('orderAmount must be greater than zero');

  const discount = offer.discount_type === 'percentage'
    ? (amount * Number(offer.discount_value)) / 100
    : Number(offer.discount_value);

  const finalAmount = Math.max(0, amount - discount);

  await offersRepository.markUserOfferUsed({ userId, offerId: offer.id });

  return {
    offer: normalizeOffer(offer),
    discount: Number(discount.toFixed(2)),
    finalAmount: Number(finalAmount.toFixed(2))
  };
};

const assignOffer = async ({ offerId, userIds, segment }) => {
  let ids = Array.isArray(userIds) ? userIds.filter(Boolean) : [];
  if (!ids.length && segment) {
    ids = await offersRepository.getUsersBySegment(segment);
  }
  if (!ids.length) return { assigned: 0 };

  const assigned = await offersRepository.assignOfferToUsers(offerId, ids);

  await notificationService.enqueueEvent({
    eventType: 'offer.assigned',
    priority: 6,
    payload: {
      title: 'Offer assigned',
      message: 'A new offer has been assigned to your account.',
      type: NOTIFICATION_TYPES.OFFER,
      referenceId: offerId,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      recipients: ids.map((id) => ({ role: 'user', userId: id }))
    }
  });

  return { assigned };
};

module.exports = {
  createOffer,
  listActiveOffers,
  applyCoupon,
  assignOffer
};
