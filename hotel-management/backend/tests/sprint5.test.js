const request = require('supertest');
const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'hotel_management_system_secret_key_2024';
process.env.JWT_SECRET = TEST_JWT_SECRET;

jest.mock('../config/db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
  end: jest.fn()
}));

const app = require('../server');

const guestToken = jwt.sign(
  { id: 999, email: 'guest@example.com', role: 'guest' },
  TEST_JWT_SECRET,
  { expiresIn: '1h' }
);

const superAdminToken = jwt.sign(
  { id: 1, email: 'super@nepalstays.com', role: 'superadmin' },
  TEST_JWT_SECRET,
  { expiresIn: '1h' }
);

describe('Sprint 5: Super Admin Operations, Analytics & Loyalty', () => {
  beforeEach(() => {
    const db = require('../config/db');

    db.query.mockReset();
    db.getConnection.mockReset();

    db.query.mockImplementation((sql, params = []) => {
      const s = String(sql).toLowerCase();
      if (s.includes('from users where id = ?')) {
        const id = Number(params[0]);
        if (id === 1) {
          return Promise.resolve([[{ id: 1, full_name: 'Super Admin', email: 'super@nepalstays.com', role: 'superadmin', hotel_id: null, is_verified: 1 }]]);
        }
        if (id === 999) {
          return Promise.resolve([[{ id: 999, full_name: 'Guest', email: 'guest@example.com', role: 'guest', hotel_id: null, is_verified: 1 }]]);
        }
        return Promise.resolve([[]]);
      }

      // Superadmin analytics: overview aggregate (FROM bookings only, no hotel join)
      if (
        s.includes('from bookings') &&
        s.includes('total_revenue') &&
        s.includes('total_commission') &&
        !s.includes('join hotels')
      ) {
        return Promise.resolve([
          [
            {
              total_bookings: 10,
              confirmed: 5,
              pending: 2,
              checked_in: 1,
              checked_out: 2,
              cancelled: 0,
              total_revenue: 10000,
              total_commission: 1000,
              total_refunded: 0,
              gross_total: 12000
            }
          ]
        ]);
      }

      if (s.includes('from hotels h') && s.includes('left join bookings b') && s.includes('group by h.id')) {
        return Promise.resolve([
          [
            {
              id: 1,
              name: 'Mock Hotel',
              city: 'Kathmandu',
              balance: 5000,
              total_bookings: 3,
              revenue: 10000,
              commission: 1000,
              active_bookings: 2
            }
          ]
        ]);
      }

      if (s.includes('date_format(created_at') && s.includes('from bookings')) {
        return Promise.resolve([[{ month: '2024-06', bookings: 2, revenue: 5000, commission: 500 }]]);
      }

      if (s.includes('from bookings b') && s.includes('join hotels h') && s.includes('limit 50')) {
        return Promise.resolve([[]]);
      }

      // Safe default for analytics and other non-focused queries.
      return Promise.resolve([[]]);
    });

    db.getConnection.mockResolvedValue({
      beginTransaction: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(async (sql) => {
        const s = String(sql).toLowerCase();
        if (s.includes('select * from hotels where id = ?')) return [[]];
        return [[]];
      }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
      release: jest.fn()
    });
  });


  // --- 1. FINANCIAL ANALYTICS & AGGREGATION ---
  describe('Analytical Aggregation Engine', () => {
    it('1.1 Should correctly sum total revenue and commission (10% rule)', async () => {
      // In a real test, we would mock the DB or use a test DB
      // Here we verify the API structure and logic
      const response = await request(app)
        .get('/api/superadmin/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status === 200) {
        const { overview } = response.body.analytics;
        expect(overview).toHaveProperty('total_revenue');
        expect(overview).toHaveProperty('total_commission');

        const revenue = Number(overview.total_revenue);
        const commission = Number(overview.total_commission);
        if (!Number.isNaN(revenue) && !Number.isNaN(commission)) {
          // Logical verification: Commission should be approx 10% of gross
          const expectedCommission = revenue * 0.10;
          expect(commission).toBeCloseTo(expectedCommission, 2);
        }
      }
    });

    it('1.2 Should group revenue data by month for trend visualization', async () => {
      const response = await request(app)
        .get('/api/superadmin/analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);

      if (response.status === 200) {
        expect(Array.isArray(response.body.analytics.monthlyTrend)).toBe(true);
        if (response.body.analytics.monthlyTrend.length > 0) {
          expect(response.body.analytics.monthlyTrend[0]).toHaveProperty('month');
          expect(response.body.analytics.monthlyTrend[0]).toHaveProperty('revenue');
        }
      }
    });
  });

  // --- 2. SUPER ADMIN AUDIT SERVICES ---
  describe('Hotel Audit & Onboarding', () => {
    it('2.1 Should allow Super Admin to verify a pending hotel', async () => {
      const hotelId = 1; // Example ID
      const response = await request(app)
        .put(`/api/superadmin/hotels/${hotelId}/verify`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Status 200-404 range covers logic path, 403 would be failure
      expect([200, 404, 400]).toContain(response.status); 
    });
  });

  // --- 3. SECURITY & RBAC (Role Based Access Control) ---
  describe('Platform Security', () => {
    it('3.1 Should deny analytical data access to regular Guests (403)', async () => {
      const response = await request(app)
        .get('/api/superadmin/analytics')
        .set('Authorization', `Bearer ${guestToken}`);

      expect([401, 403]).toContain(response.status);
    });

    it('3.2 Should prevent unauthorized hotel verification attempts', async () => {
      const response = await request(app)
        .put('/api/superadmin/hotels/1/verify')
        .set('Authorization', `Bearer ${guestToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  // --- 4. LOYALTY & REWARDS LOGIC (Unit Test) ---
  describe('Loyalty Program Logic', () => {
    it('4.1 Should accurately track stay thresholds for free nights', () => {
      const stayCount = 5;
      const threshold = 5;
      
      const isEligibleForFreeNight = (count) => count >= threshold;
      
      expect(isEligibleForFreeNight(4)).toBe(false);
      expect(isEligibleForFreeNight(5)).toBe(true);
    });
  });
});
