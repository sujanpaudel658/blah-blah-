const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // check for token in authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // fetch user from database
    const [users] = await db.query(
      'SELECT id, full_name, email, role, hotel_id FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // attach user to request
    req.user = users[0];
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    console.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed',
      error: error.message
    });
  }
};

// Check if user has required role
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Superadmin only middleware
exports.superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin only.'
    });
  }
  next();
};

// Admin or Superadmin middleware
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};
