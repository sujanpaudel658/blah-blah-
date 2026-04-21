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

describe('Rooms API (UT_ROOMS_43 - UT_ROOMS_45)', () => {
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

  it('UT_ROOMS_43: should return 200 with rooms array for admin listing with hotel scoping', async () => {
    const res = await request(app).get('/api/rooms?hotelId=1').set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rooms)).toBe(true);
  });

  it('UT_ROOMS_44: should return 403 when guest attempts to create room type', async () => {
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${tokens.guest}`)
      .send({ hotel_id: 1, name: 'X', base_price: 1000 });
    expect(res.status).toBe(403);
  });

  it('UT_ROOMS_45: should return 201 when admin creates room type', async () => {
    const res = await request(app)
      .post('/api/rooms/types')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        hotel_id: 1,
        name: 'Suite',
        description: 'Test',
        base_price: 5000,
        max_occupancy: 3,
        amenities: []
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
