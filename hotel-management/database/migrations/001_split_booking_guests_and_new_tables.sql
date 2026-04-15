


SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS pidx VARCHAR(255) NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS loyalty_free_night TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS balance_synced TINYINT(1) DEFAULT 0;

ALTER TABLE refund_requests
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS approved_by INT NULL;

CREATE TABLE IF NOT EXISTS booking_guest_details (
  booking_id INT NOT NULL PRIMARY KEY,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  special_requests TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bgd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- One row per booking (nullable columns) before legacy fields are dropped
INSERT INTO booking_guest_details (booking_id, guest_name, guest_email, guest_phone, special_requests)
SELECT b.id, b.guest_name, b.guest_email, b.guest_phone, b.special_requests
FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM booking_guest_details g WHERE g.booking_id = b.id);

ALTER TABLE bookings
  DROP COLUMN IF EXISTS special_requests,
  DROP COLUMN IF EXISTS guest_name,
  DROP COLUMN IF EXISTS guest_email,
  DROP COLUMN IF EXISTS guest_phone;

CREATE TABLE IF NOT EXISTS hotel_payout_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payout_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  INDEX idx_payout_status (status)
);

CREATE TABLE IF NOT EXISTS hotel_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  caption VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hotel_media_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  INDEX idx_hotel_media_hotel (hotel_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(64) NOT NULL,
  entity_id INT NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_user_id INT NULL,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

SET FOREIGN_KEY_CHECKS = 1;


