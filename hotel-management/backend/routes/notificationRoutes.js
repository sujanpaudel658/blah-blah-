const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationSummary,
  createNotification,
  streamNotifications
} = require('../controllers/notificationController');

router.get('/stream', streamNotifications);
router.get('/', protect, getNotifications);
router.get('/summary', protect, getNotificationSummary);
router.patch('/:id/read', protect, markNotificationRead);
router.patch('/read-all', protect, markAllNotificationsRead);
router.post('/', protect, requireRole(['admin', 'superadmin']), createNotification);

module.exports = router;
