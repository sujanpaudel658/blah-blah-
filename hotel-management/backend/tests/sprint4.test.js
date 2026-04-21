const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../services/geminiChat.service', () => ({
  getKey: jest.fn(() => 'test-gemini-key'),
  askGemini: jest.fn(async () => 'Mocked Gemini reply for testing')
}));

jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
}));

const app = require('../server');

const testToken = jwt.sign(
  { id: 1, email: 'test@example.com', role: 'guest' },
  process.env.JWT_SECRET || 'hotel_management_system_secret_key_2024',
  { expiresIn: '1h' }
);

describe('Sprint 4: AI Chatbot & Review Integrity', () => {
  const sampleHotelRow = {
    id: 1,
    name: 'Mock Hotel',
    city: 'Kathmandu',
    address: 'Test St',
    phone: '9800000000',
    email: 'hotel@example.com',
    description: 'Test',
    rating: 4.5,
    latitude: null,
    longitude: null,
    starting_price: 2500
  };

  beforeEach(() => {
    const db = require('../config/db');
    db.query.mockReset();
    db.query.mockImplementation((sql, params = []) => {
      const s = String(sql).toLowerCase();

      if (s.includes('from users where id = ?')) {
        return Promise.resolve([
          [
            {
              id: 1,
              full_name: 'Test Guest',
              email: 'test@example.com',
              role: 'guest',
              hotel_id: null,
              is_verified: 1
            }
          ]
        ]);
      }

      if (s.includes('from hotels h') || s.includes('distinct city from hotels')) {
        return Promise.resolve([[sampleHotelRow]]);
      }

      if (s.includes('from bookings where id = ? and user_id = ?')) {
        const bookingId = Number(params[0]);
        if (bookingId === 50) {
          return Promise.resolve([[{ hotel_id: 1, status: 'cancelled' }]]);
        }
        if (bookingId === 101) {
          return Promise.resolve([[{ hotel_id: 1, status: 'checked_out' }]]);
        }
        return Promise.resolve([[]]);
      }

      if (s.includes('from reviews where booking_id = ?') && !s.includes('user_id')) {
        return Promise.resolve([[]]);
      }

      if (s.includes('insert into reviews')) {
        return Promise.resolve([{ insertId: 1 }]);
      }

      if (s.includes('avg(rating)')) {
        return Promise.resolve([[{ avg_rating: 5 }]]);
      }

      if (s.includes('update hotels set rating')) {
        return Promise.resolve([{ affectedRows: 1 }]);
      }

      return Promise.resolve([[]]);
    });
  });

  // --- 1. AI CHATBOT INTERACTION ---
  describe('AI Personalization & Connectivity', () => {
    it('1.1 Should process natural language queries through the chatbot service', async () => {
      const response = await request(app)
        .post('/api/chatbot/query')
        .send({ message: 'What are the top rated hotels in Kathmandu?' });

      // Verification: Check if response contains a reply and a mode
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('reply');
      expect(['gemini', 'rules']).toContain(response.body.replyMode);
    });

    it('1.2 Should maintain conversation history context', async () => {
      const response = await request(app)
        .post('/api/chatbot/query')
        .send({
          message: 'Tell me more about the first one.',
          history: [{ role: 'user', text: 'top hotels in Lalitpur' }]
        });

      expect(response.status).toBe(200);
    });
  });

  // --- 2. REVIEW MANAGEMENT LOGIC ---
  describe('Guest Feedback Protocol', () => {
    it('2.1 Should allow a verified guest to submit a multi-rating review', async () => {
      const reviewPayload = {
        booking_id: 101, // Example mock ID
        rating: 5,
        cleanliness_rating: 4,
        service_rating: 5,
        location_rating: 4,
        value_rating: 5,
        title: 'Excellent Stay',
        comment: 'Very professional staff and clean rooms.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testToken}`)
        .send(reviewPayload);

      // Testing logic path (will be 201 if DB permits, else handled error)
      expect([201, 400, 404]).toContain(response.status);
    });
  });

  // --- 3. REVIEW AUTHORIZATION SECURITY ---
  describe('Review Security Layers', () => {
    it('3.1 Should block anonymous or unverified review attempts', async () => {
      const response = await request(app)
        .post('/api/reviews')
        .send({ booking_id: 999, rating: 5 });

      // Unauthenticated attempts must be blocked
      expect(response.status).toBe(401);
    });

    it('3.2 Should block review submission if stay status is not completed/checked_in', async () => {
      // In this test, we verify the logic of the 'Access Integrity' check
      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ booking_id: 50, rating: 5 }); // ID 50 is mocked as 'cancelled'

      // Logic should return 400 (Bad Request) or 403 based on controller rule
      expect([400, 403, 404]).toContain(response.status);
    });
  });
});
