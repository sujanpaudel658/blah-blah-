

async function findHotelAdmin(dbOrConn, hotelId, excludeUserId = null) {
  const hid = Number(hotelId);
  if (!Number.isFinite(hid)) return null;

  const sql = excludeUserId != null
    ? `SELECT id, full_name, email FROM users WHERE role = 'admin' AND hotel_id = ? AND id != ? LIMIT 1`
    : `SELECT id, full_name, email FROM users WHERE role = 'admin' AND hotel_id = ? LIMIT 1`;
  const params =
    excludeUserId != null ? [hid, Number(excludeUserId)] : [hid];

  const [rows] = await dbOrConn.query(sql, params);
  return rows[0] || null;
}

async function findHotelAdminConflict(dbOrConn, hotelId, assigneeUserId) {
  const existing = await findHotelAdmin(dbOrConn, hotelId, assigneeUserId);
  if (!existing) return null;
  return existing;
}

async function userManagesOtherHotel(dbOrConn, userId, targetHotelId) {
  const uid = Number(userId);
  const hid = Number(targetHotelId);
  if (!Number.isFinite(uid) || !Number.isFinite(hid)) return false;

  const [rows] = await dbOrConn.query(
    `SELECT id FROM users WHERE id = ? AND role = 'admin' AND hotel_id IS NOT NULL AND hotel_id != ? LIMIT 1`,
    [uid, hid]
  );
  return rows.length > 0;
}

/** Demote every other admin on this hotel before assigning a new manager. */
async function demoteOtherHotelAdmins(dbOrConn, hotelId, keepUserId) {
  const hid = Number(hotelId);
  const keep = Number(keepUserId);
  if (!Number.isFinite(hid) || !Number.isFinite(keep)) return;

  await dbOrConn.query(
    `UPDATE users SET role = 'guest', hotel_id = NULL WHERE role = 'admin' AND hotel_id = ? AND id != ?`,
    [hid, keep]
  );
}

function hotelManagerExistsPayload(existing) {
  const label = existing?.email || existing?.full_name || 'another account';
  return {
    success: false,
    code: 'HOTEL_MANAGER_EXISTS',
    message: `This hotel already has a manager (${label}). Only one manager account is allowed per hotel.`
  };
}

module.exports = {
  findHotelAdmin,
  findHotelAdminConflict,
  userManagesOtherHotel,
  demoteOtherHotelAdmins,
  hotelManagerExistsPayload
};
