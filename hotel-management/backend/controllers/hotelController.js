const db = require('../config/db');
const notificationEvents = require('../services/notificationEvents.service');
const { resolveHotelLocationFields } = require('../utils/hotelLocation');

exports.getPublicHotels = async (req, res) => {
  try {
    const [hotels] = await db.query(
      "SELECT * FROM hotels WHERE status = 'verified' ORDER BY created_at DESC"
    );
    res.json({ success: true, hotels });
  } catch (error) {
    console.error('Get public hotels error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch hotels' });
  }
};

exports.requestHotel = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      name,
      address,
      city,
      country,
      phone,
      email,
      description,
      image,
      latitude,
      longitude,
      contractAccepted,
      roomTypes,
      rooms
    } = req.body;
    const userId = req.user.id;

    if (!name || !city || !country || !userId) {
      return res.status(400).json({ success: false, message: 'Hotel name, city, and country are required' });
    }

    if (!contractAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must accept the listing agreement before submitting your hotel request.'
      });
    }

    if (!Array.isArray(roomTypes) || roomTypes.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one room category (type) with name and base price.'
      });
    }

    if (!Array.isArray(rooms) || rooms.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one physical room linked to a room category.'
      });
    }

    for (let i = 0; i < roomTypes.length; i++) {
      const rt = roomTypes[i];
      const price = rt.base_price != null ? Number(rt.base_price) : NaN;
      if (!rt || !String(rt.name || '').trim() || Number.isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Room category ${i + 1}: name and a positive base price are required.`
        });
      }
    }

    const [existing] = await connection.query(
      'SELECT id FROM hotels WHERE owner_id = ? AND status IN ("pending", "verified")',
      [userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have a hotel listed or pending.' });
    }

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const idx = r.room_type_index != null ? Number(r.room_type_index) : NaN;
      const num = r.room_number != null ? String(r.room_number).trim() : '';
      if (!num || Number.isNaN(idx) || idx < 0 || idx >= roomTypes.length) {
        return res.status(400).json({
          success: false,
          message: `Room ${i + 1}: valid room number and room category index are required.`
        });
      }
    }

    await connection.beginTransaction();

    const resolvedLoc = await resolveHotelLocationFields({
      city,
      address,
      country,
      latitude,
      longitude
    });

    const [result] = await connection.query(
      `INSERT INTO hotels (name, address, city, country, phone, email, description, image, latitude, longitude, status, owner_id, listing_contract_accepted, listing_contract_accepted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        name,
        resolvedLoc.address,
        resolvedLoc.city,
        resolvedLoc.country,
        phone,
        email,
        description,
        image,
        resolvedLoc.latitude,
        resolvedLoc.longitude,
        'pending',
        userId
      ]
    );

    const hotelId = result.insertId;
    const typeIdByIndex = [];

    for (const rt of roomTypes) {
      const basePrice = Number(rt.base_price);
      const maxOcc = rt.max_occupancy != null ? Math.max(1, parseInt(rt.max_occupancy, 10) || 2) : 2;
      const [ins] = await connection.query(
        `INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, amenities)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        [hotelId, String(rt.name).trim(), rt.description || null, basePrice, maxOcc]
      );
      typeIdByIndex.push(ins.insertId);
    }

    for (const r of rooms) {
      const idx = Number(r.room_type_index);
      const roomTypeId = typeIdByIndex[idx];
      const floor = r.floor != null && r.floor !== '' ? parseInt(r.floor, 10) : null;
      await connection.query(
        `INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, notes)
         VALUES (?, ?, ?, ?, 'available', NULL)`,
        [hotelId, roomTypeId, String(r.room_number).trim(), floor]
      );
    }

    await connection.commit();

    await notificationEvents.notifyHotelCreated({
      hotelId,
      hotelName: name
    });

    res.status(201).json({
      success: true,
      message: 'Hotel request submitted successfully. Waiting for admin verification.',
      hotelId
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}
    console.error('Request hotel error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to submit hotel request' });
    }
  } finally {
    connection.release();
  }
};
