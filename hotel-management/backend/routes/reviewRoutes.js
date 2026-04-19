const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createReview,
    getHotelReviews,
    getBookingReview,
    getFeaturedReviews
} = require('../controllers/reviewController');

router.get('/featured', getFeaturedReviews);

router.get('/hotel/:hotelId', getHotelReviews);

router.post('/', protect, createReview);

router.get('/booking/:bookingId', protect, getBookingReview);

module.exports = router;
