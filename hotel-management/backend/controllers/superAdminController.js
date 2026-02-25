const bcrypt = require('bcrypt');
const db = require('../config/db');

// Helper for consistent error responses
const handleError = (res, error, message) => {
  console.error(`${message}:`, error.message);
  res.status(500).json({ success: false, message });
};

// Get all hotels
exports.getAllHotels = async (req, res) => {
  try {
    const [hotels] = await db.query('SELECT * FROM hotels ORDER BY created_at DESC');
    res.json({ success: true, hotels });
  } catch (error) {
    handleError(res, error, 'Failed to fetch hotels');
  }
};

// Create new hotel with admin
exports.createHotel = async (req, res) => {
  try {
    const { name, address, city, country, phone, email, description, image, latitude, longitude, adminName, adminEmail, adminPassword } = req.body;

    if (!name || !city || !country) {
      return res.status(400).json({ success: false, message: 'Hotel name, city, and country are required' });
    }
    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'Admin name, email, and password are required' });
    }

    // Create hotel
    const [result] = await db.query(
      'INSERT INTO hotels (name, address, city, country, phone, email, description, image, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        address,
        city,
        country,
        phone,
        email,
        description,
        image,
        (latitude !== undefined && latitude !== null) ? latitude : 27.7172,
        (longitude !== undefined && longitude !== null) ? longitude : 85.3240
      ]
    );
    const hotelId = result.insertId;

    // Hash password and handle admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

    let adminId, adminPromoted = false;

    if (existingUsers.length > 0) {
      // Promote existing user to admin
      adminId = existingUsers[0].id;
      adminPromoted = true;
      await db.query(
        'UPDATE users SET role = ?, hotel_id = ?, password = ? WHERE id = ?',
        ['admin', hotelId, hashedPassword, adminId]
      );
    } else {
      // Create new admin user
      const [adminResult] = await db.query(
        'INSERT INTO users (full_name, email, password, role, hotel_id) VALUES (?, ?, ?, ?, ?)',
        [adminName, adminEmail, hashedPassword, 'admin', hotelId]
      );
      adminId = adminResult.insertId;
    }

    const [newHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [hotelId]);

    res.status(201).json({
      success: true,
      message: 'Hotel and admin created successfully',
      hotel: newHotel[0],
      adminPromoted,
      adminId
    });
  } catch (error) {
    handleError(res, error, 'Failed to create hotel');
  }
};

// Update hotel
exports.updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, country, phone, email, description, image, latitude, longitude } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required' });
    }
    if (image && image.length > 16000000) {
      return res.status(400).json({ success: false, message: 'Image data too large' });
    }

    const [result] = await db.query(
      'UPDATE hotels SET name = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, description = ?, image = ?, latitude = ?, longitude = ? WHERE id = ?',
      [
        name,
        address,
        city,
        country,
        phone,
        email,
        description,
        image,
        (latitude !== undefined && latitude !== null) ? latitude : 27.7172,
        (longitude !== undefined && longitude !== null) ? longitude : 85.3240,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }

    const [updatedHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [id]);
    res.json({ success: true, message: 'Hotel updated successfully', hotel: updatedHotel[0] });
  } catch (error) {
    handleError(res, error, 'Failed to update hotel');
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.hotel_id, u.created_at, h.name as hotel_name
       FROM users u LEFT JOIN hotels h ON u.hotel_id = h.id
       WHERE u.role = 'admin' ORDER BY u.created_at DESC`
    );
    res.json({ success: true, admins });
  } catch (error) {
    handleError(res, error, 'Failed to fetch admins');
  }
};

// Create new admin
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, phone, password, hotelId } = req.body;

    if (!fullName || !email || !password || !hotelId) {
      return res.status(400).json({ success: false, message: 'Full name, email, password, and hotel are required' });
    }

    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const [hotel] = await db.query('SELECT id FROM hotels WHERE id = ?', [hotelId]);
    if (hotel.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid hotel selected' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, hotel_id) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, hashedPassword, 'admin', hotelId]
    );

    const [newAdmin] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.hotel_id, h.name as hotel_name
       FROM users u LEFT JOIN hotels h ON u.hotel_id = h.id WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: 'Admin created successfully', admin: newAdmin[0] });
  } catch (error) {
    handleError(res, error, 'Failed to create admin');
  }
};

// Get all guests
exports.getAllGuests = async (req, res) => {
  try {
    const [guests] = await db.query(
      `SELECT id, full_name, email, phone, created_at FROM users WHERE role = 'guest' ORDER BY created_at DESC`
    );
    res.json({ success: true, guests });
  } catch (error) {
    handleError(res, error, 'Failed to fetch guests');
  }
};

// Get pending hotel requests
exports.getPendingHotels = async (req, res) => {
  try {
    const [hotels] = await db.query(
      `SELECT h.*, u.full_name as owner_name, u.email as owner_email 
       FROM hotels h 
       LEFT JOIN users u ON h.owner_id = u.id 
       WHERE h.status = 'pending' 
       ORDER BY h.created_at DESC`
    );
    res.json({ success: true, hotels });
  } catch (error) {
    handleError(res, error, 'Failed to fetch pending hotels');
  }
};

// Verify hotel and promote owner to admin
exports.verifyHotel = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // 1. Get hotel and owner details
    const [hotels] = await connection.query('SELECT * FROM hotels WHERE id = ?', [id]);
    if (hotels.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    const hotel = hotels[0];

    if (hotel.status === 'verified') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Hotel is already verified' });
    }

    // 2. Update hotel status
    await connection.query('UPDATE hotels SET status = "verified" WHERE id = ?', [id]);

    // 3. Promote owner to admin if owner_id exists
    if (hotel.owner_id) {
      const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [hotel.owner_id]);
      if (users.length > 0) {
        // Only promote if not already superadmin/admin (though presumably they are guest)
        // Also associate them with this hotel
        await connection.query(
          'UPDATE users SET role = "admin", hotel_id = ? WHERE id = ?',
          [id, hotel.owner_id]
        );
      }
    }

    await connection.commit();

    // Fetch updated data to return
    const [updatedHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Hotel verified and owner promoted to admin successfully',
      hotel: updatedHotel[0]
    });

  } catch (error) {
    await connection.rollback();
    handleError(res, error, 'Failed to verify hotel');
  } finally {
    connection.release();
  }
};
