const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const emailService = require('../services/email.service');
const crypto = require('crypto');

// Helper functions
const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const formatUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  hotel_id: user.hotel_id
});

const getRedirectPath = (role) => ({
  superadmin: '/superadmin/dashboard',
  admin: '/admin/dashboard'
}[role] || '/guest/dashboard');

// Signup handler
exports.signup = async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPass = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = await bcrypt.hash(verificationToken, 10);

    // Check if email matches a hotel admin email
    const [hotels] = await db.query('SELECT id FROM hotels WHERE email = ?', [email]);
    const isHotelAdmin = hotels.length > 0;
    const role = isHotelAdmin ? 'admin' : 'guest';
    const hotelId = isHotelAdmin ? hotels[0].id : null;

    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, hotel_id, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, hashedPass, role, hotelId, verificationTokenHash, false]
    );

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, verificationToken, fullName);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue signup even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
      userId: result.insertId,
      email
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

// Login handler
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    
    // Check if user has a password (Google users may not)
    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        message: 'This account was created with Google Sign-In. Please set a password first.',
        requiresPasswordSet: true,
        userId: user.id
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = createToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: formatUser(user),
      redirectPath: getRedirectPath(user.role)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// Google OAuth handler
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'No credential provided' });
    }

    // Decode Google JWT
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid credential format' });
    }

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const { email, name, sub: googleId } = decoded;

    // Check if email matches a hotel admin
    const [hotels] = await db.query('SELECT id FROM hotels WHERE email = ?', [email]);
    const isHotelAdmin = hotels.length > 0;
    const hotelId = isHotelAdmin ? hotels[0].id : null;
    const role = isHotelAdmin ? 'admin' : 'guest';

    // Find or create user
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    );

    let user, userId;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      userId = user.id;
      
      // Update google_id if not set
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
      }

      // Promote to admin if email matches hotel
      if (isHotelAdmin && user.role !== 'admin') {
        await db.query('UPDATE users SET role = ?, hotel_id = ? WHERE id = ?', [role, hotelId, userId]);
        user.role = role;
        user.hotel_id = hotelId;
      }
    } else {
      // Create new user
      const [result] = await db.query(
        'INSERT INTO users (google_id, full_name, email, role, hotel_id) VALUES (?, ?, ?, ?, ?)',
        [googleId, name, email, role, hotelId]
      );
      userId = result.insertId;
      const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      user = newUsers[0];
    }

    const token = createToken({ id: userId, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: formatUser(user),
      redirectPath: getRedirectPath(user.role)
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, message: 'Google authentication failed' });
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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: formatUser(users[0]) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

// Set password for Google users
exports.setPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);

    res.json({
      success: true,
      message: 'Password set successfully. You can now log in with your email and password.'
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ success: false, message: 'Failed to set password' });
  }
};

// Verify email handler
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE verification_token IS NOT NULL');
    
    let user = null;
    for (const u of users) {
      const isValid = await bcrypt.compare(token, u.verification_token);
      if (isValid) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    if (user.is_verified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    // Mark email as verified
    await db.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.full_name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      success: true,
      message: 'Email verified successfully. Welcome to Nepal Stays!'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Email verification failed' });
  }
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      // Don't reveal if email exists (security best practice)
      return res.json({ success: true, message: 'If email exists, password reset link has been sent' });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetTokenHash, resetTokenExpiry, user.id]
    );

    // Send password reset email
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.full_name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({ success: true, message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Failed to request password reset' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE reset_token IS NOT NULL');
    
    let user = null;
    for (const u of users) {
      const isValid = await bcrypt.compare(token, u.reset_token);
      if (isValid) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Check if token has expired
    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};
