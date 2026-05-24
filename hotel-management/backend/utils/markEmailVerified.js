const db = require('../config/db');

/**
 * One-time, lifetime email verification (stored in DB; not tied to port or FRONTEND_URL).
 * email_verified_at is never cleared; COALESCE keeps the first verification timestamp.
 */
const MARK_EMAIL_VERIFIED_SQL = `
  UPDATE users
  SET is_verified = 1,
      email_verified_at = COALESCE(email_verified_at, NOW()),
      verification_token = NULL
  WHERE id = ?
`;

async function markEmailVerified(userId) {
  await db.query(MARK_EMAIL_VERIFIED_SQL, [userId]);
}

module.exports = { markEmailVerified, MARK_EMAIL_VERIFIED_SQL };
