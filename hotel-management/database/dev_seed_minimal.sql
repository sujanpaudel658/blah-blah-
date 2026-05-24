-- One verified demo hotel + room type + room when database has no hotels (local dev recovery).
-- Requires existing users.id = 1 (superadmin) for owner_id FK.

START TRANSACTION;

INSERT INTO hotels (
  name, address, city, country, phone, email, description, status, owner_id, rating, latitude, longitude
)
VALUES (
  'Demo Heritage Hotel',
  'Thamel Marg',
  'Kathmandu',
  'Nepal',
  '+9779800000000',
  'demo.hotel@local.dev',
  'Minimal seed after empty DB (not production data).',
  'verified',
  1,
  4.50,
  27.71720000,
  85.32400000
);

SET @hid = LAST_INSERT_ID();

INSERT INTO room_types (hotel_id, name, description, base_price, max_occupancy, amenities)
VALUES (@hid, 'Standard Double', 'Queen bed, development seed.', 3500.00, 2, '[]');

SET @rtid = LAST_INSERT_ID();

INSERT INTO rooms (hotel_id, room_type_id, room_number, floor, status)
VALUES (@hid, @rtid, '101', 1, 'available');

COMMIT;
