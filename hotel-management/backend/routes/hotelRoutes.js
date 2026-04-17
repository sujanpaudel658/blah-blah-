const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getAllHotels, updateHotel } = require('../controllers/superAdminController');
const { requestHotel, getPublicHotels } = require('../controllers/hotelController');
const { protect } = require('../middleware/auth');

router.get('/public/stats', async (req, res) => {
  try {
    const [[hotels]] = await db.query('SELECT COUNT(*) as count FROM hotels');
    const [[reviews]] = await db.query('SELECT COUNT(*) as count FROM reviews');
    const [[guests]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "guest"');
    
    res.json({
      success: true,
      stats: {
        hotels: hotels.count || 0,
        reviews: reviews.count || 0,
        guests: guests.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch public stats' });
  }
});

router.post('/request', protect, requestHotel);

router.get('/', getPublicHotels);

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

router.put('/:id', protect, updateHotel);

router.post('/upload', protect, (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ success: false, message: 'No images provided' });
  }
  res.json({ success: true, message: 'Images uploaded successfully', imageUrls: images });
});

module.exports = router;