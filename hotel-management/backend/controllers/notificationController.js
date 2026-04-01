const notificationService = require('../services/notification.service');
const realtimeNotificationService = require('../services/realtimeNotification.service');

const roleMap = {
  guest: 'user',
  admin: 'admin',
  superadmin: 'superadmin'
};

const getNotifications = async (req, res) => {
  try {
    const role = roleMap[req.user.role] || req.user.role;
    const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
    const notifications = await notificationService.getNotifications({
      userId,
      role,
      includeSystem: req.query.includeSystem === 'false' ? false : true,
      isRead: req.query.isRead === undefined ? undefined : String(req.query.isRead) === 'true',
      type: req.query.type || undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0
    });
    return res.json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const role = roleMap[req.user.role] || req.user.role;
    const userId = req.body.userId ? Number(req.body.userId) : req.user.id;
    const ok = await notificationService.markAsRead({
      id: Number(req.params.id),
      userId,
      role
    });

    if (!ok) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const role = roleMap[req.user.role] || req.user.role;
    const userId = role === 'user' ? req.user.id : (req.body.userId ? Number(req.body.userId) : null);
    const updated = await notificationService.markAllAsRead({ userId, role });
    return res.json({ success: true, message: 'Notifications marked as read', updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
  }
};

const getNotificationSummary = async (req, res) => {
  try {
    const role = roleMap[req.user.role] || req.user.role;
    const userId = role === 'user' ? req.user.id : (req.query.userId ? Number(req.query.userId) : null);
    const unread = await notificationService.countUnread({ userId, role });
    return res.json({ success: true, unread });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notification summary' });
  }
};

const createNotification = async (req, res) => {
  try {
    const { eventType = 'manual', title, message, type, priority, referenceId, recipients } = req.body;
    if (!title || !message || !type || !Array.isArray(recipients) || !recipients.length) {
      return res.status(400).json({
        success: false,
        message: 'title, message, type and recipients[] are required'
      });
    }

    const jobId = await notificationService.enqueueEvent({
      eventType,
      priority: Number(priority || 5),
      payload: { title, message, type, priority, referenceId, recipients }
    });

    return res.status(201).json({ success: true, message: 'Notification queued', jobId });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to queue notification' });
  }
};

const streamNotifications = async (req, res) => {
  try {
    const user = await realtimeNotificationService.resolveSseUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const role = roleMap[user.role] || user.role;
    const userId = user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`event: ping\ndata: ${JSON.stringify({ connected: true })}\n\n`);

    realtimeNotificationService.subscribe({ role, userId, res });

    req.on('close', () => {
      realtimeNotificationService.unsubscribe({ role, userId, res });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to open notification stream' });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSummary,
  createNotification,
  streamNotifications
};
