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

const notifyMock = require('../services/notificationEvents.service');
jest.mock('../services/notificationEvents.service', () => ({
  notifyHotelCreated: jest.fn().mockResolvedValue(undefined)
}));

describe('Hotels API (UT_HOTELS_38 - UT_HOTELS_42)', () => {
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

  it('UT_HOTELS_38: should return 200 with stats object for public stats', async () => {
    const res = await request(app).get('/api/hotels/public/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toHaveProperty('hotels');
  });

  it('UT_HOTELS_39: should return 201 when guest submits valid hotel request', async () => {
    const res = await request(app)
      .post('/api/hotels/request')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({
        name: 'New Stay',
        address: 'St1',
        city: 'Pokhara',
        country: 'Nepal',
        phone: '9800000000',
        email: 'hotel@example.com',
        contractAccepted: true,
        roomTypes: [{ name: 'Standard', description: 'Basic', base_price: 1500, max_occupancy: 2 }],
        rooms: [{ room_number: '101', floor: 1, room_type_index: 0 }]
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(notifyMock.notifyHotelCreated).toHaveBeenCalled();
  });

  it('UT_HOTELS_40: should return 400 when hotel request missing required country', async () => {
    const res = await request(app)
      .post('/api/hotels/request')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({
        name: 'X',
        city: 'Pokhara',
        country: '',
        address: 'A'
      });
    expect(res.status).toBe(400);
  });

  it('UT_HOTELS_41: should return 200 with hotels array for public list', async () => {
    const res = await request(app).get('/api/hotels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.hotels)).toBe(true);
  });

  it('UT_HOTELS_42: should return 404 for unknown hotel id', async () => {
    const res = await request(app).get('/api/hotels/999999');
    expect(res.status).toBe(404);
  });
});
