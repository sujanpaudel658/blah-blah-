const db = require('../config/db');

async function main() {
  try {
    const [guests] = await db.query(
      "SELECT id FROM users WHERE role = 'guest' ORDER BY created_at DESC LIMIT 5"
    );
    const guestIds = guests.map((g) => g.id);

    const [offerInsert] = await db.query(
      `INSERT INTO offers
        (title, description, offer_type, discount_type, discount_value, coupon_code, valid_from, valid_to, usage_limit, applicable_hotels, applicable_rooms, user_segment, created_by)
       VALUES
        (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY), ?, ?, ?, ?, NULL)`,
      [
        'Welcome Spring Offer',
        'Get 15% off on your next hotel booking.',
        'seasonal',
        'percentage',
        15,
        'SPRING15',
        500,
        JSON.stringify([]),
        JSON.stringify([]),
        'all'
      ]
    );

    if (guestIds.length) {
      const valuesSql = guestIds.map(() => '(?, ?, 0, NOW())').join(', ');
      const params = [];
      guestIds.forEach((userId) => params.push(userId, offerInsert.insertId));
      await db.query(
        `INSERT IGNORE INTO user_offers (user_id, offer_id, is_used, assigned_at) VALUES ${valuesSql}`,
        params
      );
    }

    console.log('Seeded offer id:', offerInsert.insertId);
    console.log('Assigned users:', guestIds.length);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

main();
