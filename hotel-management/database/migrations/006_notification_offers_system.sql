CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  role ENUM('admin', 'superadmin', 'user') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('booking', 'payment', 'offer', 'system', 'security', 'loyalty') NOT NULL,
  reference_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_role_read (user_id, role, is_read),
  INDEX idx_notifications_role_created (role, created_at),
  INDEX idx_notifications_type (type),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_offers_active_dates (is_active, valid_from, valid_to),
  INDEX idx_offers_coupon (coupon_code),
  CONSTRAINT fk_offers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  offer_id INT NOT NULL,
  is_used TINYINT(1) NOT NULL DEFAULT 0,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_offer (user_id, offer_id),
  INDEX idx_user_offers_offer_used (offer_id, is_used),
  CONSTRAINT fk_user_offers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_offers_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('pending', 'processing', 'completed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 5,
  error_message VARCHAR(500) NULL,
  execute_after DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jobs_status_execute (status, execute_after),
  INDEX idx_jobs_priority (priority)
);
