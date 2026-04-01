const express = require('express');
const router = express.Router();
const { getLoyaltyStatus, getLoyaltyOverview } = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

// Get loyalty status for a specific hotel
router.get('/status/:hotelId', protect, getLoyaltyStatus);

// Get loyalty overview across all hotels
router.get('/overview', protect, getLoyaltyOverview);

module.exports = router;
