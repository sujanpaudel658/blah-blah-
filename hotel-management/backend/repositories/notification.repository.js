const db = require('../config/db');

const createNotification = async (payload) => {
  const {
    userId = null,
    role,
    title,
    message,
    type,
    referenceId = null,
    isRead = false,
    priority = 'medium'
  } = payload;

  const [result] = await db.query(
    `INSERT INTO notifications
      (user_id, role, title, message, type, reference_id, is_read, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, role, title, message, type, referenceId, isRead ? 1 : 0, priority]
  );

  return result.insertId;
};

const countUserNotificationsToday = async ({ userId, role }) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE role = ?
       AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?)
       AND DATE(created_at) = CURDATE()`,
    [role, userId, userId]
  );
  return Number(rows[0]?.count || 0);
};

const findRecentSimilarNotification = async ({ userId, role, title, type, minutes }) => {
  const [rows] = await db.query(
    `SELECT id
     FROM notifications
     WHERE role = ?
       AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?)
       AND title = ?
       AND type = ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
     ORDER BY created_at DESC
     LIMIT 1`,
    [role, userId, userId, title, type, minutes]
  );
  return rows[0] || null;
};

const getNotifications = async ({ userId, role, includeSystem = true, isRead, type, limit = 50, offset = 0 }) => {
  const where = [];
  const params = [];

  if (role) {
    where.push('n.role = ?');
    params.push(role);
  }

  if (userId !== undefined) {
    if (userId === null) {
      where.push('n.user_id IS NULL');
    } else if (includeSystem) {
      where.push('(n.user_id = ? OR n.user_id IS NULL)');
      params.push(userId);
    } else {
      where.push('n.user_id = ?');
      params.push(userId);
    }
  }

  if (typeof isRead === 'boolean') {
    where.push('n.is_read = ?');
    params.push(isRead ? 1 : 0);
  }

  if (type) {
    where.push('n.type = ?');
    params.push(type);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT n.*
     FROM notifications n
     ${whereSql}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return rows;
};

const markAsRead = async ({ id, userId, role }) => {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = ? AND role = ? AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?)`,
    [id, role, userId, userId]
  );
  return result.affectedRows > 0;
};

const markAllAsRead = async ({ userId, role }) => {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = 1
     WHERE role = ? AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?) AND is_read = 0`,
    [role, userId, userId]
  );
  return Number(result.affectedRows || 0);
};

const countUnread = async ({ userId, role }) => {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS unread_count
     FROM notifications
     WHERE role = ? AND ((user_id IS NULL AND ? IS NULL) OR user_id = ?) AND is_read = 0`,
    [role, userId, userId]
  );
  return Number(rows[0]?.unread_count || 0);
};

const createJob = async ({ eventType, payload, priority = 5, executeAfter = null }) => {
  const [result] = await db.query(
    `INSERT INTO notification_jobs (event_type, payload, priority, execute_after)
     VALUES (?, ?, ?, ?)`,
    [eventType, JSON.stringify(payload || {}), priority, executeAfter]
  );
  return result.insertId;
};

const getPendingJobs = async (limit = 20) => {
  const [rows] = await db.query(
    `SELECT *
     FROM notification_jobs
     WHERE status = 'pending'
       AND execute_after <= NOW()
     ORDER BY priority DESC, id ASC
     LIMIT ?`,
    [Number(limit)]
  );
  return rows;
};

const markJobProcessing = async (id) => {
  const [result] = await db.query(
    `UPDATE notification_jobs
     SET status = 'processing', attempts = attempts + 1
     WHERE id = ? AND status = 'pending'`,
    [id]
  );
  return result.affectedRows > 0;
};

const markJobCompleted = async (id) => {
  await db.query(
    `UPDATE notification_jobs
     SET status = 'completed', processed_at = NOW(), error_message = NULL
     WHERE id = ?`,
    [id]
  );
};

const markJobFailed = async (id, errorMessage, retryAfterSeconds = 60) => {
  await db.query(
    `UPDATE notification_jobs
     SET status = 'pending',
         error_message = ?,
         execute_after = DATE_ADD(NOW(), INTERVAL ? SECOND)
     WHERE id = ?`,
    [String(errorMessage || 'Unknown queue error').slice(0, 500), Number(retryAfterSeconds), id]
  );
};

const getHotelAdminIds = async (hotelId) => {
  if (!hotelId) return [];
  const [rows] = await db.query(
    `SELECT id FROM users WHERE role = 'admin' AND hotel_id = ?`,
    [hotelId]
  );
  return rows.map((row) => row.id);
};

const getSuperAdminIds = async () => {
  const [rows] = await db.query(
    `SELECT id FROM users WHERE role = 'superadmin'`
  );
  return rows.map((row) => row.id);
};

module.exports = {
  createNotification,
  countUserNotificationsToday,
  findRecentSimilarNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  countUnread,
  createJob,
  getPendingJobs,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  getHotelAdminIds,
  getSuperAdminIds
};
