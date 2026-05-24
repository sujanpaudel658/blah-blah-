const nodemailer = require('nodemailer');

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function envBool(name, defaultValue) {
  const raw = env(name).toLowerCase();
  if (!raw) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return defaultValue;
}

function isEmailConfigured() {
  const user = env('SMTP_USER', env('EMAIL_USER'));
  const pass = env('SMTP_PASS', env('EMAIL_PASS'));
  const from = env('EMAIL_FROM');
  return !!(user && pass && from);
}

exports.isEmailConfigured = isEmailConfigured;

let _smtpTransporter = null;

function createSmtpConfig(rejectUnauthorized = envBool('SMTP_REJECT_UNAUTHORIZED', true)) {
  const user = env('SMTP_USER', env('EMAIL_USER'));
  const pass = env('SMTP_PASS', env('EMAIL_PASS'));
  return {
    host: env('SMTP_HOST', 'smtp.gmail.com'),
    port: Number(env('SMTP_PORT', '587')),
    secure: envBool('SMTP_SECURE', false),
    auth: { user, pass },
    tls: { rejectUnauthorized },
    connectionTimeout: 25000,
    greetingTimeout: 20000
  };
}

function getSmtpTransporter() {
  const user = env('SMTP_USER', env('EMAIL_USER'));
  const pass = env('SMTP_PASS', env('EMAIL_PASS'));
  if (!user || !pass) return null;

  if (_smtpTransporter) return _smtpTransporter;

  _smtpTransporter = nodemailer.createTransport(createSmtpConfig());

  return _smtpTransporter;
}

function isCertChainError(error) {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  return (
    msg.includes('self-signed certificate') ||
    msg.includes('unable to verify the first certificate') ||
    msg.includes('self signed certificate in certificate chain') ||
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
  );
}

