const db = require('../config/db');

// Helper for consistent error responses
const handleError = (res, error, message) => {
    console.error(`${message}:`, error.message);
    res.status(500).json({ success: false, message: `${message}: ${error.message}` });
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

exports.updateRoomType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, base_price, max_occupancy, amenities } = req.body;

        // Verify ownership
        const [existing] = await db.query('SELECT hotel_id FROM room_types WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });

        if (req.user.role === 'admin' && req.user.hotel_id !== existing[0].hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        await db.query(
            'UPDATE room_types SET name = ?, description = ?, base_price = ?, max_occupancy = ?, amenities = ? WHERE id = ?',
            [name, description, base_price, max_occupancy, JSON.stringify(amenities), id]
        );

        res.json({ success: true, message: 'Room category updated successfully' });
    } catch (error) {
        handleError(res, error, 'Failed to update category');
    }
};

exports.deleteRoomType = async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const [existing] = await db.query('SELECT hotel_id FROM room_types WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });

        if (req.user.role === 'admin' && req.user.hotel_id !== existing[0].hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Check if there are rooms assigned to this type
        const [rooms] = await db.query('SELECT id FROM rooms WHERE room_type_id = ?', [id]);
        if (rooms.length > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete category with registered units. Reassign units first.' });
        }

        await db.query('DELETE FROM room_types WHERE id = ?', [id]);
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        handleError(res, error, 'Failed to delete category');
    }
};

