const db = require('../config/db');

// Helper for consistent error responses
const handleError = (res, error, message) => {
    console.error(`${message}:`, error.message);
    res.status(500).json({ success: false, message });
};

// --- Room Types ---

exports.createRoomType = async (req, res) => {
    try {
        const { hotel_id, name, description, base_price, max_occupancy, amenities } = req.body;

        // Check if user is admin of this hotel
        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotel_id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [result] = await db.query(
            'INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, amenities) VALUES (?, ?, ?, ?, ?, ?)',
            [hotel_id, name, description, base_price, max_occupancy, JSON.stringify(amenities)]
        );

        res.status(201).json({ success: true, message: 'Room type created', id: result.insertId });
    } catch (error) {
        handleError(res, error, 'Failed to create room type');
    }
};

exports.getRoomTypes = async (req, res) => {
    try {
        const { hotelId } = req.query;
        const [roomTypes] = await db.query('SELECT * FROM room_types WHERE hotel_id = ?', [hotelId]);

        // Parse amenities
        roomTypes.forEach(rt => {
            try {
                rt.amenities = rt.amenities ? (typeof rt.amenities === 'string' ? JSON.parse(rt.amenities) : rt.amenities) : [];
            } catch (e) {
                rt.amenities = [];
            }
        });

        res.json({ success: true, roomTypes });
    } catch (error) {
        handleError(res, error, 'Failed to fetch room types');
    }
};

// --- Rooms ---

exports.createRoom = async (req, res) => {
    try {
        const { hotel_id, room_type_id, room_number, floor, status, notes } = req.body;

        // Check if user is admin of this hotel
        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotel_id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const [result] = await db.query(
            'INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [hotel_id, room_type_id, room_number, floor, status || 'available', notes]
        );

        res.status(201).json({ success: true, message: 'Room created', id: result.insertId });
    } catch (error) {
        handleError(res, error, 'Failed to create room');
    }
};

exports.getRooms = async (req, res) => {
    try {
        const { hotelId } = req.query;

        // If admin, they can only see their own rooms
        const targetHotelId = req.user.role === 'admin' ? req.user.hotel_id : hotelId;

        if (!targetHotelId) {
            return res.status(400).json({ success: false, message: 'Hotel ID is required' });
        }

        const [rooms] = await db.query(
            `SELECT r.*, rt.name as type_name, rt.base_price, rt.max_occupancy, rt.amenities
       FROM rooms r 
       JOIN room_types rt ON r.room_type_id = rt.id 
       WHERE r.hotel_id = ?`,
            [targetHotelId]
        );

        // Parse amenities for each room's type
        rooms.forEach(r => {
            try {
                r.amenities = r.amenities ? (typeof r.amenities === 'string' ? JSON.parse(r.amenities) : r.amenities) : [];
            } catch (e) {
                r.amenities = [];
            }
        });

        res.json({ success: true, rooms });
    } catch (error) {
        handleError(res, error, 'Failed to fetch rooms');
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const { room_type_id, room_number, floor, status, notes } = req.body;

        // Get current room to check hotel_id
        const [room] = await db.query('SELECT hotel_id FROM rooms WHERE id = ?', [id]);
        if (room.length === 0) return res.status(404).json({ success: false, message: 'Room not found' });

        if (req.user.role === 'admin' && req.user.hotel_id !== room[0].hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.query(
            'UPDATE rooms SET room_type_id = ?, room_number = ?, floor = ?, status = ?, notes = ? WHERE id = ?',
            [room_type_id, room_number, floor, status, notes, id]
        );

        res.json({ success: true, message: 'Room updated successfully' });
    } catch (error) {
        handleError(res, error, 'Failed to update room');
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;

        const [room] = await db.query('SELECT hotel_id FROM rooms WHERE id = ?', [id]);
        if (room.length === 0) return res.status(404).json({ success: false, message: 'Room not found' });

        if (req.user.role === 'admin' && req.user.hotel_id !== room[0].hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.query('DELETE FROM rooms WHERE id = ?', [id]);
        res.json({ success: true, message: 'Room deleted' });
    } catch (error) {
        handleError(res, error, 'Failed to delete room');
    }
};

// --- Public Search ---

exports.searchRooms = async (req, res) => {
    try {
        const { location, guests, checkIn, checkOut } = req.query;

        let query = `
      SELECT r.*, rt.name as type_name, rt.base_price, rt.max_occupancy, rt.amenities, h.name as hotel_name, h.city, h.image as hotel_image
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE r.status = 'available'
    `;

        const params = [];

        if (location) {
            query += ` AND (h.city LIKE ? OR h.name LIKE ?)`;
            params.push(`%${location}%`, `%${location}%`);
        }

        if (guests) {
            query += ` AND rt.max_occupancy >= ?`;
            params.push(parseInt(guests));
        }

        // Availability check (Simplified: check if room is not booked in that range)
        if (checkIn && checkOut) {
            query += ` AND r.id NOT IN (
        SELECT room_id FROM bookings 
        WHERE status NOT IN ('cancelled') 
        AND (
          (check_in_date <= ? AND check_out_date >= ?) OR
          (check_in_date < ? AND check_in_date >= ?) OR
          (check_out_date <= ? AND check_out_date > ?)
        )
      )`;
            params.push(checkOut, checkIn, checkOut, checkIn, checkOut, checkIn);
        }

        query += ' ORDER BY rt.base_price ASC';

        const [rooms] = await db.query(query, params);

        // Parse data
        rooms.forEach(r => {
            try {
                r.amenities = r.amenities ? (typeof r.amenities === 'string' ? JSON.parse(r.amenities) : r.amenities) : [];
                if (r.hotel_image) {
                    try {
                        const imgs = JSON.parse(r.hotel_image);
                        r.hotel_image = Array.isArray(imgs) ? imgs[0] : imgs;
                    } catch (e) { /* leave as is */ }
                }
            } catch (e) {
                r.amenities = [];
            }
        });

        res.json({ success: true, count: rooms.length, rooms });
    } catch (error) {
        handleError(res, error, 'Search failed');
    }
};
