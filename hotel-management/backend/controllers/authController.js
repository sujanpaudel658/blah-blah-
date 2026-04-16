const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const emailService = require('../services/email.service');
const { resolveFrontendBase } = require('../utils/resolveFrontendBase');
const crypto = require('crypto');

const createToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

const formatUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  hotel_id: user.hotel_id,
  profileImage: user.profile_image || null
});

const getRedirectPath = (role) => ({
  superadmin: '/superadmin/dashboard',
  admin: '/admin/dashboard'
}[role] || '/guest/dashboard');

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

    const [hotels] = await db.query('SELECT id FROM hotels WHERE email = ?', [email]);
    const isHotelAdmin = hotels.length > 0;
    const role = isHotelAdmin ? 'admin' : 'guest';
    const hotelId = isHotelAdmin ? hotels[0].id : null;

    const [result] = await db.query(
      'INSERT INTO users (full_name, email, phone, password, role, hotel_id, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, email, phone, hashedPass, role, hotelId, verificationTokenHash, false]
    );

    const frontendBase = resolveFrontendBase(req.body.clientOrigin);
    const emailResult = await emailService.sendVerificationEmail(
      email,
      verificationToken,
      fullName,
      frontendBase
    );
    const verificationEmailSent = !!emailResult.success;
    if (!verificationEmailSent) {
      await db.query('DELETE FROM users WHERE id = ?', [result.insertId]);
      const message =
        emailResult.reason === 'not_configured'
          ? 'Signup failed: email service is not configured. Set SMTP EMAIL_USER/EMAIL_PASS/EMAIL_FROM in backend/.env.'
          : 'Signup failed: verification email could not be delivered. Please try again.';
      return res.status(503).json({
        success: false,
        message,
        verificationEmailSent: false
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created. Check your inbox for a verification link.',
      verificationEmailSent,
      userId: result.insertId,
      email
    });
  } catch (error) {
    console.error('Signup error:', error);
    let message = 'Registration failed';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      message = 'Database table missing. Run migrations: node scripts/run_pending_migrations.js';
    } else if (error.code === 'ER_BAD_FIELD_ERROR' || error.code === 'ER_UNKNOWN_COLUMN') {
      message = 'Database is out of date. Run: node scripts/run_pending_migrations.js';
    } else if (error.code === 'ECONNREFUSED') {
      message = 'Cannot connect to the database. Check DB_HOST / DB_PORT in backend/.env';
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      message = 'One of the fields is too long (try a shorter phone or name).';
    }
    res.status(500).json({ success: false, message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, clientOrigin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.password) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      await db.query(
        'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
        [resetTokenHash, resetTokenExpiry, user.id]
      );

      const frontendBase = resolveFrontendBase(clientOrigin);
      const setupMailResult = await emailService.sendSetPasswordEmail(
        user.email,
        resetToken,
        user.full_name,
        frontendBase
      );

      if (!setupMailResult.success) {
        await db.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [user.id]);
        return res.status(503).json({
          success: false,
          requiresPasswordSet: true,
          message: 'Password setup is temporarily unavailable because setup email could not be sent.'
        });
      }

      return res.status(400).json({ 
        success: false, 
        message: 'This account uses Google Sign-In. We sent a secure password setup link to your email.',
        requiresPasswordSet: true,
        passwordSetupEmailSent: true,
        passwordSetupEmail: user.email,
        userId: user.id
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const verified =
      user.is_verified === true || user.is_verified === 1 || user.is_verified === '1';
    if (!verified && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message:
          'Please verify your email before signing in. Check your inbox for the verification link.',
        requiresEmailVerification: true,
        email: user.email
      });
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

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'No credential provided' });
    }

    const parts = credential.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid credential format' });
    }

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    const { email, name, sub: googleId } = decoded;

    const [hotels] = await db.query('SELECT id FROM hotels WHERE email = ?', [email]);
    const isHotelAdmin = hotels.length > 0;
    const hotelId = isHotelAdmin ? hotels[0].id : null;
    const role = isHotelAdmin ? 'admin' : 'guest';

    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE email = ? OR google_id = ?',
      [email, googleId]
    );

    let user, userId;

    if (existingUsers.length > 0) {
      user = existingUsers[0];
      userId = user.id;

      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
      }

      if (isHotelAdmin && user.role !== 'admin') {
        await db.query('UPDATE users SET role = ?, hotel_id = ? WHERE id = ?', [role, hotelId, userId]);
        user.role = role;
        user.hotel_id = hotelId;
      }
    } else {
      const [result] = await db.query(
        'INSERT INTO users (google_id, full_name, email, role, hotel_id, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [googleId, name, email, role, hotelId, true]
      );
      userId = result.insertId;
      const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      user = newUsers[0];
    }

    if (!user.is_verified) {
      await db.query('UPDATE users SET is_verified = 1 WHERE id = ?', [userId]);
      user.is_verified = 1;
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

exports.getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, hotel_id, profile_image FROM users WHERE id = ?',
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

exports.updateProfile = async (req, res) => {
  try {
    const fullName = (req.body.fullName || req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const phone = req.body.phone != null ? String(req.body.phone).trim() : undefined;

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.user.id]);
    if (dup.length > 0) {
      return res.status(400).json({ success: false, message: 'That email is already in use' });
    }

    await db.query(
      'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
      [fullName, email, phone === undefined ? null : phone || null, req.user.id]
    );

    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, hotel_id, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, user: formatUser(users[0]) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!users[0].password) {
      return res.status(400).json({
        success: false,
        message: 'This account has no password set. Use Google sign-in or request a secure password setup link.'
      });
    }

    const ok = await bcrypt.compare(currentPassword, users[0].password);
    if (!ok) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file received' });
    }

    const [existing] = await db.query('SELECT profile_image FROM users WHERE id = ?', [req.user.id]);
    const oldPath = existing[0]?.profile_image;
    if (oldPath && typeof oldPath === 'string' && oldPath.startsWith('/uploads/profiles/')) {
      const abs = path.join(__dirname, '..', oldPath.replace(/^\//, ''));
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch (e) {
        console.warn('Could not remove old profile image:', e.message);
      }
    }

    const urlPath = `/uploads/profiles/${req.file.filename}`;
    await db.query('UPDATE users SET profile_image = ? WHERE id = ?', [urlPath, req.user.id]);

    const [users] = await db.query(
      'SELECT id, full_name, email, phone, role, hotel_id, profile_image FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, profileImage: urlPath, user: formatUser(users[0]) });
  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo' });
  }
};

exports.setPassword = async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'Invalid or expired setup token' });
    }

    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ success: false, message: 'Setup token has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({
      success: true,
      message: 'Password set successfully. You can now log in with your email and password.'
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ success: false, message: 'Failed to set password' });
  }
};

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

    await db.query('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?', [user.id]);

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

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email, password, clientOrigin } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    const verified =
      user.is_verified === true || user.is_verified === 1 || user.is_verified === '1';
    if (verified) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_VERIFIED',
        message: 'This email is already verified. You can sign in.'
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          'This account uses Google sign-in. Sign in with Google or set a password using the link from your email.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = await bcrypt.hash(verificationToken, 10);
    await db.query('UPDATE users SET verification_token = ? WHERE id = ?', [
      verificationTokenHash,
      user.id
    ]);

    const frontendBase = resolveFrontendBase(clientOrigin);
    const emailResult = await emailService.sendVerificationEmail(
      email,
      verificationToken,
      user.full_name,
      frontendBase
    );
    if (!emailResult.success) {
      const message =
        emailResult.reason === 'not_configured'
          ? 'Verification email could not be sent. Email service is not configured.'
          : 'Verification email could not be sent. Please try again later.';
      return res.status(503).json({ success: false, message });
    }

    res.json({
      success: true,
      verificationEmailSent: true,
      message: 'A new verification link has been sent to your email.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend verification email' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email, clientOrigin } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.json({ success: true, message: 'If email exists, password reset link has been sent' });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetTokenHash, resetTokenExpiry, user.id]
    );

    const frontendBase = resolveFrontendBase(clientOrigin);
    const resetMailResult = await emailService.sendPasswordResetEmail(
      email,
      resetToken,
      user.full_name,
      frontendBase
    );
    if (!resetMailResult.success) {
      await db.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [user.id]);
      const message =
        resetMailResult.reason === 'not_configured'
          ? 'Password reset is temporarily unavailable because email service is not configured.'
          : 'Could not send reset email right now. Please try again.';
      return res.status(503).json({ success: false, message });
    }

    res.json({ success: true, message: 'Password reset link has been sent to your email' });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ success: false, message: 'Failed to request password reset' });
  }
};

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

    if (new Date() > new Date(user.reset_token_expiry)) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

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
