const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// generate JWT - keeping it simple for now
const createToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// format user object before sending - don't wanna send password lol
const formatUser = (user) => {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    hotel_id: user.hotel_id
  };
};

// Signup handler
exports.signup = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    // basic checks
    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // check if user already exists
    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // hash password
    const hashedPass = await bcrypt.hash(password, 10);

    // Check if email matches a hotel admin email
    const [hotels] = await db.query(
      'SELECT id FROM hotels WHERE email = ?',
      [email]
    );

    let role = 'guest';
    let hotelId = null;
    let redirectPath = '/guest/dashboard';
    if (hotels.length > 0) {
      // Email matches a hotel admin email, assign admin role and hotel_id
      role = 'admin';
      hotelId = hotels[0].id;
      redirectPath = '/admin/dashboard';
    }

    // Insert user with determined role and hotel_id (if admin)
    let query, params;
    if (role === 'admin') {
      query = 'INSERT INTO users (full_name, email, phone, password, role, hotel_id) VALUES (?, ?, ?, ?, ?, ?)';
      params = [fullName, email, phone, hashedPass, role, hotelId];
    } else {
      query = 'INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)';
      params = [fullName, email, phone, hashedPass, role];
    }
    const [result] = await db.query(query, params);

    // create token with role
    const token = jwt.sign(
      { id: result.insertId, email, role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: result.insertId,
        fullName,
        email,
        phone,
        role,
        hotelId
      },
      redirectPath
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login handler
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // generate token with role
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // determine redirect path based on role
    let redirectPath = '/guest/dashboard';
    if (user.role === 'superadmin') {
      redirectPath = '/superadmin/dashboard';
    } else if (user.role === 'admin') {
      redirectPath = '/admin/dashboard';
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: formatUser(user),
      redirectPath
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Google OAuth handler with RBAC
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    // validation
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'No credential provided'
      });
    }

    // decode the JWT token from Google
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credential format'
      });
    }

    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
    const decoded = JSON.parse(decodedPayload);

    const { email, name, sub: googleId } = decoded;

    // Check if email matches a hotel admin email
    const [hotels] = await db.query('SELECT id, email FROM hotels WHERE email = ?', [email]);
    const isHotelAdmin = hotels.length > 0;
    const hotelId = isHotelAdmin ? hotels[0].id : null;
    const role = isHotelAdmin ? 'admin' : 'guest';

    // check if user exists by email or google_id
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    );

    let user;
    let userId;

    if (existingUsers.length > 0) {
      // user exists - update google_id if not set
      user = existingUsers[0];
      userId = user.id;
      
      if (!user.google_id) {
        await db.query(
          'UPDATE users SET google_id = ? WHERE id = ?',
          [googleId, userId]
        );
      }

      // If user is now admin but was guest, update role and hotel_id
      if (isHotelAdmin && user.role !== 'admin') {
        await db.query(
          'UPDATE users SET role = ?, hotel_id = ? WHERE id = ?',
          [role, hotelId, userId]
        );
        user.role = role;
        user.hotel_id = hotelId;
      }
    } else {
      // create new user with appropriate role
      const [result] = await db.query(
        'INSERT INTO users (google_id, full_name, email, role, hotel_id) VALUES (?, ?, ?, ?, ?)',
        [googleId, name, email, role, hotelId]
      );
      
      userId = result.insertId;
      
      // fetch the newly created user
      const [newUsers] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      user = newUsers[0];
    }

    // generate token with role
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // determine redirect path based on role
    let redirectPath = '/guest/dashboard';
    if (user.role === 'superadmin') {
      redirectPath = '/superadmin/dashboard';
    } else if (user.role === 'admin') {
      redirectPath = '/admin/dashboard';
    }

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: formatUser(user),
      redirectPath
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, hotel_id FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: users[0].id,
        fullName: users[0].full_name,
        email: users[0].email,
        phone: users[0].phone,
        role: users[0].role,
        hotel_id: users[0].hotel_id
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
