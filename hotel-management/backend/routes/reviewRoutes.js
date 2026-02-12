const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createReview,
    getHotelReviews,
    getBookingReview
} = require('../controllers/reviewController');

// Guest & Admin: Get reviews for a hotel
router.get('/hotel/:hotelId', getHotelReviews);

// Protected Guest: Submit a review
router.post('/', protect, createReview);

// Protected Guest: Check if booking is reviewed
router.get('/booking/:bookingId', protect, getBookingReview);

module.exports = router;
