const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Assign hotel to a user (SuperAdmin only)
router.post('/assign-hotel', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const { email, hotelId } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE users SET hotel_id = ? WHERE email = ?',
      [hotelId, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hotel assigned successfully'
    });
  } catch (error) {
    console.error('Assign hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign hotel'
    });
  }
});

// Get all users (SuperAdmin only)
router.get('/', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.hotel_id, u.created_at,
              h.name as hotel_name
       FROM users u
       LEFT JOIN hotels h ON u.hotel_id = h.id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Update user role (SuperAdmin only)
router.patch('/:id/role', authenticateToken, requireRole(['superadmin']), async (req, res) => {
  const { id } = req.params;
  const { role, hotelId } = req.body;

  try {
    const validRoles = ['guest', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    // If promoting to admin, hotel_id is required
    if (role === 'admin' && !hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required when assigning admin role'
      });
    }

    const [result] = await db.query(
      'UPDATE users SET role = ?, hotel_id = ? WHERE id = ?',
      [role, role === 'admin' ? hotelId : null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

// Get bookings for current user (Guest only)
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await db.query(
      `SELECT b.*, h.name as hotel_name, h.address as hotel_address, h.city as hotel_city, h.image as hotel_image, h.phone as hotel_phone,
              r.room_number, rt.name as room_type,
              (SELECT COUNT(*) FROM reviews WHERE booking_id = b.id) as is_reviewed
       FROM bookings b
       JOIN hotels h ON b.hotel_id = h.id
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get my-bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your bookings'
    });
  }
});

module.exports = router;
