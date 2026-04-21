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

describe('Reviews API (UT_REVIEWS_59 - UT_REVIEWS_61)', () => {
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

  it('UT_REVIEWS_59: should return 200 with reviews array for featured reviews endpoint', async () => {
    const res = await request(app).get('/api/reviews/featured');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('UT_REVIEWS_60: should return 200 with reviews for hotel listing retrieval', async () => {
    const res = await request(app).get('/api/reviews/hotel/1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it('UT_REVIEWS_61: should return 401 for booking review access lookup without JWT', async () => {
    const res = await request(app).get('/api/reviews/booking/1');
    expect(res.status).toBe(401);
  });
});
