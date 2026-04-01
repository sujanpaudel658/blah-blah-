const db = require('../config/db');

const createOffer = async (offer) => {
  const [result] = await db.query(
    `INSERT INTO offers
      (title, description, offer_type, discount_type, discount_value, coupon_code, valid_from, valid_to, usage_limit, applicable_hotels, applicable_rooms, user_segment, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      offer.title,
      offer.description,
      offer.offerType,
      offer.discountType,
      offer.discountValue,
      offer.couponCode || null,
      offer.validFrom,
      offer.validTo,
      offer.usageLimit || null,
      JSON.stringify(offer.applicableHotels || []),
      JSON.stringify(offer.applicableRooms || []),
      offer.userSegment,
      offer.createdBy || null
    ]
  );
  return result.insertId;
};

const getOfferById = async (id) => {
  const [rows] = await db.query(`SELECT * FROM offers WHERE id = ?`, [id]);
  return rows[0] || null;
};

const getOfferByCoupon = async (couponCode) => {
  const [rows] = await db.query(
    `SELECT * FROM offers WHERE coupon_code = ? LIMIT 1`,
    [couponCode]
  );
  return rows[0] || null;
};

const getActiveOffers = async (now = new Date()) => {
  const [rows] = await db.query(
    `SELECT *
     FROM offers
     WHERE is_active = 1
       AND valid_from <= ?
       AND valid_to >= ?
     ORDER BY created_at DESC`,
    [now, now]
  );
  return rows;
};

const assignOfferToUsers = async (offerId, userIds) => {
  if (!userIds.length) return 0;
  const valuesSql = userIds.map(() => '(?, ?, 0, NOW())').join(', ');
  const params = [];
  userIds.forEach((userId) => {
    params.push(userId, offerId);
  });

  const [result] = await db.query(
    `INSERT IGNORE INTO user_offers (user_id, offer_id, is_used, assigned_at)
     VALUES ${valuesSql}`,
    params
  );
  return result.affectedRows || 0;
};

const markUserOfferUsed = async ({ userId, offerId }) => {
  const [result] = await db.query(
    `UPDATE user_offers
     SET is_used = 1, used_at = NOW()
     WHERE user_id = ? AND offer_id = ? AND is_used = 0`,
    [userId, offerId]
  );
  return result.affectedRows > 0;
};

const getOfferUsageCount = async (offerId) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count FROM user_offers WHERE offer_id = ? AND is_used = 1`,
    [offerId]
  );
  return Number(rows[0]?.count || 0);
};

const getUsersBySegment = async (segment) => {
  if (segment === 'new') {
    const [rows] = await db.query(
      `SELECT id FROM users
       WHERE role = 'guest'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );
    return rows.map((row) => row.id);
  }

  if (segment === 'frequent') {
    const [rows] = await db.query(
      `SELECT u.id
       FROM users u
       JOIN bookings b ON b.user_id = u.id
       WHERE u.role = 'guest'
       GROUP BY u.id
       HAVING COUNT(b.id) >= 5`
    );
    return rows.map((row) => row.id);
  }

  if (segment === 'inactive') {
    const [rows] = await db.query(
      `SELECT u.id
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       WHERE u.role = 'guest'
       GROUP BY u.id
       HAVING MAX(b.created_at) IS NULL
          OR MAX(b.created_at) < DATE_SUB(NOW(), INTERVAL 90 DAY)`
    );
    return rows.map((row) => row.id);
  }

  const [rows] = await db.query(
    `SELECT id FROM users WHERE role = 'guest'`
  );
  return rows.map((row) => row.id);
};

module.exports = {
  createOffer,
  getOfferById,
  getOfferByCoupon,
  getActiveOffers,
  assignOfferToUsers,
  markUserOfferUsed,
  getOfferUsageCount,
  getUsersBySegment
};
