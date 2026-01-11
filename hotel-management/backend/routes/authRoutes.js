const { Router } = require('express');
const { signup, login, googleAuth, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);

module.exports = router;