function verificationMailHtml(userName, verificationLink) {
  return `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:24px 24px 8px 24px;font-family:Arial, Helvetica, sans-serif;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">Nepal Stays</p>
                    <h1 style="margin:10px 0 0 0;font-size:20px;font-weight:700;color:#111827;line-height:1.35;">Verify your email</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 24px 20px 24px;font-family:Arial, Helvetica, sans-serif;color:#374151;font-size:15px;line-height:1.6;">
                    <p style="margin:0 0 12px 0;">Hello ${userName},</p>
                    <p style="margin:0 0 20px 0;">
                      Thank you for joining Nepal Stays. Please confirm your email address to activate your account.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" style="border-radius:6px;background:#2563eb;">
                          <a href="${verificationLink}" target="_blank"
                             style="display:inline-block;padding:12px 22px;font-family:Arial, Helvetica, sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                            Verify email
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;line-height:1.5;">If the button does not work, copy and paste this link into your browser:</p>
                    <p style="margin:0 0 16px 0;font-size:13px;line-height:1.5;word-break:break-all;">
                      <a href="${verificationLink}" target="_blank" style="color:#2563eb;text-decoration:underline;">${verificationLink}</a>
                    </p>

                    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">This link expires in 24 hours.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px 20px 24px;border-top:1px solid #e5e7eb;font-family:Arial, Helvetica, sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
                    If you did not create this account, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
}

async function sendSmtpMail(mailOptions) {
  const t = getSmtpTransporter();
  if (!t) throw new Error('SMTP not configured');
  await t.sendMail(mailOptions);
}

async function sendEmailReliable({ to, subject, html }) {
  const toEmail = String(to || '').trim();
  const fromAddr = env('EMAIL_FROM');
  const mailOptions = { from: fromAddr, to: toEmail, subject, html };

  if (!toEmail) {
    return { success: false, reason: 'invalid_recipient' };
  }

  if (!isEmailConfigured()) {
    return { success: false, reason: 'not_configured' };
  }

  try {
    await sendSmtpMail(mailOptions);
    return { success: true, provider: 'smtp' };
  } catch (error) {
    if (isCertChainError(error)) {
      try {
        const relaxedTransporter = nodemailer.createTransport(createSmtpConfig(false));
        await relaxedTransporter.sendMail(mailOptions);
        console.warn('[email] SMTP sent with relaxed TLS (rejectUnauthorized=false) due to certificate chain issue');
        return { success: true, provider: 'smtp', tlsRelaxed: true };
      } catch (retryError) {
        console.error('[email] SMTP relaxed TLS retry failed:', retryError.message || retryError);
        return { success: false, reason: 'send_failed', detail: retryError.message };
      }
    }

    console.error('[email] SMTP send failed:', error.message || error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
}

// SMTP helpers return { success }; verification link uses frontendBase || FRONTEND_URL.
exports.sendVerificationEmail = async (email, verificationToken, userName, frontendBase) => {
  const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verificationLink = `${base}/verify-email?token=${verificationToken}`;
  const subject = 'Verify Your Email - Nepal Stays';
  const html = verificationMailHtml(userName, verificationLink);

  return sendEmailReliable({ to: email, subject, html });
};

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
              <li> Browse available hotels</li>
              <li> Make reservations easily</li>
              <li> Manage your bookings</li>
              <li> 24/7 customer support</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/guest/dashboard" style="background-color: #6C63FF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
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

    await sendSmtpMail(mailOptions);
    return { success: true, message: 'Welcome email sent' };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

exports.sendPasswordResetEmail = async (email, resetToken, userName, frontendBase) => {
  const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetLink = `${base}/reset-password?token=${resetToken}`;
  const subject = 'Reset Your Password - Nepal Stays';
  const html = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f7fb;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="background:#1B2B41;padding:22px 24px;">
                    <div style="font-family:Arial, sans-serif;">
                      <div style="font-size:14px;letter-spacing:0.12em;color:#ffffffcc;text-transform:uppercase;font-weight:700;">Nepal Stays</div>
                      <div style="font-size:22px;color:#ffffff;font-weight:800;margin-top:6px;">Password Reset Request</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 24px;font-family:Arial, sans-serif;color:#2c3e50;">
                    <p style="margin:0 0 12px 0;font-size:14px;">Hi ${userName},</p>
                    <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;">
                      We received a request to reset your password. Click the button below to choose a new password.
                    </p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 10px 0;">
                      <tr>
                        <td align="center" style="border-radius:8px;background:#C4993E;">
                          <a href="${resetLink}" target="_blank"
                             style="display:inline-block;padding:12px 18px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:10px 0 0 0;font-size:12px;color:#6b7280;">
                      If the button doesn’t work, copy and paste this link into your browser:
                    </p>
                    <p style="margin:6px 0 14px 0;font-size:12px;color:#374151;word-break:break-all;">
                      ${resetLink}
                    </p>
                    <p style="margin:0 0 18px 0;font-size:12px;color:#6b7280;">
                      This link expires in 1 hour.
                    </p>
                    <p style="margin:0;font-size:12px;color:#6b7280;">
                      If you didn’t request a password reset, please ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px;background:#f9fafb;font-family:Arial, sans-serif;font-size:11px;color:#9ca3af;text-align:center;">
                    Nepal Stays Hotel Management System
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;

  return sendEmailReliable({ to: email, subject, html });
};

exports.sendSetPasswordEmail = async (email, resetToken, userName, frontendBase) => {
  try {
    const base = (frontendBase || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const setPasswordLink = `${base}/reset-password?token=${resetToken}`;

    const subject = 'Set Your Password - Nepal Stays';
    const html = `
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
      `;

    return sendEmailReliable({ to: email, subject, html });
  } catch (error) {
    console.error('Error sending set password email:', error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
};

exports.sendBookingConfirmation = async (email, details) => {
  try {
    if (!email || !String(email).trim()) {
      console.warn('sendBookingConfirmation: no recipient, skipped');
      return { success: false, reason: 'invalid_recipient' };
    }
    const subject = `Booking Confirmed! - #${details.bookingReference}`;
    const paymentMessage = details.paymentMessage || 'Your reservation is confirmed.';
    const amountLabel = details.amountLabel || 'Total Amount';
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 24px;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background-color: #ecfdf5; color: #059669; width: 64px; height: 64px; line-height: 64px; border-radius: 50%; display: inline-block; font-size: 32px;"></div>
              <h2 style="color: #1e293b; margin-top: 20px; font-size: 24px; font-weight: 800;">Booking Confirmed!</h2>
            </div>
            
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Hi ${details.userName}, your stay at <strong>${details.hotelName}</strong> is officially booked!</p>
            <p style="color: #64748b; font-size: 14px; line-height: 1.6;">${paymentMessage}</p>
            
            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 16px; margin: 30px 0;">
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px;">Reservation Details</h3>
              <table style="width: 100%; font-size: 14px; color: #475569;">
                <tr><td style="padding: 5px 0;"><strong>Reference:</strong></td><td style="text-align: right;">${details.bookingReference}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Room:</strong></td><td style="text-align: right;">${details.roomNumber}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Check-in:</strong></td><td style="text-align: right;">${details.checkIn}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Check-out:</strong></td><td style="text-align: right;">${details.checkOut}</td></tr>
                <tr><td style="padding: 5px 0; border-top: 1px solid #e2e8f0; margin-top: 10px;"><strong>${amountLabel}:</strong></td><td style="text-align: right; border-top: 1px solid #e2e8f0; color: #607AFB; font-weight: 800;">Rs. ${details.amount}</td></tr>
              </table>
            </div>

            <p style="color: #64748b; font-size: 14px; text-align: center;">We look forward to seeing you. Safe travels!</p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px;">Nepal Stays Hotel Management System</p>
        </div>
      `;

    return sendEmailReliable({ to: email, subject, html });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
};

exports.sendAdminBookingNotification = async (hotelEmail, details) => {
  try {
    const subject = `New Booking Alert - #${details.bookingReference}`;
    const paymentStatus = details.paymentStatus || 'Confirmed';
    const amountLabel = details.amountLabel || 'Booking Amount';
    const html = `
        <div style="font-family: Arial, sans-serif; background-color: #10182f; color: white; padding: 40px; border-radius: 16px;">
          <h2 style="color: #607AFB;">New Reservation Alert</h2>
          <p>Hello Admin, a booking has been confirmed for <strong>${details.hotelName}</strong>.</p>
          
          <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
            <p><strong>Guest Name:</strong> ${details.userName}</p>
            <p><strong>Room Number:</strong> ${details.roomNumber}</p>
            <p><strong>Dates:</strong> ${details.checkIn} to ${details.checkOut}</p>
            <p><strong>${amountLabel}:</strong> Rs. ${details.amount}</p>
            <p><strong>Payment Status:</strong> ${paymentStatus}</p>
          </div>
          
          <p style="margin-top: 20px;">Please prepare the room for arrival.</p>
        </div>
      `;

    return sendEmailReliable({ to: hotelEmail, subject, html });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
};

