const notificationRepository = require('../repositories/notification.repository');
const realtimeNotificationService = require('./realtimeNotification.service');
const { NOTIFICATION_PRIORITIES } = require('../constants/notification.constants');

const DAILY_LIMIT = Number(process.env.NOTIFICATION_DAILY_LIMIT || 40);
const BATCH_WINDOW_MINUTES = Number(process.env.NOTIFICATION_BATCH_WINDOW_MINUTES || 30);

const canSendNotification = async ({ userId, role, priority }) => {
  if (priority === NOTIFICATION_PRIORITIES.HIGH) return true;
  const count = await notificationRepository.countUserNotificationsToday({ userId, role });
  return count < DAILY_LIMIT;
};

const saveNotification = async (payload) => {
  const allowed = await canSendNotification(payload);
  if (!allowed) return null;

  if (payload.priority !== NOTIFICATION_PRIORITIES.HIGH) {
    const similar = await notificationRepository.findRecentSimilarNotification({
      userId: payload.userId ?? null,
      role: payload.role,
      title: payload.title,
      type: payload.type,
      minutes: BATCH_WINDOW_MINUTES
    });
    if (similar) return null;
  }

  const id = await notificationRepository.createNotification(payload);
  const created = { id, ...payload };

  realtimeNotificationService.publish({
    role: payload.role,
    userId: payload.userId ?? null,
    event: 'notification',
    payload: created
  });

  return id;
};

const getNotifications = async (filter) => notificationRepository.getNotifications(filter);

const markAsRead = async ({ id, userId, role }) => notificationRepository.markAsRead({ id, userId, role });
const markAllAsRead = async ({ userId, role }) => notificationRepository.markAllAsRead({ userId, role });
const countUnread = async ({ userId, role }) => notificationRepository.countUnread({ userId, role });

const enqueueEvent = async ({ eventType, payload, priority = 5, executeAfter = null }) => {
  return notificationRepository.createJob({ eventType, payload, priority, executeAfter });
};

const handleNotificationJob = async (job) => {
  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload || '{}') : (job.payload || {});
  const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];
  for (const recipient of recipients) {
    await saveNotification({
      userId: recipient.userId ?? null,
      role: recipient.role,
      title: payload.title,
      message: payload.message,
      type: payload.type,
      referenceId: payload.referenceId ?? null,
      priority: payload.priority || NOTIFICATION_PRIORITIES.MEDIUM
    });
  }
};

const getAdminRecipientsForHotel = async (hotelId) => {
  const ids = await notificationRepository.getHotelAdminIds(hotelId);
  return ids.map((id) => ({ role: 'admin', userId: id }));
};

const getSuperAdminRecipients = async () => {
  const ids = await notificationRepository.getSuperAdminIds();
  return ids.map((id) => ({ role: 'superadmin', userId: id }));
};

module.exports = {
  saveNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  countUnread,
  enqueueEvent,
  handleNotificationJob,
  getAdminRecipientsForHotel,
  getSuperAdminRecipients
};
