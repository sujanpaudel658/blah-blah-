const express = require('express');
const router = express.Router();
const { getAllHotels, updateHotel } = require('../controllers/superAdminController');
const { protect } = require('../middleware/auth');

// Public endpoint to get all hotels
router.get('/', getAllHotels);

// Get single hotel
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [hotels] = await require('../config/db').query('SELECT * FROM hotels WHERE id = ?', [id]);
    
    if (hotels.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      hotel: hotels[0]
    });
  } catch (error) {
    console.error('Get hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel',
      error: error.message
    });
  }
});

// Update hotel (for admins)
router.put('/:id', protect, updateHotel);

// Upload images (base64)
router.post('/upload', protect, (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    // Images are already base64 data URLs
    res.json({
      success: true,
      message: 'Images uploaded successfully',
      imageUrls: images
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

module.exports = router;