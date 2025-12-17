const express = require('express');
const { protect, superAdminOnly } = require('../middleware/auth');
const { 
  getAllHotels, 
  createHotel, 
  getAllAdmins, 
  createAdmin,
  getAllGuests 
} = require('../controllers/superAdminController');

const router = express.Router();

// all routes require superadmin role
router.use(protect, superAdminOnly);

// hotel routes
router.get('/hotels', getAllHotels);
router.post('/hotels', createHotel);

// admin management routes
router.get('/admins', getAllAdmins);
router.post('/admins', createAdmin);

// guest management
router.get('/guests', getAllGuests);

module.exports = router;
