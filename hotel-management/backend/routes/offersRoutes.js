const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  createOffer,
  listActiveOffers,
  applyOffer,
  assignOffer
} = require('../controllers/offersController');

router.post('/', protect, requireRole(['admin', 'superadmin']), createOffer);
router.get('/', protect, listActiveOffers);
router.post('/apply', protect, applyOffer);
router.post('/assign', protect, requireRole(['admin', 'superadmin']), assignOffer);

module.exports = router;
