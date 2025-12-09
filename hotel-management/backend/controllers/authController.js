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
    role: user.role
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

    // insert user
    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [fullName, email, phone, hashedPass, 'guest']
    );

    // create token
    const token = createToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: result.insertId,
        fullName,
        email,
        phone,
        role: 'guest'
      }
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

    // generate token
    const token = createToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: formatUser(user)
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
