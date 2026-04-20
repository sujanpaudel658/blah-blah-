const express = require('express');
const { protect, superAdminOnly } = require('../middleware/auth');
const {
  getAllHotels,
  createHotel,
  getHotelDetail,
  getAllAdmins,
  createAdmin,
  patchAdminEmail,
  getAllGuests,
  getPendingHotels,
  getPendingHotelDetail,
  deletePendingHotel,
  verifyHotel,
  getSystemAnalytics,
  getTransactionLogs,
  getSystemReport
} = require('../controllers/superAdminController');

const router = express.Router();

router.use(protect, superAdminOnly);

router.get('/hotels', getAllHotels);
router.post('/hotels', createHotel);
router.get('/hotels/pending', getPendingHotels);
router.get('/hotels/pending-review/:id', getPendingHotelDetail);
router.delete('/hotels/pending-review/:id', deletePendingHotel);
router.put('/hotels/:id/verify', verifyHotel);
router.get('/hotels/:id', getHotelDetail);

router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);
router.patch('/admins/:id/email', patchAdminEmail);

router.get('/guests', getAllGuests);

router.get('/analytics', getSystemAnalytics);
router.get('/transactions', getTransactionLogs);
router.get('/report', getSystemReport);

module.exports = router;
