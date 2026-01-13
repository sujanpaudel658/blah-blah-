const { Router } = require('express');
const { signup, login, googleAuth, getMe, setPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/set-password', setPassword);
router.get('/me', protect, getMe);

module.exports = router;
