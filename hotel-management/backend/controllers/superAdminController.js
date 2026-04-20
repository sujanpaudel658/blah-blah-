const bcrypt = require('bcrypt');
const db = require('../config/db');
const notificationEvents = require('../services/notificationEvents.service');

const handleError = (res, error, message) => {
  console.error(`${message}:`, error.message);
  res.status(500).json({ success: false, message });
};

exports.getAllHotels = async (req, res) => {
  try {
    const [hotels] = await db.query('SELECT * FROM hotels ORDER BY created_at DESC');
    res.json({ success: true, hotels });
  } catch (error) {
    handleError(res, error, 'Failed to fetch hotels');
  }
};

exports.createHotel = async (req, res) => {
  try {
    const { name, address, city, country, phone, email, description, image, latitude, longitude, adminName, adminEmail, adminPassword } = req.body;

    if (!name || !city || !country) {
      return res.status(400).json({ success: false, message: 'Hotel name, city, and country are required' });
    }
    if (!adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'Admin name, email, and password are required' });
    }

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
        (latitude !== undefined && latitude !== null) ? latitude : null,
        (longitude !== undefined && longitude !== null) ? longitude : null
      ]
    );
    const hotelId = result.insertId;

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [adminEmail]);

    let adminId, adminPromoted = false;

    if (existingUsers.length > 0) {
      adminId = existingUsers[0].id;
      adminPromoted = true;
      await db.query(
        'UPDATE users SET role = ?, hotel_id = ?, password = ? WHERE id = ?',
        ['admin', hotelId, hashedPassword, adminId]
      );
    } else {
      const [adminResult] = await db.query(
        'INSERT INTO users (full_name, email, password, role, hotel_id) VALUES (?, ?, ?, ?, ?)',
        [adminName, adminEmail, hashedPassword, 'admin', hotelId]
      );
      adminId = adminResult.insertId;
    }

    const [newHotel] = await db.query('SELECT * FROM hotels WHERE id = ?', [hotelId]);

    await notificationEvents.notifyHotelCreated({
      hotelId,
      hotelName: name
    });
    await notificationEvents.notifyAdminAccountChanged({
      adminId,
      action: adminPromoted ? 'was promoted to admin' : 'was created'
    });

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
        (latitude !== undefined && latitude !== null) ? latitude : null,
        (longitude !== undefined && longitude !== null) ? longitude : null,
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

exports.getHotelDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: 'Invalid hotel ID' });
    }
    const [hotels] = await db.query('SELECT * FROM hotels WHERE id = ?', [id]);
    if (hotels.length === 0) {
      return res.status(404).json({ success: false, message: 'Hotel not found' });
    }
    const [admins] = await db.query(
      `SELECT id, full_name, email, phone, created_at FROM users WHERE hotel_id = ? AND role = 'admin' ORDER BY id ASC`,
      [id]
    );
    res.json({ success: true, hotel: hotels[0], admins });
  } catch (error) {
    handleError(res, error, 'Failed to fetch hotel');
  }
};

