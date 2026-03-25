const express = require('express');
const { protect, superAdminOnly } = require('../middleware/auth');
const {
  getAllHotels,
  createHotel,
  getAllAdmins,
  createAdmin,
  getAllGuests,
  getPendingHotels,
  verifyHotel,
  getSystemAnalytics,
  getTransactionLogs,
  getSystemReport
} = require('../controllers/superAdminController');

const router = express.Router();

// all routes require superadmin role
router.use(protect, superAdminOnly);

// hotel routes
router.get('/hotels', getAllHotels);
router.post('/hotels', createHotel);
router.get('/hotels/pending', getPendingHotels);
router.put('/hotels/:id/verify', verifyHotel);

// admin management routes
router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);

// guest management
router.get('/guests', getAllGuests);

// analytics & reports
router.get('/analytics', getSystemAnalytics);
router.get('/transactions', getTransactionLogs);
router.get('/report', getSystemReport);

module.exports = router;
