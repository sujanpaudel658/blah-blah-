const db = require('../config/db');
const notificationEvents = require('../services/notificationEvents.service');

// Request to list a new hotel (User/Guest)
exports.requestHotel = async (req, res) => {
    try {
        const { name, address, city, country, phone, email, description, image, latitude, longitude } = req.body;
        const userId = req.user.id; // From auth middleware

        if (!name || !city || !country || !userId) {
            return res.status(400).json({ success: false, message: 'Hotel name, city, and country are required' });
        }

        // Check if user already has a pending or verified hotel?
        // Depending on requirements, maybe limit 1 hotel per user for now?
        // Let's assume multiple hotels allowed or check if they are already an admin of a hotel.

        const [existing] = await db.query('SELECT id FROM hotels WHERE owner_id = ? AND status IN ("pending", "verified")', [userId]);
        // For now, let's just log it but allow multiple requests. 
        // Actually, if they become "admin", they are usually tied to one hotel in this simple schema (user.hotel_id).
        // So if they already have a hotel, they might need to use a different account or we support multi-hotel admins (which the schema `user.hotel_id` suggests single hotel).

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'You already have a hotel listed or pending.' });
        }

        const [result] = await db.query(
            'INSERT INTO hotels (name, address, city, country, phone, email, description, image, latitude, longitude, status, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
                'pending',
                userId
            ]
        );

        await notificationEvents.notifyHotelCreated({
            hotelId: result.insertId,
            hotelName: name
        });

        res.status(201).json({
            success: true,
            message: 'Hotel request submitted successfully. Waiting for admin verification.',
            hotelId: result.insertId
        });

    } catch (error) {
        console.error('Request hotel error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit hotel request' });
    }
};
