const request = require('supertest');
const bcrypt = require('bcrypt');
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

const emailMock = require('../services/email.service');
jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true })
}));

describe('Users Security & API (UT_USERS_32 - UT_USERS_37)', () => {
  let loginHash;
  let tokens;

  beforeAll(async () => {
    loginHash = await bcrypt.hash('secretpass', 4);
    tokens = buildTokens(TEST_JWT_SECRET);
  });

  beforeEach(() => {
    const db = require('../config/db');
    db.query.mockReset();
    db.getConnection.mockReset();
    db.getConnection.mockImplementation(() => Promise.resolve(connMock()));
    db.query.mockImplementation(createQueryRouter({ loginHash }));
  });

  describe('Assign-Hotel Security (UT_USERS_32 - UT_USERS_35)', () => {
    it('UT_USERS_32: should return 401 when JWT is missing', async () => {
      const res = await request(app).post('/api/users/assign-hotel').send({ email: 'x@test.com', hotelId: 1 });
      expect(res.status).toBe(401);
    });

    it('UT_USERS_33: should return 401 when JWT is tampered', async () => {
      const res = await request(app)
        .post('/api/users/assign-hotel')
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .send({ email: 'x@test.com', hotelId: 1 });
      expect(res.status).toBe(401);
    });

    it('UT_USERS_34: should return 401 when JWT is expired', async () => {
      const res = await request(app)
        .post('/api/users/assign-hotel')
        .set('Authorization', `Bearer ${tokens.expired}`)
        .send({ email: 'x@test.com', hotelId: 1 });
      expect(res.status).toBe(401);
    });

    it('UT_USERS_35: should return 401 when JWT was signed with a different secret', async () => {
      const res = await request(app)
        .post('/api/users/assign-hotel')
        .set('Authorization', `Bearer ${tokens.wrongSecret}`)
        .send({ email: 'x@test.com', hotelId: 1 });
      expect(res.status).toBe(401);
    });
  });

  describe('User List Access (UT_USERS_36 - UT_USERS_37)', () => {
    it('UT_USERS_36: should return 200 with users array for superadmin', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.superadmin}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('UT_USERS_37: should return 403 when guest calls list users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.guest}`);
      expect(res.status).toBe(403);
    });
  });
});
