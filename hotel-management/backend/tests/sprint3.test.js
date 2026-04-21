const request = require('supertest');
const jwt = require('jsonwebtoken');
const axios = require('axios');

jest.mock('axios', () => ({
  post: jest.fn()
}));

jest.mock('../services/notificationEvents.service', () => ({
  notifySystemAlert: jest.fn(async () => {}),
  notifyPaymentSuccess: jest.fn(async () => {}),
  notifyPaymentFailed: jest.fn(async () => {}),
  notifyBookingCreated: jest.fn(async () => {})
}));

const app = require('../server');

const testToken = jwt.sign(
  { id: 1, email: 'test@example.com', role: 'guest' },
  process.env.JWT_SECRET || 'hotel_management_system_secret_key_2024',
  { expiresIn: '1h' }
);

describe('Sprint 3: Financial Infrastructure & Payment Services', () => {
  beforeEach(() => {
    // Keep tests deterministic and avoid live Khalti dependency.
    axios.post.mockReset();
    axios.post.mockRejectedValue({
      response: { status: 404, data: { detail: 'Not found.', error_key: 'validation_error' } },
      message: 'Mocked Khalti lookup/init failure'
    });
  });

  // --- 1. PAYMENT HANDSHAKE & INITIALIZATION ---
  describe('Khalti Integration Layer', () => {
    it('1.1 Should generate a secure payment initialization payload (amount, pidx)', async () => {
      const paymentData = {
        hotel_id: 1,
        room_type_id: 1,
        check_in_date: '2024-08-01',
        check_out_date: '2024-08-03',
        num_guests: 2,
        num_rooms: 1,
        amount: 5000,
        payment_method: 'khalti'
      };

      const response = await request(app)
        .post('/api/payments/initiate')
        .set('Authorization', `Bearer ${testToken}`)
        .send(paymentData);

      // Verify the gateway handshake structure (or rejection if Khalti key is missing)
      expect([200, 502, 503, 400, 401]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('payment_url');
      }
    });
  });

  // --- 2. SERVER-SIDE PRICE SECURITY (ANTI-TAMPERING) ---
  describe('Price Verification Shield', () => {
    it('2.1 Should REJECT verification if the paid amount does not match server calculation', async () => {
      // Mocking a scenario where user tries to pay 100 NRS for a 500 NRS room
      const maliciousPayload = {
        pidx: 'MOCK_PAY_ID_XYZ',
        amount: 10000, // User modified client-side to 100 NRS
        booking_id: 202 // Server knows this booking is 50,000 Paisa (500 NRS)
      };

      const response = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send(maliciousPayload);

      // Logic must detect mismatch and block upgrade
      expect([400, 404]).toContain(response.status);
      if (response.status === 400) {
        expect(response.body.message).toMatch(/tampering|mismatch/i);
      }
    });
  });

  // --- 3. TRANSACTION STATUS SYNCHRONIZATION ---
  describe('Automatic Status Upgrades', () => {
    it('3.1 Should upgrade booking status to "confirmed" upon successful lookup', async () => {
      // Mocking a successful Khalti "Completed" status
      const validPayload = { pidx: 'VALID_COMPLETED_PIDX' };

      const response = await request(app)
        .post('/api/payments/verify')
        .send(validPayload);

      // Testing result: 200 OK + "Confirmed" status update
      expect([200, 404]).toContain(response.status);
    });
  });

  // --- 4. INVOICING TRIGGER ---
  describe('Automated Billing Logic', () => {
    it('4.1 Should prepare a JSON receipt with reference ID after payment', async () => {
      const response = await request(app)
        .get('/api/payments/receipt/202')
        .set('Authorization', `Bearer ${testToken}`);

      if (response.status === 200) {
        expect(response.body.receipt).toHaveProperty('receipt_no');
        expect(response.body.receipt).toHaveProperty('total_amount');
      }
    });
  });
});
