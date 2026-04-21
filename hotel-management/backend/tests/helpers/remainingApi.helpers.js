// Test doubles + SQL router for remaining API Jest suite.
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'hotel_management_system_secret_key_2024';

const SEEDED_USERS = {
  1: { id: 1, full_name: 'Guest', email: 'g@test.com', role: 'guest', hotel_id: null, is_verified: 1, account_status: 'active', ban_until: null },
  2: { id: 2, full_name: 'Admin', email: 'a@test.com', role: 'admin', hotel_id: 1, is_verified: 1, account_status: 'active', ban_until: null },
  99: { id: 99, full_name: 'Super', email: 's@test.com', role: 'superadmin', hotel_id: null, is_verified: 1, account_status: 'active', ban_until: null }
};

function buildTokens(secret = TEST_JWT_SECRET) {
  return {
    guest: jwt.sign({ id: 1, email: 'g@test.com', role: 'guest' }, secret, { expiresIn: '1h' }),
    admin: jwt.sign({ id: 2, email: 'a@test.com', role: 'admin' }, secret, { expiresIn: '1h' }),
    superadmin: jwt.sign({ id: 99, email: 's@test.com', role: 'superadmin' }, secret, { expiresIn: '1h' }),
    expired: jwt.sign({ id: 1, email: 'g@test.com', role: 'guest' }, secret, { expiresIn: '-1s' }),
    wrongSecret: jwt.sign({ id: 1, email: 'g@test.com', role: 'guest' }, 'wrong-secret-key-xxxxxxxxxxxx', { expiresIn: '1h' })
  };
}

