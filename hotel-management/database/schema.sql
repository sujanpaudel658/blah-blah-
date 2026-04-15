SET FOREIGN_KEY_CHECKS = 0;
-- Hotel Management System Database Schema
-- Used for local installs and Docker (./database/schema.sql -> /docker-entrypoint-initdb.d/)

--  hotels table  (referenced by users)
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
  listing_contract_accepted TINYINT(1) NOT NULL DEFAULT 0,
  listing_contract_accepted_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  balance DECIMAL(10,2) DEFAULT 0.00,
  CONSTRAINT fk_hotels_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status)
);

--  users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(500) NULL,
  password VARCHAR(255),
  role ENUM('superadmin', 'admin', 'guest') DEFAULT 'guest',
  hotel_id INT NULL,
  verification_token VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  reset_token VARCHAR(255),
  reset_token_expiry DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  no_show_count INT DEFAULT 0,
  account_status ENUM('active', 'temp_banned', 'perm_banned') DEFAULT 'active',
  ban_until DATETIME NULL,
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
  INDEX idx_room_types_hotel_price (hotel_id, base_price),
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

-- Bookings table (core stay record; guest contact split to booking_guest_details)
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
  confirmed_by INT NULL,
  confirmed_at TIMESTAMP NULL,
  checked_in_at TIMESTAMP NULL,
  checked_out_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancelled_by INT NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  loyalty_free_night TINYINT(1) DEFAULT 0,
  loyalty_discount DECIMAL(10,2) DEFAULT 0.00,
  balance_synced TINYINT(1) DEFAULT 0,
  CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_dates (check_in_date, check_out_date),
  INDEX idx_status (status),
  INDEX idx_reference (booking_reference)
);

-- Guest / special-request data per booking (1:1 with bookings)
CREATE TABLE IF NOT EXISTS booking_guest_details (
  booking_id INT NOT NULL PRIMARY KEY,
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  special_requests TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bgd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Payments table (track payment transactions)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('cash', 'card', 'bank_transfer', 'esewa', 'khalti', 'fonepay') NOT NULL,
  transaction_id VARCHAR(100),
  pidx VARCHAR(255) NULL,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_payments_pidx (pidx)
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

-- Refund Requests table for automated penalty management
CREATE TABLE IF NOT EXISTS refund_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  hotel_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT,
  rejection_category VARCHAR(255) NULL,
  approved_at TIMESTAMP NULL,
  approved_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Hotel payout requests (SuperAdmin approval)
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

-- Extra gallery images per hotel (primary cover remains hotels.image)
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

-- Generic audit trail (optional inserts from app code)
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

-- In-app notifications (role-aware inbox)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  role ENUM('admin', 'superadmin', 'user') NOT NULL,
  type ENUM('booking', 'payment', 'offer', 'system', 'security', 'loyalty') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_id INT NULL,
  is_read TINYINT(1) DEFAULT 0,
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_role_read (user_id, role, is_read),
  INDEX idx_notifications_role_created (role, created_at),
  INDEX idx_notifications_type (type)
);

-- Offers catalog
CREATE TABLE IF NOT EXISTS offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  offer_type ENUM('percentage', 'flat', 'seasonal', 'coupon', 'loyalty') NOT NULL,
  discount_type ENUM('percentage', 'flat') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(64) UNIQUE NULL,
  valid_from DATETIME NOT NULL,
  valid_to DATETIME NOT NULL,
  usage_limit INT NULL,
  applicable_hotels JSON NULL,
  applicable_rooms JSON NULL,
  user_segment ENUM('new', 'frequent', 'inactive', 'all') NOT NULL DEFAULT 'all',
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_offers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_offers_active_dates (is_active, valid_from, valid_to),
  INDEX idx_offers_coupon (coupon_code)
);

-- User-targeted offer assignments and usage
CREATE TABLE IF NOT EXISTS user_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  offer_id INT NOT NULL,
  is_used TINYINT(1) DEFAULT 0,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_offer (user_id, offer_id),
  CONSTRAINT fk_user_offers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_offers_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  INDEX idx_user_offers_offer_used (offer_id, is_used)
);

-- Async queue table for scalable notification dispatch
CREATE TABLE IF NOT EXISTS notification_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
  attempts INT DEFAULT 0,
  priority INT DEFAULT 5,
  error_message VARCHAR(500) NULL,
  execute_after DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jobs_status_execute (status, execute_after),
  INDEX idx_jobs_priority (priority)
);

-- Chatbot sessions for optional conversation persistence
CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_key VARCHAR(64) NULL,
  source ENUM('guest', 'user', 'admin') DEFAULT 'guest',
  context JSON,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_chat_session_key (session_key),
  INDEX idx_chat_sessions_user (user_id)
);

-- Chatbot messages under a session
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  user_id INT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  message_text LONGTEXT NOT NULL,
  intent VARCHAR(100) NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_chat_messages_session (session_id, created_at)
);

-- Optional message-level feedback
CREATE TABLE IF NOT EXISTS chat_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  user_id INT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_feedback_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_chat_feedback_message_user (message_id, user_id),
  INDEX idx_chat_feedback_message (message_id)
);

-- Booking status timeline for traceability
CREATE TABLE IF NOT EXISTS booking_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  changed_by INT NULL,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking_history_booking (booking_id, changed_at)
);

-- Room status timeline for operational audit
CREATE TABLE IF NOT EXISTS room_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status VARCHAR(32) NOT NULL,
  source VARCHAR(64) NULL,
  reference_type VARCHAR(32) NULL,
  reference_id INT NULL,
  changed_by INT NULL,
  notes TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_room_history_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_room_history_room (room_id, changed_at)
);

-- Payout execution ledger (separate from payout requests)
CREATE TABLE IF NOT EXISTS hotel_payout_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payout_request_id INT NULL,
  hotel_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_reference VARCHAR(128) NULL,
  status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'completed',
  processed_by INT NULL,
  processed_at TIMESTAMP NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payout_tx_request FOREIGN KEY (payout_request_id) REFERENCES hotel_payout_requests(id) ON DELETE SET NULL,
  CONSTRAINT fk_payout_tx_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  CONSTRAINT fk_payout_tx_user FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_payout_tx_hotel (hotel_id, created_at),
  INDEX idx_payout_tx_request (payout_request_id)
);



SET FOREIGN_KEY_CHECKS = 1;
