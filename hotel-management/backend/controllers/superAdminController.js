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
    const { name, address, city, country, phone, email, description, image, adminName, adminEmail, adminPassword } = req.body;

    console.log('Creating hotel with data:', { name, address, city, country, phone, email, description, adminName, adminEmail });

    if (!name || !city || !country) {
      return res.status(400).json({
        success: false,
        message: 'Hotel name, city, and country are required'
      });
    }

    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: 'Admin name, email, and password are required'
      });
    }

    // Start transaction by creating the hotel first
    const [result] = await db.query(
      'INSERT INTO hotels (name, address, city, country, phone, email, description, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, address, city, country, phone, email, description, image]
    );

    const hotelId = result.insertId;
    console.log('Hotel created with ID:', hotelId);

    // Hash the password provided by superadmin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Now handle admin user - check if email already exists
    const [existingUsers] = await db.query(
      'SELECT id, full_name FROM users WHERE email = ?',
      [adminEmail]
    );

    let adminId;
    
    if (existingUsers.length > 0) {
      // Update existing user to admin role and assign hotel
      adminId = existingUsers[0].id;
      console.log('User with email exists, updating to admin:', adminId);
      console.log('Update query params:', { role: 'admin', hotelId, adminId });
      
      const [updateResult] = await db.query(
        'UPDATE users SET role = ?, hotel_id = ?, password = ? WHERE id = ?',
        ['admin', hotelId, hashedPassword, adminId]
      );
      
      console.log('Update result:', updateResult);
      
      if (updateResult.affectedRows === 0) {
        console.error('WARNING: No rows were updated! User ID:', adminId);
      } else {
        console.log('SUCCESS: User updated to admin role for hotel:', hotelId, 'Affected rows:', updateResult.affectedRows);
      }
      
      // Verify the update worked by reading back the user
      const [verifyUser] = await db.query('SELECT id, email, role, hotel_id FROM users WHERE id = ?', [adminId]);
      console.log('Verification - User after update:', verifyUser[0]);
    } else {
      // Create new admin user
      const [adminResult] = await db.query(
        'INSERT INTO users (full_name, email, password, role, hotel_id) VALUES (?, ?, ?, ?, ?)',
        [adminName, adminEmail, hashedPassword, 'admin', hotelId]
      );
      
      adminId = adminResult.insertId;
      console.log('New admin user created:', adminId);
    }

    const [newHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [hotelId]);

    res.status(201).json({
      success: true,
      message: 'Hotel and admin created successfully',
      hotel: newHotel[0],
      adminPromoted: existingUsers.length > 0, // true if existing user was promoted, false if new admin created
      adminId: adminId
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

// Update hotel
exports.updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, phone, email, description, image } = req.body;

    // Log without the full image data
    console.log('Updating hotel:', { 
      id, name, address, city, country, phone, email, description, 
      imageLength: image ? image.length : 0,
      imageIsArray: image ? (image.startsWith('[') ? 'JSON array' : 'single value') : 'null'
    });

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Hotel ID is required'
      });
    }

    // Check if image data is too large (MySQL packet size limit)
    if (image && image.length > 16000000) {
      return res.status(400).json({
        success: false,
        message: 'Image data too large. Please reduce number of images or image quality.'
      });
    }

    const [result] = await db.query(
      'UPDATE hotels SET name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, description = ?, image = ? WHERE id = ?',
      [name, address, city, country, phone, email, description, image, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    const [updatedHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      hotel: updatedHotel[0]
    });
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update hotel',
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