function connMock() {
  let insertSeq = 5000;
  return {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockImplementation(async (sql) => {
      const s = String(sql).toLowerCase();
      if (s.includes('select id from hotels where owner_id')) return [[]];
      if (s.includes('insert into hotels')) return [{ insertId: ++insertSeq }];
      if (s.includes('insert into room_types')) return [{ insertId: ++insertSeq }];
      if (s.includes('insert into rooms')) return [{ insertId: ++insertSeq }];
      return [[]];
    }),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
}

function createQueryRouter({ loginHash, extend }) {
  return async function query(sql, params = []) {
    const s = String(sql).toLowerCase();
    const hit = extend && (await extend(sql, params, s));
    if (hit !== null && hit !== undefined) return hit;

    if (s.includes('from users where id = ?')) {
      const row = SEEDED_USERS[Number(params[0])];
      return [row ? [row] : []];
    }

    if (s.includes('select account_status, ban_until from users where id = ?')) {
      const row = SEEDED_USERS[Number(params[0])];
      return [[{ account_status: row.account_status, ban_until: row.ban_until }]];
    }

    if (s.includes('select * from users where email = ?') && params[0] === 'login@test.com') {
      return [
        [
          {
            id: 10,
            email: 'login@test.com',
            full_name: 'Login User',
            password: loginHash,
            role: 'guest',
            hotel_id: null,
            phone: '9800000000',
            is_verified: 1
          }
        ]
      ];
    }

    if (s.includes('select * from users where email = ?') && params[0] === 'unverified@test.com') {
      return [
        [
          {
            id: 11,
            email: 'unverified@test.com',
            full_name: 'Unverified User',
            password: loginHash,
            role: 'guest',
            hotel_id: null,
            phone: '9800000000',
            is_verified: 0
          }
        ]
      ];
    }

    if (s.includes('insert into users (full_name, email, phone, password, role')) {
      return [{ insertId: 1001 }];
    }
    if (s.includes('select id from hotels where email = ?')) {
      return [[]];
    }
    if (s.includes('delete from users where id = ?')) {
      return [{ affectedRows: 1 }];
    }

    if (s.includes('update users set verification_token = ?') && s.includes('where id = ?')) {
      return [{ affectedRows: 1 }];
    }

    if (s.includes('select id from users where email = ?')) {
      return [[]];
    }

    if (s.includes('select count(*) as count from hotels')) return [[{ count: 2 }]];
    if (s.includes('select count(*) as count from reviews')) return [[{ count: 3 }]];
    if (s.includes('from users where role = "guest"') && s.includes('count')) return [[{ count: 10 }]];

    if (s.includes('select id from hotels where owner_id = ?')) return [[]];
    if (s.includes('insert into hotels (name, address, city, country')) return [{ insertId: 501 }];

    if (s.includes('select * from hotels') && s.includes("status = 'verified'")) {
      return [[{ id: 1, name: 'H1', city: 'Kathmandu', status: 'verified' }]];
    }

    if (s.includes('select * from hotels order by')) {
      return [[{ id: 1, name: 'H1', city: 'Kathmandu', status: 'verified' }]];
    }

    if (s.includes('select * from hotels where id = ?') && !s.includes('join')) {
      if (Number(params[0]) === 999999) return [[]];
      return [[{ id: 1, name: 'H1', city: 'KTM', status: 'verified' }]];
    }

    if (s.includes('update users set hotel_id = ? where email = ?')) {
      return [{ affectedRows: 1 }];
    }

    if (s.includes('from users u') && s.includes('left join hotels h') && s.includes('order by u.created_at')) {
      return [[{ id: 1, full_name: 'U1', email: 'u@t.com', role: 'guest', hotel_id: null, hotel_name: null }]];
    }

    if (
      s.includes('from rooms r') &&
      s.includes('join room_types rt') &&
      s.includes('where r.hotel_id = ?')
    ) {
      return [
        [
          {
            id: 1,
            hotel_id: 1,
            room_type_id: 1,
            room_number: '101',
            floor: 1,
            status: 'available',
            notes: '',
            type_name: 'Deluxe',
            base_price: 2000,
            max_occupancy: 2,
            amenities: '[]',
            is_occupied: 0
          }
        ]
      ];
    }

    if (s.includes('insert into room_types')) return [{ insertId: 88 }];
    if (s.includes('select hotel_id from room_types where id = ?')) return [[{ hotel_id: 1 }]];
    if (s.includes('select id from rooms where room_type_id = ?')) return [[]];
    if (s.includes('delete from room_types where id = ?')) return [{ affectedRows: 1 }];

    if (s.includes('from reviews r') && s.includes('join hotels h') && s.includes('limit 6')) {
      return [
        [
          {
            id: 1,
            rating: 5,
            hotel_id: 1,
            booking_id: 1,
            reviewer_name: 'R1',
            hotel_name: 'H1',
            booking_status: 'checked_out'
          }
        ]
      ];
    }

    if (s.includes('from reviews r') && s.includes('where r.hotel_id = ?')) {
      return [[{ id: 1, rating: 4, hotel_id: 1, reviewer_name: 'A', booking_status: 'checked_out' }]];
    }

    if (s.includes('from reviews where booking_id = ? and user_id = ?')) return [[]];

    if (s.includes('select count(*) as completed_stays') && s.includes('bookings')) {
      return [[{ completed_stays: 3 }]];
    }
    if (s.includes('select count(*) as redeemed_count')) return [[{ redeemed_count: 0 }]];

    if (s.includes('from bookings b') && s.includes('where b.hotel_id = ?') && s.includes('group by b.id')) {
      return [[]];
    }
    if (s.includes('from bookings b') && s.includes('booking_reference = ?')) return [[]];

    if (
      s.includes('from hotels h') &&
      s.includes('left join users u on h.owner_id = u.id') &&
      s.includes("where h.status = 'pending'")
    ) {
      return [[{ id: 9, name: 'Pending H', status: 'pending', owner_id: 5, owner_name: 'O', owner_email: 'o@test.com' }]];
    }

    if (s.includes('select id, name, city, country, created_at from hotels order by name')) {
      return [[{ id: 1, name: 'H', city: 'KTM', country: 'NP', created_at: new Date() }]];
    }

    if (s.includes("where u.role = 'admin'") && s.includes('hotel_name') && s.includes('from users u')) {
      return [[{ full_name: 'Adm', email: 'ad@m.com', hotel_name: 'H' }]];
    }

    if (
      s.includes('select count(*) as count from users where role = \'guest\'') &&
      !s.includes('left join')
    ) {
      return [[{ count: 5 }]];
    }

    if (
      s.includes('from bookings') &&
      s.includes('total_commission') &&
      s.includes('checked_out') &&
      s.includes('cancelled') &&
      !s.includes('join hotels h')
    ) {
      return [
        [
          {
            total_bookings: 2,
            total_revenue: 1000,
            total_commission: 100,
            confirmed: 1,
            cancelled: 0,
            completed: 1
          }
        ]
      ];
    }

    if (
      s.includes('from hotels h') &&
      s.includes('left join bookings b') &&
      s.includes('group by h.id') &&
      s.includes('order by revenue')
    ) {
      return [[{ name: 'H', city: 'KTM', bookings: 1, revenue: 1000, commission: 100 }]];
    }

    if (s.includes('from payments p') && s.includes('join bookings b') && s.includes('limit 200')) {
      return [
        [
          {
            payment_id: 1,
            amount: 100,
            booking_id: 1,
            booking_reference: 'BK-1',
            payment_method: 'khalti',
            payment_status: 'completed',
            guest_name: 'G'
          }
        ]
      ];
    }

    if (s.includes('from payments p') && s.includes('total_collected')) {
      return [
        [
          {
            total: 1,
            completed: 1,
            pending: 0,
            refunded: 0,
            total_collected: 100,
            total_commission: 10,
            total_refunded: 0
          }
        ]
      ];
    }

    return [[]];
  };
}

async function assertResponseTime(fn, maxMs = 2500) {
  const t0 = Date.now();
  const res = await fn();
  expect(Date.now() - t0).toBeLessThan(maxMs);
  return res;
}

module.exports = {
  TEST_JWT_SECRET,
  SEEDED_USERS,
  buildTokens,
  connMock,
  createQueryRouter,
  assertResponseTime
};
