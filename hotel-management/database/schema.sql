-- Hotel Management System Database Schema

-- Drop existing users table if you want to recreate
-- DROP TABLE IF EXISTS users;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_role (role)
);

-- Create hotels table (for super admin management)
CREATE TABLE IF NOT EXISTS hotels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add foreign key constraint for hotel_id in users table
ALTER TABLE users
ADD CONSTRAINT fk_users_hotel
FOREIGN KEY (hotel_id) REFERENCES hotels(id)
ON DELETE SET NULL;
