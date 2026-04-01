-- Fix: Table 'nepal_stays.booking_guest_details' doesn't exist
-- Run once against your DB (local MySQL or Docker).
--
-- Docker example:
--   docker exec -i hotel_db mysql -uroot -proot nepal_stays < database/migrations/002_ensure_booking_guest_details.sql
--
-- Local example:
--   mysql -u root -p nepal_stays < database/migrations/002_ensure_booking_guest_details.sql

CREATE TABLE IF NOT EXISTS booking_guest_details (
  booking_id INT NOT NULL PRIMARY KEY,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  special_requests TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bgd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
