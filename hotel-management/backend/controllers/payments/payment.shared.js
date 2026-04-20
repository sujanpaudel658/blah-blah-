const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const emailService = require('../../services/email.service');
const { LOYALTY_THRESHOLD } = require('../loyaltyController');
const notificationService = require('../../services/notification.service');
const { setBookingStatus, setRoomStatus } = require('../../services/statusTimeline.service');
const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } = require('../../constants/notification.constants');
const notificationEvents = require('../../services/notificationEvents.service');

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

const IS_LIVE = KHALTI_SECRET_KEY.toLowerCase().includes('live');

const RAW_KEY = KHALTI_SECRET_KEY.replace(/^(Key|Live)\s+/i, '');
const KHALTI_AUTH_HEADER = `Key ${RAW_KEY}`;

const KHALTI_A_BASE = 'https://a.khalti.com';
const KHALTI_BASE = IS_LIVE ? 'https://khalti.com' : 'https://dev.khalti.com';

const KHALTI_INITIATE_URL = `${KHALTI_A_BASE}/api/v2/epayment/initiate/`;
const KHALTI_LOOKUP_URL = `${KHALTI_A_BASE}/api/v2/epayment/lookup/`;

const PLATFORM_FEE_RATE = 0.1;

async function notifyUserBooking(userId, bookingId, title, message, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
    if (!userId) return;
    try {
        await notificationService.saveNotification({
            userId,
            role: 'user',
            title,
            message,
            type: NOTIFICATION_TYPES.BOOKING,
            referenceId: bookingId,
            priority
        });
    } catch (error) {
        console.error('[notifications] user booking notify failed:', error.message);
    }
}

async function notifyHotelAdminsBooking(hotelId, bookingId, title, message, priority = NOTIFICATION_PRIORITIES.MEDIUM) {
    try {
        const recipients = await notificationService.getAdminRecipientsForHotel(hotelId);
        await Promise.allSettled(
            recipients.map((recipient) =>
                notificationService.saveNotification({
                    userId: recipient.userId,
                    role: 'admin',
                    title,
                    message,
                    type: NOTIFICATION_TYPES.BOOKING,
                    referenceId: bookingId,
                    priority
                })
            )
        );
    } catch (error) {
        console.error('[notifications] admin booking notify failed:', error.message);
    }
}

const initializeKhaltiPayment = async (details) => {
    const response = await axios.post(KHALTI_INITIATE_URL, details, {
        headers: {
            'Authorization': KHALTI_AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

const processKhaltiRefund = async (payment, remarks = 'Refund initiated') => {
    if (!payment.transaction_id) {
        throw new Error('Transaction ID missing. Payment must be verified before refund.');
    }

    const refundUrl = `${KHALTI_BASE}/api/v2/merchant-transaction/${payment.transaction_id}/refund/`;
    const refundResponse = await axios.post(refundUrl, {
        amount: Math.round(parseFloat(payment.amount) * 100), // paisa
        remarks: remarks
    }, {
        headers: {
            'Authorization': KHALTI_AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    });

    return refundResponse.data;
};

const verifyAndUpgradePayment = async (paymentId, pidx) => {
    try {
        const vRes = await axios.post(KHALTI_LOOKUP_URL, { pidx }, {
            headers: { 'Authorization': KHALTI_AUTH_HEADER, 'Content-Type': 'application/json' }
        });

        if (vRes.data.status === 'Completed') {
            await db.query(
                "UPDATE payments SET status = 'completed', transaction_id = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?",
                [vRes.data.transaction_id, paymentId]
            );
            
            const [updated] = await db.query("SELECT * FROM payments WHERE id = ?", [paymentId]);
            if (updated.length > 0) {
                const bookingUpdate = await setBookingStatus(db, {
                    bookingId: updated[0].booking_id,
                    toStatus: 'confirmed',
                    reason: 'Payment verification upgrade',
                    extraFields: { payment_status: 'paid', confirmed_at: new Date() }
                });
                if (bookingUpdate?.roomId) {
                    await setRoomStatus(db, {
                        roomId: bookingUpdate.roomId,
                        toStatus: 'booked',
                        source: 'payment_verify_upgrade',
                        referenceType: 'booking',
                        referenceId: updated[0].booking_id
                    });
                }
            }
            return updated[0];
        }
    } catch (e) {
        console.error(`Verification failed for payment ${paymentId}:`, e.message);
    }
    return null;
};


module.exports = {
  axios,
  jwt,
  db,
  emailService,
  LOYALTY_THRESHOLD,
  notificationService,
  setBookingStatus,
  setRoomStatus,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  notificationEvents,
  RAW_KEY,
  KHALTI_AUTH_HEADER,
  KHALTI_LOOKUP_URL,
  PLATFORM_FEE_RATE,
  notifyUserBooking,
  notifyHotelAdminsBooking,
  initializeKhaltiPayment,
  processKhaltiRefund,
  verifyAndUpgradePayment
};
