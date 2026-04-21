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

describe('Payments Security (UT_PAYMENTS_46 - UT_PAYMENTS_54)', () => {
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

  it('UT_PAYMENTS_46: should return 401 when cancel booking has no JWT', async () => {
    const res = await request(app).post('/api/payments/cancel').send({ bookingId: 1 });
    expect(res.status).toBe(401);
  });

  it('UT_PAYMENTS_47: should return 403 when guest calls manual confirm', async () => {
    const res = await request(app)
      .post('/api/payments/confirm-manual')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({ bookingId: 1 });
    expect(res.status).toBe(403);
  });

  it('UT_PAYMENTS_48: should return 403 when guest calls check-in', async () => {
    const res = await request(app)
      .post('/api/payments/check-in')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({ bookingId: 1 });
    expect(res.status).toBe(403);
  });

  it('UT_PAYMENTS_49: should return 403 when guest calls check-out', async () => {
    const res = await request(app)
      .post('/api/payments/check-out')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({ bookingId: 1 });
    expect(res.status).toBe(403);
  });

  it('UT_PAYMENTS_50: should return 401 when extend-stay has no JWT', async () => {
    const res = await request(app).post('/api/payments/extend-stay').send({ bookingId: 1, additional_nights: 1 });
    expect(res.status).toBe(401);
  });

  it('UT_PAYMENTS_51: should return 401 when guest-details patch has no JWT', async () => {
    const res = await request(app).patch('/api/payments/booking/guest-details').send({ bookingId: 1 });
    expect(res.status).toBe(401);
  });

  it('UT_PAYMENTS_52: should return 401 when reschedule has no JWT', async () => {
    const res = await request(app).patch('/api/payments/booking/reschedule').send({ bookingId: 1 });
    expect(res.status).toBe(401);
  });

  it('UT_PAYMENTS_53: should return 401 when qr-token has no JWT', async () => {
    const res = await request(app).get('/api/payments/qr-token/1');
    expect(res.status).toBe(401);
  });

  it('UT_PAYMENTS_54: should return 403 when guest calls scan-checkin', async () => {
    const res = await request(app)
      .post('/api/payments/scan-checkin')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({ qrToken: 'x' });
    expect(res.status).toBe(403);
  });
});
