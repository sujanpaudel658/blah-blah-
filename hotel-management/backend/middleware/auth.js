const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query(
      'SELECT id, full_name, email, role, hotel_id, is_verified FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = users[0];

    const verified =
      req.user.is_verified === true ||
      req.user.is_verified === 1 ||
      req.user.is_verified === '1';
    if (!verified && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to continue.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Role '${req.user?.role || 'unknown'}' is not authorized`
    });
  }
  next();
};

exports.superAdminOnly = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
  }
  next();
};

exports.adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

exports.authenticateToken = exports.protect;
exports.requireRole = (roles) => exports.authorize(...roles);
