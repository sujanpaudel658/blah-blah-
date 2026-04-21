const request = require('supertest');
const {
  TEST_JWT_SECRET,
  buildTokens,
  connMock,
  createQueryRouter
} = require('./helpers/remainingApi.helpers');

process.env.JWT_SECRET = TEST_JWT_SECRET;
const app = require('../server');

jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
}));

describe('Refunds & Payouts Security (UT_REFUNDS_55 - UT_PAYOUTS_58)', () => {
  let tokens;

  beforeAll(() => {
    tokens = buildTokens(TEST_JWT_SECRET);
  });

  beforeEach(() => {
    const db = require('../config/db');
    db.query.mockReset();
    db.getConnection.mockReset();
    db.getConnection.mockImplementation(() => Promise.resolve(connMock()));
    db.query.mockImplementation(createQueryRouter({}));
  });

  describe('Refunds (UT_REFUNDS_55 - UT_REFUNDS_56)', () => {
    it('UT_REFUNDS_55: should return 403 when guest lists pending refunds', async () => {
      const res = await request(app).get('/api/payments/refund/pending').set('Authorization', `Bearer ${tokens.guest}`);
      expect(res.status).toBe(403);
    });

    it('UT_REFUNDS_56: should return 403 when guest approves refund', async () => {
      const res = await request(app)
        .post('/api/payments/refund/approve')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ requestId: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('Payouts (UT_PAYOUTS_57 - UT_PAYOUTS_58)', () => {
    it('UT_PAYOUTS_57: should return 403 when guest requests payout', async () => {
      const res = await request(app)
        .post('/api/payments/payout/request')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ amount: 100 });
      expect(res.status).toBe(403);
    });

    it('UT_PAYOUTS_58: should return 403 when guest approves payout', async () => {
      const res = await request(app)
        .post('/api/payments/payout/approve')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ requestId: 1 });
      expect(res.status).toBe(403);
    });
  });
});
