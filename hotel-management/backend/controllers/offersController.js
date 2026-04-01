const offersService = require('../services/offers.service');
const { USER_SEGMENTS } = require('../constants/notification.constants');

const createOffer = async (req, res) => {
  try {
    const offer = await offersService.createOffer({
      payload: req.body,
      actor: req.user
    });
    return res.status(201).json({ success: true, offer });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to create offer' });
  }
};

const listActiveOffers = async (req, res) => {
  try {
    const offers = await offersService.listActiveOffers();
    return res.json({ success: true, offers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch offers' });
  }
};

const applyOffer = async (req, res) => {
  try {
    const { couponCode, orderAmount } = req.body;
    if (!couponCode || orderAmount === undefined) {
      return res.status(400).json({ success: false, message: 'couponCode and orderAmount are required' });
    }
    const result = await offersService.applyCoupon({
      couponCode: String(couponCode).trim(),
      userId: req.user.id,
      orderAmount: Number(orderAmount)
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to apply coupon' });
  }
};

const assignOffer = async (req, res) => {
  try {
    const { offerId, userIds, userSegment } = req.body;
    if (!offerId) {
      return res.status(400).json({ success: false, message: 'offerId is required' });
    }
    if (!Array.isArray(userIds) && !userSegment) {
      return res.status(400).json({ success: false, message: 'Provide userIds[] or userSegment' });
    }
    if (userSegment && !Object.values(USER_SEGMENTS).includes(userSegment)) {
      return res.status(400).json({ success: false, message: 'Invalid userSegment value' });
    }

    const result = await offersService.assignOffer({
      offerId: Number(offerId),
      userIds: Array.isArray(userIds) ? userIds.map(Number) : [],
      segment: userSegment
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to assign offer' });
  }
};

module.exports = {
  createOffer,
  listActiveOffers,
  applyOffer,
  assignOffer
};
