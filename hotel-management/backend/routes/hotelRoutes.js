const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getAllHotels, updateHotel } = require('../controllers/superAdminController');
const { protect } = require('../middleware/auth');

// Public: Get all hotels
router.get('/', getAllHotels);

// Public: Get single hotel
router.get('/:id', async (req, res) => {
  try {
    const [hotels] = await db.query('SELECT * FROM hotels WHERE id = ?', [req.params.id]);
    if (hotels.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    res.json({ success: true, hotel: hotels[0] });
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hotel' });
  }
});

// Protected: Update hotel (admin only)
router.put('/:id', protect, updateHotel);

// Protected: Upload images (base64)
router.post('/upload', protect, (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ success: false, message: 'No images provided' });
  }
  res.json({ success: true, message: 'Images uploaded successfully', imageUrls: images });
});

module.exports = router;