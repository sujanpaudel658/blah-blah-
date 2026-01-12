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
  image LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add foreign key constraint for hotel_id in users table
ALTER TABLE users
ADD CONSTRAINT fk_users_hotel
FOREIGN KEY (hotel_id) REFERENCES hotels(id)


// Update hotel_id for a user
app.post('/api/users/assign-hotel', async (req, res) => {
  const { email, hotelId } = req.body;

  try {
    const [result] = await db.query(
      'UPDATE users SET hotel_id = ? WHERE email = ?',
      [hotelId, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Hotel assigned successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to assign hotel' });
  }
});-- Insert default users for each role
INSERT INTO users (full_name, email, password, role)
VALUES
  ('Super Admin', 'superadmin@example.com', 'superadminpassword', 'superadmin'),
  ('Admin User', 'admin@example.com', 'adminpassword', 'admin'),
  ('Normal User', 'user@example.com', 'userpassword', 'guest');
ON DELETE SET NULL;
// filepath: c:\Users\Sujan college\Documents\GitHub\23050272-Sujan-Paudel\hotel-management\backend\config\db.js
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
});

module.exports = connection;