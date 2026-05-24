const db = require('../config/db');

// 5 stays in same hotel in one  calendar year → one redeemable free night.

const LOYALTY_THRESHOLD = 5;

const getLoyaltyStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { hotelId } = req.params;
        const currentYear = new Date().getFullYear();

        const [rows] = await db.query(
            `SELECT COUNT(*) as completed_stays 
             FROM bookings 
             WHERE user_id = ? 
               AND hotel_id = ? 
               AND status IN ('confirmed', 'checked_in', 'checked_out')
               AND YEAR(check_in_date) = ?
               AND (loyalty_free_night = 0 OR loyalty_free_night IS NULL)`,
            [userId, hotelId, currentYear]
        );

        const [redeemed] = await db.query(
            `SELECT COUNT(*) as redeemed_count 
             FROM bookings 
             WHERE user_id = ? 
               AND hotel_id = ? 
               AND loyalty_free_night = 1 
               AND YEAR(check_in_date) = ?`,
            [userId, hotelId, currentYear]
        );

        const completedStays = rows[0].completed_stays || 0;
        const progressInCycle = completedStays % LOYALTY_THRESHOLD;
        const isEligible = completedStays >= LOYALTY_THRESHOLD && progressInCycle === 0 && completedStays > 0;

        const totalCyclesCompleted = Math.floor(completedStays / LOYALTY_THRESHOLD);
        const redeemedCount = redeemed[0].redeemed_count || 0;
        const hasUnusedReward = totalCyclesCompleted > redeemedCount;

        res.json({
            success: true,
            loyalty: {
                hotel_id: parseInt(hotelId),
                completed_stays: completedStays,
                threshold: LOYALTY_THRESHOLD,
                progress: hasUnusedReward ? LOYALTY_THRESHOLD : (completedStays % LOYALTY_THRESHOLD),
                is_eligible: hasUnusedReward,
                rewards_earned: totalCyclesCompleted,
                rewards_redeemed: redeemedCount,
                rewards_available: totalCyclesCompleted - redeemedCount,
                year: currentYear
            }
        });

    } catch (error) {
        console.error('Loyalty Status Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loyalty status'
        });
    }
};

const getLoyaltyOverview = async (req, res) => {
    try {
        const userId = req.user.id;
        const currentYear = new Date().getFullYear();

        const [rows] = await db.query(
            `SELECT 
                b.hotel_id, 
                h.name as hotel_name,
                h.city as hotel_city,
                h.image as hotel_image,
                COUNT(*) as completed_stays,
                SUM(CASE WHEN b.loyalty_free_night = 1 THEN 1 ELSE 0 END) as redeemed_count
             FROM bookings b
             JOIN hotels h ON b.hotel_id = h.id
             WHERE b.user_id = ? 
               AND b.status IN ('confirmed', 'checked_in', 'checked_out')
               AND YEAR(b.check_in_date) = ?
             GROUP BY b.hotel_id, h.name, h.city, h.image
             ORDER BY completed_stays DESC`,
            [userId, currentYear]
        );

        const loyaltyData = rows.map(row => {
            const nonRewardedStays = row.completed_stays - row.redeemed_count;
            const totalCycles = Math.floor(nonRewardedStays / LOYALTY_THRESHOLD);
            const progress = nonRewardedStays % LOYALTY_THRESHOLD;
            const availableRewards = totalCycles > 0 ? totalCycles : 0;

            return {
                hotel_id: row.hotel_id,
                hotel_name: row.hotel_name,
                hotel_city: row.hotel_city,
                hotel_image: row.hotel_image,
                completed_stays: row.completed_stays,
                threshold: LOYALTY_THRESHOLD,
                progress: availableRewards > 0 ? LOYALTY_THRESHOLD : progress,
                is_eligible: availableRewards > 0,
                rewards_available: availableRewards,
                year: currentYear
            };
        });

        res.json({
            success: true,
            loyalty: loyaltyData
        });

    } catch (error) {
        console.error('Loyalty Overview Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loyalty overview'
        });
    }
};

module.exports = {
    getLoyaltyStatus,
    getLoyaltyOverview,
    LOYALTY_THRESHOLD
};