exports.getRoomTypes = async (req, res) => {
    try {
        const { hotelId } = req.query;
        const [roomTypes] = await db.query(`
            SELECT 
                rt.*, 
                COUNT(r.id) as room_count,
                GROUP_CONCAT(DISTINCT r.floor ORDER BY r.floor) as floors
            FROM room_types rt
            LEFT JOIN rooms r ON rt.id = r.room_type_id
            WHERE rt.hotel_id = ?
            GROUP BY rt.id
        `, [hotelId]);

        // Parse amenities and floors
        roomTypes.forEach(rt => {
            try {
                rt.amenities = rt.amenities ? (typeof rt.amenities === 'string' ? JSON.parse(rt.amenities) : rt.amenities) : [];
                rt.floors = rt.floors ? rt.floors.split(',') : [];
            } catch (e) {
                rt.amenities = [];
                rt.floors = [];
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
        let { hotel_id, room_type_id, room_number, floor, status, notes } = req.body;

        // Ensure IDs are integers
        hotel_id = parseInt(hotel_id);
        room_type_id = parseInt(room_type_id);

        if (!hotel_id || !room_type_id || !room_number) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check if user is admin of this hotel
        if (req.user.role === 'admin' && req.user.hotel_id !== hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Check for duplicate room number
        const [existing] = await db.query(
            'SELECT id FROM rooms WHERE hotel_id = ? AND room_number = ?',
            [hotel_id, room_number]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: `Room ${room_number} already exists in your hotel` });
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

exports.bulkCreateRooms = async (req, res) => {
    try {
        const { hotel_id, room_type_id, start_number, count, floor } = req.body;

        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotel_id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Parse start_number for prefix and numeric part (e.g., A101 -> prefix='A', num=101)
        const match = start_number.toString().match(/^([A-Za-z]*)(\d+)$/);
        const prefix = match ? match[1] : '';
        const numPart = match ? match[2] : start_number.toString().replace(/^\D+/, '');
        const sNum = parseInt(numPart) || 1;
        const padding = numPart.length;

        const values = [];
        for (let i = 0; i < count; i++) {
            const currentNumStr = (sNum + i).toString().padStart(padding, '0');
            values.push([hotel_id, room_type_id, prefix + currentNumStr, floor || '1', 'available', '']);
        }

        if (values.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid rooms to create' });
        }

        await db.query(
            'INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, notes) VALUES ?',
            [values]
        );

        res.status(201).json({ success: true, message: `${values.length} rooms created successfully` });
    } catch (error) {
        handleError(res, error, 'Failed to bulk create rooms');
    }
};

exports.bulkMultiCreateRooms = async (req, res) => {
    try {
        const { hotel_id, room_type_id, batches } = req.body;

        if (req.user.role === 'admin' && req.user.hotel_id !== parseInt(hotel_id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const roomDataMap = new Map(); // Use map to deduplicate locally while keeping floor/metadata
        
        batches.forEach(batch => {
            const { start_number, count, floor } = batch;
            if (!start_number || !count) return;

            const match = start_number.toString().match(/^([A-Za-z]*)(\d+)$/);
            const prefix = match ? match[1] : '';
            const numPart = match ? match[2] : start_number.toString().replace(/^\D+/, '');
            const sNum = parseInt(numPart) || 1;
            const padding = numPart.length;

            for (let i = 0; i < parseInt(count); i++) {
                const currentNumStr = (sNum + i).toString().padStart(padding, '0');
                const fullNum = prefix + currentNumStr;
                // Last one wins if user mistakenly provides same room in different batches
                roomDataMap.set(fullNum, {
                    room_number: fullNum,
                    floor: floor || '1'
                });
            }
        });

        const uniqueNumbers = Array.from(roomDataMap.keys());
        if (uniqueNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid rooms to create' });
        }

        // Pre-check duplicates in database
        const [existing] = await db.query(
            'SELECT room_number FROM rooms WHERE hotel_id = ? AND room_number IN (?)',
            [hotel_id, uniqueNumbers]
        );
        const existingNumbers = existing.map(r => r.room_number);
        const finalNumbers = uniqueNumbers.filter(n => !existingNumbers.includes(n));

        if (finalNumbers.length === 0) {
            return res.status(400).json({ success: false, message: `All ${uniqueNumbers.length} rooms already exist in your inventory.` });
        }

        const values = finalNumbers.map(num => {
            const data = roomDataMap.get(num);
            return [
                parseInt(hotel_id),
                parseInt(room_type_id),
                num,
                data.floor,
                'available',
                ''
            ];
        });

        await db.query(
            'INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, notes) VALUES ?',
            [values]
        );

        res.status(201).json({ 
            success: true, 
            message: `${values.length} rooms added successfully.${existingNumbers.length > 0 ? ` (${existingNumbers.length} were skipped as they already exist)` : ''}` 
        });
    } catch (error) {
        handleError(res, error, 'Failed to multi-bulk create rooms');
    }
};

exports.bulkAddRoomsByNumbers = async (req, res) => {
    try {
        let { hotel_id, room_type_id, room_numbers, floor } = req.body;
        hotel_id = parseInt(hotel_id);
        room_type_id = parseInt(room_type_id);

        if (req.user.role === 'admin' && req.user.hotel_id !== hotel_id) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const parts = room_numbers.split(',').map(p => p.trim()).filter(p => p.length > 0);
        const resolvedNumbers = [];

        for (const part of parts) {
            if (part.includes('-')) {
                const rangeParts = part.split('-').map(r => r.trim());
                if (rangeParts.length === 2) {
                    const start = rangeParts[0];
                    const end = rangeParts[1];

                    // Match: (Letters optional)(Digits required) - (Letters optional)(Digits required)
                    const startMatch = start.match(/^([A-Za-z]*)(\d+)$/);
                    const endMatch = end.match(/^([A-Za-z]*)(\d+)$/);

                    if (startMatch && endMatch && startMatch[1] === endMatch[1]) {
                        const prefix = startMatch[1];
                        const sNum = parseInt(startMatch[2]);
                        const eNum = parseInt(endMatch[2]);

                        if (sNum <= eNum && (eNum - sNum) < 500) { // Limit huge ranges
                            for (let i = sNum; i <= eNum; i++) {
                                // Preserve padding (e.g. 001 -> 002)
                                const numStr = i.toString().padStart(startMatch[2].length, '0');
                                resolvedNumbers.push(prefix + numStr);
                            }
                            continue;
                        }
                    }
                }
            }
            resolvedNumbers.push(part);
        }

        // Deduplicate the list itself
        const uniqueNumbers = [...new Set(resolvedNumbers)];

        if (uniqueNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid room numbers provided' });
        }

        // Pre-check duplicates in database
        const [existing] = await db.query(
            'SELECT room_number FROM rooms WHERE hotel_id = ? AND room_number IN (?)',
            [hotel_id, uniqueNumbers]
        );
        const existingNumbers = existing.map(r => r.room_number);
        const finalNumbers = uniqueNumbers.filter(n => !existingNumbers.includes(n));

        if (finalNumbers.length === 0) {
            return res.status(400).json({ success: false, message: 'All provided room numbers already exist in database' });
        }

        const values = finalNumbers.map(num => {
            // Smart Floor Detection: e.g. 101 -> Floor 1, 1205 -> Floor 12, A301 -> Floor 3
            let detectedFloor = floor;
            const digitMatch = num.match(/\d+/);
            if (!detectedFloor && digitMatch) {
                const digits = digitMatch[0];
                if (digits.length > 2) {
                    detectedFloor = digits.slice(0, -2);
                } else {
                    detectedFloor = '1';
                }
            }

            return [
                hotel_id,
                room_type_id,
                num,
                detectedFloor || '1',
                'available',
                ''
            ];
        });

        await db.query(
            'INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status, notes) VALUES ?',
            [values]
        );

        res.status(201).json({
            success: true,
            message: `${finalNumbers.length} rooms added.${existingNumbers.length > 0 ? ` (${existingNumbers.length} skipped as duplicates)` : ''}`
        });
    } catch (error) {
        handleError(res, error, 'Failed to add rooms to this category');
    }
};

exports.getRooms = async (req, res) => {
    try {
        const { hotelId, checkIn, checkOut } = req.query;

        // If admin, they can only see their own rooms
        const targetHotelId = req.user.role === 'admin' ? req.user.hotel_id : hotelId;

        if (!targetHotelId) {
            return res.status(400).json({ success: false, message: 'Hotel ID is required' });
        }

        let query = `
            SELECT r.*, rt.name as type_name, rt.base_price, rt.max_occupancy, rt.amenities,
            (
                SELECT COUNT(*) FROM bookings b 
                WHERE b.room_id = r.id 
                AND (
                    (b.status = 'confirmed' AND CURRENT_DATE >= b.check_in_date AND CURRENT_DATE < b.check_out_date)
                    OR b.status = 'checked_in'
                )
            ) as is_occupied
            FROM rooms r 
            JOIN room_types rt ON r.room_type_id = rt.id 
            WHERE r.hotel_id = ?
        `;
        const params = [targetHotelId];

        if (req.user.role === 'guest' && checkIn && checkOut) {
            query += ` AND r.id NOT IN (
                SELECT room_id FROM bookings 
                WHERE status NOT IN ('cancelled') 
                AND (check_in_date < ? AND check_out_date > ?)
            )`;
            params.push(checkOut, checkIn);
        }

        const [rooms] = await db.query(query, params);

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
      SELECT r.*, rt.name as type_name, rt.base_price, rt.max_occupancy, rt.amenities, 
             h.name as hotel_name, h.city as hotel_city, h.image as hotel_image, h.rating
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE r.status = 'available' AND h.status = 'verified'
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
