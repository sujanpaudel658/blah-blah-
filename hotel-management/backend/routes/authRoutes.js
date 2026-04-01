const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const {
  signup,
  login,
  googleAuth,
  getMe,
  setPassword,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updatePassword,
  uploadProfilePhoto
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const profilesDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, profilesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safe = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `user-${req.user.id}-${Date.now()}${safe}`);
  }
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
  }
});

function profilePhotoMiddleware(req, res, next) {
  profileUpload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/set-password', setPassword);
router.post('/verify-email', verifyEmail);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);
router.post('/profile-photo', protect, profilePhotoMiddleware, uploadProfilePhoto);

module.exports = router;
