const db = require('../config/db');

exports.createReview = async (req, res) => {
    const { booking_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title } = req.body;
    const user_id = req.user.id;

    try {
        const [bookings] = await db.query(
            'SELECT hotel_id, status FROM bookings WHERE id = ? AND user_id = ?',
            [booking_id, user_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking record not found.' });
        }

        const booking = bookings[0];

        if (!['checked_in', 'checked_out'].includes(booking.status)) {
            return res.status(400).json({
                success: false,
                message: 'Feedback protocols can only be initiated for verified checked-in or completed operational sessions.'
            });
        }

        const [existing] = await db.query('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Multiple submissions for a single registry entry are prohibited.' });
        }

        await db.query(
            `INSERT INTO reviews 
      (booking_id, user_id, hotel_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [booking_id, user_id, booking.hotel_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title]
        );

        const [stats] = await db.query(
            'SELECT AVG(rating) as avg_rating FROM reviews WHERE hotel_id = ?',
            [booking.hotel_id]
        );

        await db.query(
            'UPDATE hotels SET rating = ? WHERE id = ?',
            [stats[0].avg_rating || 0, booking.hotel_id]
        );

        res.status(201).json({ success: true, message: 'Review protocol executed successfully.' });
    } catch (error) {
        console.error('Review submission error:', error);
        res.status(500).json({ success: false, message: 'Registry update failure.' });
    }
};

exports.getHotelReviews = async (req, res) => {
    const hotel_id = req.params.hotelId;

    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.full_name as reviewer_name, u.profile_image as reviewer_profile_image, b.status as booking_status
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       JOIN bookings b ON r.booking_id = b.id
       WHERE r.hotel_id = ? AND b.status IN ('checked_in', 'checked_out')
       ORDER BY r.created_at DESC`,
            [hotel_id]
        );

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve review dossiers.' });
    }
};

exports.getBookingReview = async (req, res) => {
    const booking_id = req.params.bookingId;
    const user_id = req.user.id;

    try {
        const [reviews] = await db.query(
            'SELECT * FROM reviews WHERE booking_id = ? AND user_id = ?',
            [booking_id, user_id]
        );

        res.json({ success: true, review: reviews[0] || null });
    } catch (error) {
        console.error('Get booking review error:', error);
        res.status(500).json({ success: false, message: 'Failed to cross-reference registry.' });
    }
};

exports.getFeaturedReviews = async (req, res) => {
    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.full_name as reviewer_name, u.profile_image as reviewer_profile_image, h.name as hotel_name, b.status as booking_status
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       JOIN hotels h ON r.hotel_id = h.id
       JOIN bookings b ON r.booking_id = b.id
       WHERE b.status IN ('checked_in', 'checked_out')
       ORDER BY r.rating DESC, r.created_at DESC 
       LIMIT 6`
        );

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Get featured reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve featured experiences.' });
    }
};
