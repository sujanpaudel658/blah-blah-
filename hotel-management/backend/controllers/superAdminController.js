const bcrypt = require('bcrypt');
const db = require('../config/db');

// Get all hotels
exports.getAllHotels = async (req, res) => {
  try {
    const [hotels] = await db.query('SELECT * FROM hotels');
    
    res.json({
      success: true,
      hotels
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotels',
      error: error.message
    });
  }
};

// Create new hotel
exports.createHotel = async (req, res) => {
  try {
    const { name, address, city, country, phone, email, description } = req.body;

    console.log('Creating hotel with data:', { name, address, city, country, phone, email, description });

    if (!name || !city || !country) {
      return res.status(400).json({
        success: false,
        message: 'Hotel name, city, and country are required'
      });
    }

    const [result] = await db.query(
      'INSERT INTO hotels (name, address, city, country, phone, email, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, address, city, country, phone, email, description]
    );

    console.log('Hotel created with ID:', result.insertId);

    const [newHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully',
      hotel: newHotel[0]
    });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create hotel',
      error: error.message
    });
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.hotel_id, u.created_at,
              h.name as hotel_name
       FROM users u
       LEFT JOIN hotels h ON u.hotel_id = h.id
       WHERE u.role = 'admin'
       ORDER BY u.created_at DESC`
    );
    
    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
};

// Create new admin
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, password, hotelId } = req.body;

    // validation
    if (!fullName || !email || !password || !hotelId) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, password, and hotel are required'
      });
    }

    // check if email already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // verify hotel exists
    const [hotel] = await db.query('SELECT id FROM hotels WHERE id = ?', [hotelId]);
    
    if (hotel.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel selected'
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create admin user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, hotel_id) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, hashedPassword, 'admin', hotelId]
    );

    const [newAdmin] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.hotel_id,
              h.name as hotel_name
       FROM users u
       LEFT JOIN hotels h ON u.hotel_id = h.id
       WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: newAdmin[0]
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
};

// Get all guests
exports.getAllGuests = async (req, res) => {
  try {
    const [guests] = await db.query(
      `SELECT id, full_name, email, phone, created_at
       FROM users
       WHERE role = 'guest'
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      guests
    });
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guests'
    });
  }
};
