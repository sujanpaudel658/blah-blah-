const db = require('../config/db');

/**
 * Submit a new review for a booking
 */
exports.createReview = async (req, res) => {
    const { booking_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title } = req.body;
    const user_id = req.user.id; // From protect middleware

    try {
        // 1. Verify booking exists and belongs to user
        const [bookings] = await db.query(
            'SELECT hotel_id, status FROM bookings WHERE id = ? AND user_id = ?',
            [booking_id, user_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ success: false, message: 'Booking record not found.' });
        }

        const booking = bookings[0];

        // 2. Prevent duplicate reviews for same booking
        const [existing] = await db.query('SELECT id FROM reviews WHERE booking_id = ?', [booking_id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Multiple submissions for a single registry entry are prohibited.' });
        }

        // 3. Insert review
        await db.query(
            `INSERT INTO reviews 
      (booking_id, user_id, hotel_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [booking_id, user_id, booking.hotel_id, rating, comment, cleanliness_rating, service_rating, location_rating, value_rating, title]
        );

        // 4. Update hotel average rating
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

/**
 * Get reviews for a specific hotel
 */
exports.getHotelReviews = async (req, res) => {
    const hotel_id = req.params.hotelId;

    try {
        const [reviews] = await db.query(
            `SELECT r.*, u.full_name as reviewer_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.hotel_id = ? 
       ORDER BY r.created_at DESC`,
            [hotel_id]
        );

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve review dossiers.' });
    }
};

/**
 * Get review for a specific booking (to check if already reviewed)
 */
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
