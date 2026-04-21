const jwt = require('jsonwebtoken');
const { protect, adminOnly } = require('../middleware/auth');
const db = require('../config/db');

// Mocking the database to avoid real connections during unit testing
jest.mock('../config/db', () => ({
  query: jest.fn()
}));

describe('Sprint 1: Authentication & Security Verification', () => {

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Verification Middleware (protect)', () => {

    it('1. Should return 401 if no Authorization token is provided', async () => {
      const req = { headers: {} }; // No token
      const res = mockResponse();
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('2. Should return 401 if token is manipulated or expired', async () => {
      const req = { headers: { authorization: 'Bearer EXPIRED_OR_INVALID_TOKEN' } };
      const res = mockResponse();
      const next = jest.fn();

      // Mock verify to throw an error (simulating expiration)
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized, token failed'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('3. Should call next() and attach user if token is valid', async () => {
      const req = { headers: { authorization: 'Bearer VALID_TOKEN_123' } };
      const res = mockResponse();
      const next = jest.fn();

      jwt.verify = jest.fn().mockReturnValue({ id: 1 });

      // Mock db query to return a valid user payload
      db.query.mockResolvedValue([
        [{ id: 1, full_name: 'Test Guest', email: 'guest@test.com', role: 'guest', is_verified: 1 }]
      ]);

      await protect(req, res, next);

      expect(db.query).toHaveBeenCalledTimes(1);
      expect(req.user.email).toBe('guest@test.com');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role-Based Access Control Middleware (adminOnly)', () => {

    it('4. Should return 403 if user is a guest trying to access admin routes', () => {
      const req = { user: { role: 'guest' } };
      const res = mockResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin only.'
      });
    });

    it('5. Should perfectly allow access if user is an admin', () => {
      const req = { user: { role: 'admin' } };
      const res = mockResponse();
      const next = jest.fn();

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

});
