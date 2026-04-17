const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

router.get('/search', roomController.searchRooms);

router.get('/', protect, roomController.getRooms);
router.post('/bulk', protect, authorize('admin', 'superadmin'), roomController.bulkCreateRooms);
router.post('/multi-bulk', protect, authorize('admin', 'superadmin'), roomController.bulkMultiCreateRooms);
router.post('/add-by-numbers', protect, authorize('admin', 'superadmin'), roomController.bulkAddRoomsByNumbers);
router.post('/', protect, authorize('admin', 'superadmin'), roomController.createRoom);
router.put('/:id', protect, authorize('admin', 'superadmin'), roomController.updateRoom);
router.delete('/:id', protect, authorize('admin', 'superadmin'), roomController.deleteRoom);

router.get('/types', protect, roomController.getRoomTypes);
router.post('/types', protect, authorize('admin', 'superadmin'), roomController.createRoomType);
router.put('/types/:id', protect, authorize('admin', 'superadmin'), roomController.updateRoomType);
router.delete('/types/:id', protect, authorize('admin', 'superadmin'), roomController.deleteRoomType);

module.exports = router;
