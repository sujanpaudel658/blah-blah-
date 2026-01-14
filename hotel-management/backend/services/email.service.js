const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send verification email
exports.sendVerificationEmail = async (email, verificationToken, userName) => {
  try {
    const verificationLink = `http://localhost:3000/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - Nepal Stays',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10182F; padding: 20px; border-radius: 8px; color: white;">
            <h2 style="color: #F6C768;">Welcome to Nepal Stays, ${userName}!</h2>
            <p>Thank you for signing up. Please verify your email address to complete your account setup.</p>
            <p style="margin-top: 30px;">
              <a href="${verificationLink}" style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email
              </a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #B0B8D1;">Or copy this link: ${verificationLink}</p>
            <p style="margin-top: 30px; color: #B0B8D1;">This link expires in 24 hours.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Verification email sent' };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

// Send welcome email
exports.sendWelcomeEmail = async (email, userName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to Nepal Stays!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10182F; padding: 20px; border-radius: 8px; color: white;">
            <h2 style="color: #F6C768;">Welcome, ${userName}!</h2>
            <p>Your account has been verified and is now active. You can start using Nepal Stays to manage your hotel bookings.</p>
            <ul style="margin-top: 20px; line-height: 1.8;">
              <li>📅 Browse available hotels</li>
              <li>🏨 Make reservations easily</li>
              <li>💳 Manage your bookings</li>
              <li>📞 24/7 customer support</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="http://localhost:3000/guest/dashboard" style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p style="margin-top: 30px; color: #B0B8D1; font-size: 12px;">
              If you have any questions, please contact our support team at support@nepalstays.com
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Welcome email sent' };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset Your Password - Nepal Stays',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10182F; padding: 20px; border-radius: 8px; color: white;">
            <h2 style="color: #F6C768;">Password Reset Request</h2>
            <p>Hi ${userName},</p>
            <p>We received a request to reset your password. If you didn't make this request, you can ignore this email.</p>
            <p style="margin-top: 30px;">
              <a href="${resetLink}" style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #B0B8D1;">Or copy this link: ${resetLink}</p>
            <p style="margin-top: 20px; color: #B0B8D1; font-size: 12px;"><strong>This link expires in 1 hour.</strong></p>
            <p style="margin-top: 30px; color: #B0B8D1; font-size: 12px;">
              If you didn't request a password reset, please contact us immediately at support@nepalstays.com
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Password reset email sent' };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send set password email (for Google users)
exports.sendSetPasswordEmail = async (email, resetToken, userName) => {
  try {
    const setPasswordLink = `http://localhost:3000/set-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Set Your Password - Nepal Stays',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10182F; padding: 20px; border-radius: 8px; color: white;">
            <h2 style="color: #F6C768;">Complete Your Account Setup</h2>
            <p>Hi ${userName},</p>
            <p>Your Google account is linked to Nepal Stays. To enable email/password login, please set a password for your account.</p>
            <p style="margin-top: 30px;">
              <a href="${setPasswordLink}" style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Set Password
              </a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #B0B8D1;">Or copy this link: ${setPasswordLink}</p>
            <p style="margin-top: 20px; color: #B0B8D1; font-size: 12px;"><strong>This link expires in 24 hours.</strong></p>
            <p style="margin-top: 30px; color: #B0B8D1; font-size: 12px;">
              You can still log in with Google anytime. Setting a password is optional.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Set password email sent' };
  } catch (error) {
    console.error('Error sending set password email:', error);
    throw error;
  }
};

// Test email connection
exports.testEmailConnection = async () => {
  try {
    await transporter.verify();
    return { success: true, message: 'Email service is configured correctly' };
  } catch (error) {
    console.error('Email configuration error:', error);
    throw error;
  }
};