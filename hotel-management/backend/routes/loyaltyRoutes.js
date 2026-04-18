const express = require('express');
const router = express.Router();
const { getLoyaltyStatus, getLoyaltyOverview } = require('../controllers/loyaltyController');
const { protect } = require('../middleware/auth');

router.get('/status/:hotelId', protect, getLoyaltyStatus);

router.get('/overview', protect, getLoyaltyOverview);

module.exports = router;
