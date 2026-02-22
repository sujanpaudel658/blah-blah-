-- Hotel Management System Database Schema



-- Create hotels table first (referenced by users)
CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  description TEXT,
  image LONGTEXT,
  rating DECIMAL(3,2) DEFAULT 0.0,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  owner_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  balance DECIMAL(10,2) DEFAULT 0.00,
  CONSTRAINT fk_hotels_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status)
);

-- Create users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255),
  role ENUM('superadmin', 'admin', 'guest') DEFAULT 'guest',
  hotel_id INT NULL,
  verification_token VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  reset_token VARCHAR(255),
  reset_token_expires DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_role (role),
  CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE SET NULL
);

-- Room Types table (for categorizing rooms)
CREATE TABLE IF NOT EXISTS room_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  max_occupancy INT DEFAULT 2,
  amenities JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_room_types_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Rooms table (individual rooms)
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  room_type_id INT NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  floor INT,
  status ENUM('available', 'occupied', 'booked', 'maintenance', 'cleaning') DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rooms_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room (hotel_id, room_number)
);

-- Bookings table (main booking records)
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  hotel_id INT NOT NULL,
  room_id INT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  num_guests INT DEFAULT 1,
  total_nights INT NOT NULL,
  price_per_night DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') DEFAULT 'pending',
  payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
  special_requests TEXT,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  cancelled_at TIMESTAMP NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_dates (check_in_date, check_out_date),
  INDEX idx_status (status),
  INDEX idx_reference (booking_reference)
);

-- Payments table (track payment transactions)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'bank_transfer', 'esewa', 'khalti', 'fonepay') NOT NULL,
  transaction_id VARCHAR(100),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Reviews table (guest reviews after checkout)
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  hotel_id INT NOT NULL,
  rating INT NOT NULL,
  cleanliness_rating INT,
  service_rating INT,
  location_rating INT,
  value_rating INT,
  title VARCHAR(255),
  comment TEXT,
  hotel_response TEXT,
  response_at TIMESTAMP NULL,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Price Calendar table (for seasonal pricing)
CREATE TABLE IF NOT EXISTS price_calendar (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_type_id INT NOT NULL,
  date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_price_calendar_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_date_room (room_type_id, date)
);

-- Scan logs for QR check-in activity
CREATE TABLE IF NOT EXISTS scan_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  hotel_id INT NOT NULL,
  scanned_by INT NOT NULL,
  status ENUM('success', 'failed_invalid', 'failed_expired', 'failed_already_checked_in', 'failed_wrong_hotel', 'failed_cancelled') NOT NULL,
  error_message VARCHAR(255),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (hotel_id) REFERENCES hotels(id),
  FOREIGN KEY (scanned_by) REFERENCES users(id)
);

-- Index for faster reference lookup
CREATE INDEX idx_booking_ref ON bookings(booking_reference);

-- Insert default superadmin user (password should be hashed in production)
INSERT INTO users (full_name, email, password, role)
VALUES ('Super Admin', 'superadmin@nepalstays.com', '$2b$10$yourhashedpasswordhere', 'superadmin')
ON DUPLICATE KEY UPDATE full_name = full_name;