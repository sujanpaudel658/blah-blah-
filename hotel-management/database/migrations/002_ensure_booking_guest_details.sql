

CREATE TABLE IF NOT EXISTS booking_guest_details (
  booking_id INT NOT NULL PRIMARY KEY,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  special_requests TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bgd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