exports.sendBookingInitiated = async (email, details) => {
  try {
    if (!email || !String(email).trim()) {
      console.warn('sendBookingInitiated: no recipient, skipped');
      return { success: false, reason: 'invalid_recipient' };
    }
    const subject = `Reservation Received - #${details.bookingReference}`;
    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 24px;">
          <div style="background-color: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1e293b; margin-top: 20px; font-size: 24px; font-weight: 800;">Reservation Received</h2>
            </div>
            
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">Hi ${details.userName}, your reservation at <strong>${details.hotelName}</strong> has been received and is pending payment/confirmation!</p>
            
            <div style="background-color: #f1f5f9; padding: 25px; border-radius: 16px; margin: 30px 0;">
              <h3 style="color: #1e293b; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 15px;">Reservation Details</h3>
              <table style="width: 100%; font-size: 14px; color: #475569;">
                <tr><td style="padding: 5px 0;"><strong>Reference:</strong></td><td style="text-align: right;">${details.bookingReference}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Room:</strong></td><td style="text-align: right;">${details.roomNumber}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Check-in:</strong></td><td style="text-align: right;">${details.checkIn}</td></tr>
                <tr><td style="padding: 5px 0;"><strong>Check-out:</strong></td><td style="text-align: right;">${details.checkOut}</td></tr>
                <tr><td style="padding: 5px 0; border-top: 1px solid #e2e8f0; margin-top: 10px;"><strong>Amount Due:</strong></td><td style="text-align: right; border-top: 1px solid #e2e8f0; color: #607AFB; font-weight: 800;">Rs. ${details.amount}</td></tr>
              </table>
            </div>

            <p style="color: #64748b; font-size: 14px; text-align: center;">Please complete your payment to fully confirm this booking.</p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px;">Nepal Stays Hotel Management System</p>
        </div>
      `;

    return sendEmailReliable({ to: email, subject, html });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
};

exports.sendAdminBookingInitiated = async (hotelEmail, details) => {
  try {
    const subject = `New Reservation Received! - #${details.bookingReference}`;
    const html = `
        <div style="font-family: Arial, sans-serif; background-color: #10182f; color: white; padding: 40px; border-radius: 16px;">
          <h2 style="color: #607AFB;">New Reservation Received</h2>
          <p>Hello Admin, a new reservation has been made for <strong>${details.hotelName}</strong>.</p>
          
          <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px;">
            <p><strong>Guest Name:</strong> ${details.userName}</p>
            <p><strong>Room Number:</strong> ${details.roomNumber}</p>
            <p><strong>Dates:</strong> ${details.checkIn} to ${details.checkOut}</p>
            <p><strong>Total Amount:</strong> Rs. ${details.amount}</p>
            <p><strong>Status:</strong> Pending Confirmation / Payment</p>
          </div>
          
          <p style="margin-top: 20px;">This booking is currently pending. If it was made as Pay-At-Hotel, please prepare for their arrival.</p>
        </div>
      `;

    return sendEmailReliable({ to: hotelEmail, subject, html });
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { success: false, reason: 'send_failed', detail: error.message };
  }
};