exports.patchAdminEmail = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    if (!Number.isFinite(adminId)) {
      return res.status(400).json({ success: false, message: 'Invalid admin ID' });
    }
    const email = (req.body.email || '').trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [users] = await db.query('SELECT id, role FROM users WHERE id = ?', [adminId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (users[0].role !== 'admin') {
      return res.status(400).json({ success: false, message: 'Only hotel manager accounts can be updated here' });
    }

    const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, adminId]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: 'That email is already in use' });
    }

    await db.query('UPDATE users SET email = ? WHERE id = ?', [email, adminId]);
    const [updated] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.hotel_id, u.created_at, h.name as hotel_name
       FROM users u LEFT JOIN hotels h ON u.hotel_id = h.id WHERE u.id = ?`,
      [adminId]
    );
    res.json({ success: true, message: 'Login email updated', admin: updated[0] });
  } catch (error) {
    handleError(res, error, 'Failed to update email');
  }
};

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

    await notificationEvents.notifyAdminAccountChanged({
      adminId: result.insertId,
      action: 'was created'
    });

    res.status(201).json({ success: true, message: 'Admin created successfully', admin: newAdmin[0] });
  } catch (error) {
    handleError(res, error, 'Failed to create admin');
  }
};

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

exports.verifyHotel = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

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
    if (hotel.status === 'rejected') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'This hotel request was rejected' });
    }

    await connection.query('UPDATE hotels SET status = "verified" WHERE id = ?', [id]);

    if (hotel.owner_id) {
      const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [hotel.owner_id]);
      if (users.length > 0) {
        await connection.query(
          'UPDATE users SET role = "admin", hotel_id = ? WHERE id = ?',
          [id, hotel.owner_id]
        );
        await notificationEvents.notifyAdminAccountChanged({
          adminId: hotel.owner_id,
          action: 'was promoted after hotel verification'
        });
      }
    }

    await connection.commit();

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

exports.getPendingHotelDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const [hotels] = await db.query(
      `SELECT h.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone
       FROM hotels h
       LEFT JOIN users u ON h.owner_id = u.id
       WHERE h.id = ? AND h.status = 'pending'`,
      [id]
    );
    if (hotels.length === 0) {
      return res.status(404).json({ success: false, message: 'Pending hotel not found' });
    }
    const hotel = hotels[0];
    const [roomTypes] = await db.query(
      'SELECT id, name, description, base_price, max_occupancy FROM room_types WHERE hotel_id = ? ORDER BY id',
      [id]
    );
    const [rooms] = await db.query(
      `SELECT r.id, r.room_number, r.floor, r.status, r.room_type_id, t.name AS type_name
       FROM rooms r
       JOIN room_types t ON r.room_type_id = t.id
       WHERE r.hotel_id = ?
       ORDER BY r.room_number`,
      [id]
    );
    res.json({
      success: true,
      hotel,
      roomTypes,
      rooms
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch pending hotel detail');
  }
};

exports.deletePendingHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM hotels WHERE id = ? AND status = ?', [id, 'pending']);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending hotel not found or already processed'
      });
    }
    res.json({ success: true, message: 'Pending hotel request removed' });
  } catch (error) {
    handleError(res, error, 'Failed to delete pending hotel');
  }
};

exports.getSystemAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    let dateFilterJoin = '';
    const params = [];
    const paramsJoin = [];

    if (startDate && endDate) {
      dateFilter = ' WHERE created_at >= ? AND created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      dateFilterJoin = ' AND b.created_at >= ? AND b.created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(startDate, endDate);
      paramsJoin.push(startDate, endDate);
    }

    const [bookingStats] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
        SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(
          CASE WHEN payment_status = 'paid'
            THEN COALESCE(NULLIF(commission_amount, 0), ROUND(total_amount * 0.10, 2))
            ELSE 0
          END
        ) as total_commission,
        SUM(CASE WHEN payment_status = 'refunded' THEN total_amount ELSE 0 END) as total_refunded,
        SUM(total_amount) as gross_total
      FROM bookings${dateFilter}
    `, params);

    const [hotelRevenue] = await db.query(`
      SELECT 
        h.id, h.name, h.city, h.balance,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as revenue,
        SUM(
          CASE WHEN b.payment_status = 'paid'
            THEN COALESCE(NULLIF(b.commission_amount, 0), ROUND(b.total_amount * 0.10, 2))
            ELSE 0
          END
        ) as commission,
        SUM(CASE WHEN b.status = 'confirmed' OR b.status = 'checked_in' THEN 1 ELSE 0 END) as active_bookings
      FROM hotels h
      LEFT JOIN bookings b ON h.id = b.hotel_id${dateFilterJoin}
      GROUP BY h.id
      ORDER BY revenue DESC
    `, paramsJoin);

    const trendFilter = (startDate && endDate)
      ? ' WHERE created_at >= ? AND created_at <= DATE_ADD(?, INTERVAL 1 DAY)'
      : ' WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)';
    const trendParams = (startDate && endDate) ? [startDate, endDate] : [];

    const [monthlyTrend] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as revenue,
        SUM(
          CASE WHEN payment_status = 'paid'
            THEN COALESCE(NULLIF(commission_amount, 0), ROUND(total_amount * 0.10, 2))
            ELSE 0
          END
        ) as commission
      FROM bookings${trendFilter}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `, trendParams);

    const recentFilter = (startDate && endDate)
      ? ' WHERE b.created_at >= ? AND b.created_at <= DATE_ADD(?, INTERVAL 1 DAY)'
      : '';
    const recentParams = (startDate && endDate) ? [startDate, endDate] : [];

    const [recentBookings] = await db.query(`
      SELECT b.*, h.name as hotel_name, r.room_number, rt.name as room_type,
             bgd.guest_name, bgd.guest_email, bgd.guest_phone, bgd.special_requests
      FROM bookings b
      JOIN hotels h ON b.hotel_id = h.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id${recentFilter}
      ORDER BY b.created_at DESC
      LIMIT 50
    `, recentParams);

    res.json({
      success: true,
      analytics: {
        overview: bookingStats[0],
        hotelRevenue,
        monthlyTrend,
        recentBookings
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch system analytics');
  }
};

exports.getTransactionLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    let summaryDateFilter = '';
    const params = [];
    const summaryParams = [];

    if (startDate && endDate) {
      dateFilter = ' AND p.created_at >= ? AND p.created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      summaryDateFilter = ' WHERE created_at >= ? AND created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(startDate, endDate);
      summaryParams.push(startDate, endDate);
    }

    const [transactions] = await db.query(`
      SELECT 
        p.id as payment_id,
        p.booking_id,
        p.amount,
        p.payment_method,
        p.status as payment_status,
        p.transaction_id,
        p.pidx,
        p.paid_at,
        p.notes,
        p.created_at as payment_date,
        b.booking_reference,
        bgd.guest_name,
        bgd.guest_email,
        b.status as booking_status,
        b.check_in_date,
        b.check_out_date,
        b.total_nights,
        b.commission_amount,
        h.name as hotel_name,
        h.city as hotel_city
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN booking_guest_details bgd ON b.id = bgd.booking_id
      JOIN hotels h ON b.hotel_id = h.id
      WHERE 1=1${dateFilter}
      ORDER BY p.created_at DESC
      LIMIT 200
    `, params);

    const [summary] = await db.query(`
      SELECT 
        COUNT(p.id) as total,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN p.status = 'refunded' THEN 1 ELSE 0 END) as refunded,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_collected,
        SUM(
          CASE WHEN p.status = 'completed'
            THEN COALESCE(NULLIF(b.commission_amount, 0), ROUND(b.total_amount * 0.10, 2))
            ELSE 0
          END
        ) as total_commission,
        SUM(CASE WHEN p.status = 'refunded' THEN p.amount ELSE 0 END) as total_refunded
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      ${summaryDateFilter.replace('WHERE', 'AND').replace('created_at', 'p.created_at')}
    `, summaryParams);

    res.json({
      success: true,
      transactions,
      summary: summary[0]
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch transaction logs');
  }
};

exports.getSystemReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    let dateFilterJoin = '';
    const params = [];
    const paramsJoin = [];

    if (startDate && endDate) {
      dateFilter = ' WHERE created_at >= ? AND created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      dateFilterJoin = ' AND b.created_at >= ? AND b.created_at <= DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(startDate, endDate);
      paramsJoin.push(startDate, endDate);
    }

    const [hotels] = await db.query('SELECT id, name, city, country, created_at FROM hotels ORDER BY name');
    const [admins] = await db.query(`
      SELECT u.full_name, u.email, h.name as hotel_name 
      FROM users u LEFT JOIN hotels h ON u.hotel_id = h.id 
      WHERE u.role = 'admin'
    `);
    const [guests] = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'guest'`);
    
    const [bookingStats] = await db.query(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue,
        SUM(
          CASE WHEN payment_status = 'paid'
            THEN COALESCE(NULLIF(commission_amount, 0), ROUND(total_amount * 0.10, 2))
            ELSE 0
          END
        ) as total_commission,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as completed
      FROM bookings${dateFilter}
    `, params);

    const [hotelPerformance] = await db.query(`
      SELECT 
        h.name, h.city,
        COUNT(b.id) as bookings,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_amount ELSE 0 END) as revenue,
        SUM(
          CASE WHEN b.payment_status = 'paid'
            THEN COALESCE(NULLIF(b.commission_amount, 0), ROUND(b.total_amount * 0.10, 2))
            ELSE 0
          END
        ) as commission
      FROM hotels h
      LEFT JOIN bookings b ON h.id = b.hotel_id${dateFilterJoin}
      GROUP BY h.id
      ORDER BY revenue DESC
    `, paramsJoin);

    res.json({
      success: true,
      report: {
        generatedAt: new Date().toISOString(),
        dateRange: (startDate && endDate) ? { startDate, endDate } : null,
        hotels,
        admins,
        guestCount: guests[0].count,
        bookingStats: bookingStats[0],
        hotelPerformance
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate system report');
  }
};
