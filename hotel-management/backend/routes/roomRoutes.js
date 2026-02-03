const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/search', roomController.searchRooms);

// Admin & SuperAdmin routes
router.get('/', protect, roomController.getRooms);
router.post('/', protect, authorize('admin', 'superadmin'), roomController.createRoom);
router.put('/:id', protect, authorize('admin', 'superadmin'), roomController.updateRoom);
router.delete('/:id', protect, authorize('admin', 'superadmin'), roomController.deleteRoom);

// Room Types
router.get('/types', protect, roomController.getRoomTypes);
router.post('/types', protect, authorize('admin', 'superadmin'), roomController.createRoomType);

module.exports = router;