exports.sendRefundProcessedEmail = async (email, details) => {
  const to = String(email || '').trim();
  if (!to) {
    return { success: false, reason: 'invalid_recipient' };
  }
  const ref = details.bookingReference || details.booking_reference || '—';
  const hotel = details.hotelName || details.hotel_name || 'the property';
  const amount = details.amount != null ? Number(details.amount).toLocaleString() : '—';
  const subject = `Refund processed — Booking ${ref} · Nepal Stays`;
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const html = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f4f0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4de;">
                <tr>
                  <td style="background:#faf7f2;padding:22px 24px;border-bottom:2px solid #d4b06a;">
                    <div style="font-family:Arial, Helvetica, sans-serif;">
                      <div style="font-size:12px;letter-spacing:0.14em;color:#6b5b4f;text-transform:uppercase;font-weight:700;">Nepal Stays</div>
                      <div style="font-size:20px;color:#1f1c1a;font-weight:800;margin-top:8px;">Your refund has been processed</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 24px;font-family:Arial, Helvetica, sans-serif;color:#2c2825;font-size:15px;line-height:1.6;">
                    <p style="margin:0 0 12px 0;">Hi ${details.guestName || 'there'},</p>
                    <p style="margin:0 0 16px 0;">
                      Good news — your refund request for <strong>${hotel}</strong> has been approved and completed in our system.
                    </p>
                    <table role="presentation" width="100%" style="background:#faf7f2;border-radius:8px;margin:16px 0;">
                      <tr><td style="padding:14px 16px;font-size:14px;">
                        <p style="margin:0 0 6px 0;"><strong>Booking reference:</strong> ${ref}</p>
                        <p style="margin:0 0 6px 0;"><strong>Refund amount:</strong> NRs. ${amount}</p>
                      </td></tr>
                    </table>
                    <p style="margin:0 0 12px 0;font-size:14px;color:#4a4238;">
                      If you paid with <strong>Khalti</strong>, the amount is returned according to Khalti’s rules (usually to your Khalti wallet). Bank or card timelines can vary.
                    </p>
                    <p style="margin:0 0 20px 0;font-size:14px;">
                      You can review this booking anytime in your <a href="${base}/guest/dashboard" style="color:#b88e2f;font-weight:700;">guest dashboard</a>.
                    </p>
                    <p style="margin:0;font-size:13px;color:#6b5b4f;">Thank you for using Nepal Stays.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px;background:#f0ebe4;font-family:Arial, Helvetica, sans-serif;font-size:11px;color:#8a7d72;text-align:center;">
                    This is an automated message regarding your refund.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
  return sendEmailReliable({ to, subject, html });
};

