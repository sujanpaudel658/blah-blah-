// API tests UT_019–UT_054 (fixtures in ./helpers/remainingApi.helpers.js).
const request = require('supertest');
const bcrypt = require('bcrypt');
const {
  TEST_JWT_SECRET,
  buildTokens,
  connMock,
  createQueryRouter,
  assertResponseTime
} = require('./helpers/remainingApi.helpers');
const { checkBanStatus } = require('../services/noShow.service');

process.env.JWT_SECRET = TEST_JWT_SECRET;

jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
}));

jest.mock('../services/email.service', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSetPasswordEmail: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../services/notificationEvents.service', () => ({
  notifyHotelCreated: jest.fn().mockResolvedValue(undefined),
  notifyAdminAccountChanged: jest.fn().mockResolvedValue(undefined),
  notifyBookingCancelled: jest.fn().mockResolvedValue(undefined),
  notifyPaymentSuccess: jest.fn().mockResolvedValue(undefined),
  notifyPaymentFailed: jest.fn().mockResolvedValue(undefined),
  notifySystemAlert: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('axios', () => ({
  post: jest.fn().mockRejectedValue(new Error('mock axios'))
}));

const emailMock = require('../services/email.service');
const notifyMock = require('../services/notificationEvents.service');

const app = require('../server');

describe('Remaining API (019–054)', () => {
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
    db.query.mockImplementation(createQueryRouter({ loginHash, extend: async () => null }));
    jest.mocked(emailMock.sendVerificationEmail).mockResolvedValue({ success: true });
    jest.mocked(emailMock.sendPasswordResetEmail).mockResolvedValue({ success: true });
  });

  describe('AUTH', () => {
    describe('signup (UT_019)', () => {
      it('should return 201 when signup succeeds with valid payload and send verification email', async () => {
        const res = await assertResponseTime(() =>
          request(app).post('/api/auth/signup').send({
            fullName: 'New User',
            email: 'newuser-valid@test.com',
            phone: '9800000001',
            password: 'password123'
          })
        );
        expect(res.status).toBe(201);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: true,
            message: expect.any(String),
            verificationEmailSent: true,
            userId: expect.any(Number),
            email: 'newuser-valid@test.com'
          })
        );
        expect(typeof res.body.message).toBe('string');
        expect(emailMock.sendVerificationEmail).toHaveBeenCalled();
        const [to] = emailMock.sendVerificationEmail.mock.calls[0];
        expect(to).toBe('newuser-valid@test.com');
      });

      it('should return 400 when required signup fields are missing', async () => {
        const res = await request(app).post('/api/auth/signup').send({
          fullName: '',
          email: 'a@b.com',
          phone: '9800000000',
          password: 'x'
        });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'All fields are required'
          })
        );
        expect(emailMock.sendVerificationEmail).not.toHaveBeenCalled();
      });

      it('should return 400 when email is already registered', async () => {
        const db = require('../config/db');
        db.query.mockImplementation(
          createQueryRouter({
            loginHash,
            extend: async (sql, params, s) => {
              if (s.includes('select id from users where email = ?') && params[0] === 'taken@test.com') {
                return [[{ id: 999 }]];
              }
              return null;
            }
          })
        );
        const res = await request(app).post('/api/auth/signup').send({
          fullName: 'X',
          email: 'taken@test.com',
          phone: '9800000000',
          password: 'password123'
        });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'Email already registered'
          })
        );
      });

      it('should return 503 when verification email cannot be sent', async () => {
        jest.mocked(emailMock.sendVerificationEmail).mockResolvedValueOnce({
          success: false,
          reason: 'not_configured'
        });
        const res = await request(app).post('/api/auth/signup').send({
          fullName: 'Mail Fail',
          email: 'mailfail@test.com',
          phone: '9800000000',
          password: 'password123'
        });
        expect(res.status).toBe(503);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            verificationEmailSent: false,
            message: expect.stringMatching(/email|configured|verification/i)
          })
        );
      });

      it('should return 201 for XSS-like fullName without reflecting it in error (stores path)', async () => {
        const payload = {
          fullName: '<script>alert(1)</script>',
          email: 'xss-user@test.com',
          phone: '9800000000',
          password: 'password123'
        };
        const res = await request(app).post('/api/auth/signup').send(payload);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(JSON.stringify(res.body)).not.toContain('<script>');
      });

      it('should return 400 on second sequential signup with same email (duplicate guard)', async () => {
        const db = require('../config/db');
        let checks = 0;
        db.query.mockImplementation(
          createQueryRouter({
            loginHash,
            extend: async (sql, params, s) => {
              if (s.includes('select id from users where email = ?') && params[0] === 'dupseq@test.com') {
                checks += 1;
                if (checks >= 2) return [[{ id: 1 }]];
                return [[]];
              }
              return null;
            }
          })
        );
        const body = {
          fullName: 'D',
          email: 'dupseq@test.com',
          phone: '9800000000',
          password: 'password123'
        };
        const first = await request(app).post('/api/auth/signup').send(body);
        expect(first.status).toBe(201);
        const second = await request(app).post('/api/auth/signup').send(body);
        expect(second.status).toBe(400);
        expect(second.body.message).toBe('Email already registered');
      });
    });

    describe('login (UT_020)', () => {
      it('should return 200 with token and user shape when credentials are valid', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'login@test.com',
          password: 'secretpass'
        });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: true,
            message: 'Login successful',
            token: expect.any(String),
            user: expect.objectContaining({
              fullName: expect.any(String),
              email: 'login@test.com',
              role: 'guest'
            }),
            redirectPath: expect.any(String)
          })
        );
        bcrypt.compare.mockRestore();
      });

      it('should return 400 when email or password is missing', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'login@test.com' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'Email and password required'
          })
        );
      });

      it('should return 401 with generic message when password does not match', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);
        const res = await request(app).post('/api/auth/login').send({
          email: 'login@test.com',
          password: 'wrongpassword'
        });
        expect(res.status).toBe(401);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'Invalid email or password'
          })
        );
        expect(res.body).not.toHaveProperty('password');
        bcrypt.compare.mockRestore();
      });

      it('should return 403 when password is correct but email is not verified', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/login').send({
          email: 'unverified@test.com',
          password: 'secretpass'
        });
        expect(res.status).toBe(403);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            requiresEmailVerification: true,
            email: 'unverified@test.com'
          })
        );
        expect(res.body.message).toMatch(/verify/i);
        bcrypt.compare.mockRestore();
      });
    });

    describe('resend verification email', () => {
      beforeEach(() => {
        emailMock.sendVerificationEmail.mockClear();
      });

      it('should return 400 when email or password is missing', async () => {
        const res = await request(app).post('/api/auth/resend-verification').send({ email: 'a@b.com' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });

      it('should return 401 for unknown email', async () => {
        const res = await request(app).post('/api/auth/resend-verification').send({
          email: 'unknown-xyz@test.com',
          password: 'any'
        });
        expect(res.status).toBe(401);
        expect(emailMock.sendVerificationEmail).not.toHaveBeenCalled();
      });

      it('should return 200 and send mail when user is unverified and password matches', async () => {
        jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);
        const res = await request(app).post('/api/auth/resend-verification').send({
          email: 'unverified@test.com',
          password: 'secretpass',
          clientOrigin: 'http://localhost:3000'
        });
        expect(res.status).toBe(200);
        expect(res.body.verificationEmailSent).toBe(true);
        expect(emailMock.sendVerificationEmail).toHaveBeenCalled();
        bcrypt.compare.mockRestore();
      });

      it('should return 400 when account is already verified', async () => {
        const res = await request(app).post('/api/auth/resend-verification').send({
          email: 'login@test.com',
          password: 'secretpass'
        });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('ALREADY_VERIFIED');
        expect(emailMock.sendVerificationEmail).not.toHaveBeenCalled();
      });
    });

    describe('password reset request (UT_021)', () => {
      it('should return 200 with same generic message when email is unknown (no enumeration)', async () => {
        const res = await request(app)
          .post('/api/auth/request-password-reset')
          .send({ email: 'unknown-xyz@test.com' });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: true,
            message: 'If email exists, password reset link has been sent'
          })
        );
        expect(emailMock.sendPasswordResetEmail).not.toHaveBeenCalled();
      });

      it('should return 400 on password reset when email field is missing', async () => {
        const res = await request(app).post('/api/auth/request-password-reset').send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'Email is required'
          })
        );
      });
    });
  });

  describe('USERS', () => {
    describe('assign hotel (UT_022)', () => {
      it('should return 200 when superadmin assigns hotel and update succeeds', async () => {
        const res = await request(app)
          .post('/api/users/assign-hotel')
          .set('Authorization', `Bearer ${tokens.superadmin}`)
          .send({ email: 'assignee@test.com', hotelId: 1 });
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: true,
            message: 'Hotel assigned successfully'
          })
        );
      });

      it('should return 404 when target user email does not exist', async () => {
        const db = require('../config/db');
        db.query.mockImplementation(
          createQueryRouter({
            loginHash,
            extend: async (sql, params, s) => {
              if (s.includes('update users set hotel_id = ? where email = ?')) {
                return [{ affectedRows: 0 }];
              }
              return null;
            }
          })
        );
        const res = await request(app)
          .post('/api/users/assign-hotel')
          .set('Authorization', `Bearer ${tokens.superadmin}`)
          .send({ email: 'missing@test.com', hotelId: 1 });
        expect(res.status).toBe(404);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: 'User not found'
          })
        );
      });

      it('should return 401 when JWT is missing', async () => {
        const res = await request(app).post('/api/users/assign-hotel').send({ email: 'x@test.com', hotelId: 1 });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(typeof res.body.message).toBe('string');
      });

      it('should return 401 when JWT is tampered', async () => {
        const res = await request(app)
          .post('/api/users/assign-hotel')
          .set('Authorization', 'Bearer not-a-valid-jwt')
          .send({ email: 'x@test.com', hotelId: 1 });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/token failed|not authorized/i);
      });

      it('should return 401 when JWT is expired', async () => {
        const res = await request(app)
          .post('/api/users/assign-hotel')
          .set('Authorization', `Bearer ${tokens.expired}`)
          .send({ email: 'x@test.com', hotelId: 1 });
        expect(res.status).toBe(401);
      });

      it('should return 401 when JWT was signed with a different secret', async () => {
        const res = await request(app)
          .post('/api/users/assign-hotel')
          .set('Authorization', `Bearer ${tokens.wrongSecret}`)
          .send({ email: 'x@test.com', hotelId: 1 });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/token failed|not authorized/i);
      });
    });

    describe('list users (UT_023)', () => {
      it('should return 200 with users array for superadmin', async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.superadmin}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: true,
            users: expect.any(Array)
          })
        );
        expect(res.body.users.length).toBeGreaterThanOrEqual(1);
      });

      it('should return 403 when guest calls list users', async () => {
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${tokens.guest}`);
        expect(res.status).toBe(403);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            message: expect.stringMatching(/not authorized/i)
          })
        );
      });
    });
  });

  describe('HOTELS', () => {
    it('should return 200 with stats object for public stats (UT_024)', async () => {
      const res = await request(app).get('/api/hotels/public/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          stats: expect.objectContaining({
            hotels: expect.any(Number),
            reviews: expect.any(Number),
            guests: expect.any(Number)
          })
        })
      );
    });

    it('should return 201 when guest submits valid hotel request (UT_025)', async () => {
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
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          hotelId: expect.any(Number)
        })
      );
      expect(notifyMock.notifyHotelCreated).toHaveBeenCalled();
    });

    it('should return 400 when hotel request missing required country', async () => {
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
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe('string');
    });

    it('should return 200 with hotels array for public list (UT_026)', async () => {
      const res = await request(app).get('/api/hotels');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          hotels: expect.any(Array)
        })
      );
    });

    it('should return 404 for unknown hotel id (UT_027)', async () => {
      const res = await request(app).get('/api/hotels/999999');
      expect(res.status).toBe(404);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Hotel not found'
        })
      );
    });
  });

  describe('ROOMS', () => {
    it('should return 200 with rooms array for admin listing (UT_028)', async () => {
      const res = await request(app).get('/api/rooms?hotelId=1').set('Authorization', `Bearer ${tokens.admin}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          rooms: expect.any(Array)
        })
      );
      expect(res.body.rooms[0]).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          room_number: expect.any(String),
          type_name: expect.any(String)
        })
      );
    });

    it('should return 403 when guest attempts to create room type (UT_030)', async () => {
      const res = await request(app)
        .post('/api/rooms/types')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({
          hotel_id: 1,
          name: 'X',
          description: '',
          base_price: 1000,
          max_occupancy: 2,
          amenities: []
        });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should return 201 when admin creates room type (UT_031)', async () => {
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
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          id: expect.any(Number)
        })
      );
    });
  });

  describe('PAYMENTS', () => {
    it('should return 401 when cancel booking has no JWT (UT_033)', async () => {
      const res = await request(app).post('/api/payments/cancel').send({ bookingId: 1 });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when guest calls manual confirm (UT_034)', async () => {
      const res = await request(app)
        .post('/api/payments/confirm-manual')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ bookingId: 1 });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 when guest calls check-in (UT_035a)', async () => {
      const res = await request(app)
        .post('/api/payments/check-in')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ bookingId: 1 });
      expect(res.status).toBe(403);
    });

    it('should return 403 when guest calls check-out (UT_035b)', async () => {
      const res = await request(app)
        .post('/api/payments/check-out')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ bookingId: 1 });
      expect(res.status).toBe(403);
    });

    it('should return 401 when extend-stay has no JWT (UT_036)', async () => {
      const res = await request(app).post('/api/payments/extend-stay').send({ bookingId: 1, additional_nights: 1 });
      expect(res.status).toBe(401);
    });

    it('should return 401 when guest-details patch has no JWT (UT_037)', async () => {
      const res = await request(app).patch('/api/payments/booking/guest-details').send({ bookingId: 1 });
      expect(res.status).toBe(401);
    });

    it('should return 401 when reschedule has no JWT (UT_038)', async () => {
      const res = await request(app).patch('/api/payments/booking/reschedule').send({ bookingId: 1 });
      expect(res.status).toBe(401);
    });

    it('should return 401 when qr-token has no JWT (UT_039)', async () => {
      const res = await request(app).get('/api/payments/qr-token/1');
      expect(res.status).toBe(401);
    });

    it('should return 403 when guest calls scan-checkin (UT_040)', async () => {
      const res = await request(app)
        .post('/api/payments/scan-checkin')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ qrToken: 'x' });
      expect(res.status).toBe(403);
    });
  });

  describe('REFUNDS', () => {
    it('should return 403 when guest lists pending refunds (UT_041)', async () => {
      const res = await request(app).get('/api/payments/refund/pending').set('Authorization', `Bearer ${tokens.guest}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 when guest approves refund (UT_042)', async () => {
      const res = await request(app)
        .post('/api/payments/refund/approve')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ requestId: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('PAYOUTS', () => {
    it('should return 403 when guest requests payout (UT_043)', async () => {
      const res = await request(app)
        .post('/api/payments/payout/request')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ amount: 100 });
      expect(res.status).toBe(403);
    });

    it('should return 403 when guest approves payout (UT_044)', async () => {
      const res = await request(app)
        .post('/api/payments/payout/approve')
        .set('Authorization', `Bearer ${tokens.guest}`)
        .send({ requestId: 1 });
      expect(res.status).toBe(403);
    });
  });

  describe('REVIEWS', () => {
    it('should return 200 with reviews array for featured (UT_045)', async () => {
      const res = await request(app).get('/api/reviews/featured');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          reviews: expect.any(Array)
        })
      );
    });

    it('should return 200 with reviews for hotel listing (UT_046)', async () => {
      const res = await request(app).get('/api/reviews/hotel/1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          reviews: expect.any(Array)
        })
      );
    });

    it('should return 401 for booking review without JWT (UT_047)', async () => {
      const res = await request(app).get('/api/reviews/booking/1');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('LOYALTY', () => {
    it('should return 200 with loyalty object for authenticated guest (UT_048)', async () => {
      const res = await request(app).get('/api/loyalty/status/1').set('Authorization', `Bearer ${tokens.guest}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          loyalty: expect.objectContaining({
            hotel_id: 1,
            threshold: expect.any(Number),
            completed_stays: expect.any(Number),
            year: expect.any(Number)
          })
        })
      );
    });

    it('should return 401 for loyalty overview without JWT (UT_049)', async () => {
      const res = await request(app).get('/api/loyalty/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('SUPERADMIN extras', () => {
    it('should return 200 with hotels for pending list (UT_050)', async () => {
      const res = await request(app)
        .get('/api/superadmin/hotels/pending')
        .set('Authorization', `Bearer ${tokens.superadmin}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          hotels: expect.any(Array)
        })
      );
    });

    it('should return 200 with transactions and summary (UT_051)', async () => {
      const res = await request(app).get('/api/superadmin/transactions').set('Authorization', `Bearer ${tokens.superadmin}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          transactions: expect.any(Array),
          summary: expect.objectContaining({
            total: expect.any(Number)
          })
        })
      );
    });

    it('should return 200 with report envelope (UT_052)', async () => {
      const res = await request(app).get('/api/superadmin/report').set('Authorization', `Bearer ${tokens.superadmin}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          report: expect.objectContaining({
            generatedAt: expect.any(String),
            hotels: expect.any(Array),
            admins: expect.any(Array),
            guestCount: expect.any(Number),
            bookingStats: expect.any(Object),
            hotelPerformance: expect.any(Array)
          })
        })
      );
    });
  });

  describe('SYSTEM', () => {
    it('should return 200 JSON for health root (UT_053)', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ message: expect.any(String) }));
    });

    it('should call next for active user in checkBanStatus (UT_054)', async () => {
      const req = { user: { id: 1 } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();
      await checkBanStatus(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