exports.sendRefundRejectedEmail = async (email, details) => {
  const to = String(email || '').trim();
  if (!to) {
    return { success: false, reason: 'invalid_recipient' };
  }
  const ref = details.bookingReference || details.booking_reference || '—';
  const hotel = details.hotelName || details.hotel_name || 'the property';
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const category = details.rejectionCategory || '—';
  const extra = details.additionalNotes ? String(details.additionalNotes).trim() : '';
  const subject = `Refund request update — Booking ${ref} · Nepal Stays`;
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const extraBlock = extra
    ? `<p style="margin:12px 0 0 0;font-size:14px;color:#4a4238;"><strong>Additional note:</strong> ${esc(extra)}</p>`
    : '';
  const html = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f4f0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4de;">
                <tr>
                  <td style="background:#fef2f2;padding:22px 24px;border-bottom:2px solid #fecaca;">
                    <div style="font-family:Arial, Helvetica, sans-serif;">
                      <div style="font-size:12px;letter-spacing:0.14em;color:#991b1b;text-transform:uppercase;font-weight:700;">Nepal Stays</div>
                      <div style="font-size:20px;color:#1f1c1a;font-weight:800;margin-top:8px;">Your refund request was not approved</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 24px;font-family:Arial, Helvetica, sans-serif;color:#2c2825;font-size:15px;line-height:1.6;">
                    <p style="margin:0 0 12px 0;">Hi ${details.guestName || 'there'},</p>
                    <p style="margin:0 0 16px 0;">
                      We reviewed your refund request for <strong>${hotel}</strong> (reference <strong>${ref}</strong>). Unfortunately we cannot process a refund in this case.
                    </p>
                    <table role="presentation" width="100%" style="background:#faf7f2;border-radius:8px;margin:16px 0;border:1px solid #e8e0d4;">
                      <tr><td style="padding:14px 16px;font-size:14px;">
                        <p style="margin:0 0 6px 0;"><strong>Reason category:</strong> ${esc(category)}</p>
                      </td></tr>
                    </table>
                    ${extraBlock}
                    <p style="margin:16px 0 0 0;font-size:14px;">
                      If you have questions, contact support or your hotel through your <a href="${base}/guest/dashboard" style="color:#b88e2f;font-weight:700;">guest dashboard</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px;background:#f0ebe4;font-family:Arial, Helvetica, sans-serif;font-size:11px;color:#8a7d72;text-align:center;">
                    This message was sent because a refund decision was recorded on your booking.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
  return sendEmailReliable({ to, subject, html });
};

exports.sendHotelListingRejectedEmail = async (email, details) => {
  const to = String(email || '').trim();
  if (!to) {
    return { success: false, reason: 'invalid_recipient' };
  }
  const esc = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const hotel = esc(details.hotelName || 'your property');
  const owner = esc(details.ownerName || 'there');
  const reason = details.reason ? String(details.reason).trim() : '';
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const subject = `Partner listing update — ${details.hotelName || 'Your hotel'} · Nepal Stays`;
  const reasonBlock = reason
    ? `<p style="margin:12px 0 0 0;font-size:14px;color:#4a4238;"><strong>Note from our team:</strong> ${esc(reason)}</p>`
    : '';
  const html = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f4f0;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e4de;">
                <tr>
                  <td style="background:#fef2f2;padding:22px 24px;border-bottom:2px solid #fecaca;">
                    <div style="font-family:Arial, Helvetica, sans-serif;">
                      <div style="font-size:12px;letter-spacing:0.14em;color:#991b1b;text-transform:uppercase;font-weight:700;">Nepal Stays</div>
                      <div style="font-size:20px;color:#1f1c1a;font-weight:800;margin-top:8px;">Partner listing not approved</div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 24px;font-family:Arial, Helvetica, sans-serif;color:#2c2825;font-size:15px;line-height:1.6;">
                    <p style="margin:0 0 12px 0;">Hi ${owner},</p>
                    <p style="margin:0 0 16px 0;">
                      Thank you for your interest in partnering with Nepal Stays. After review, we are unable to approve your listing request for <strong>${hotel}</strong> at this time.
                    </p>
                    ${reasonBlock}
                    <p style="margin:16px 0 0 0;font-size:14px;">
                      You can submit a new application from your
                      <a href="${base}/guest/list-your-hotel" style="color:#b88e2f;font-weight:700;">Partner With Us</a> page when you are ready.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 24px;background:#f0ebe4;font-family:Arial, Helvetica, sans-serif;font-size:11px;color:#8a7d72;text-align:center;">
                    You also received an in-app notification on your guest dashboard.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
  return sendEmailReliable({ to, subject, html });
};

exports.testEmailConnection = async () => {
  try {
    const t = getSmtpTransporter();
    if (!t) throw new Error('No SMTP credentials (EMAIL_USER / EMAIL_PASS)');
    await t.verify();
    return { success: true, message: 'SMTP connection OK' };
  } catch (error) {
    console.error('Email configuration error:', error);
    throw error;
  }
};