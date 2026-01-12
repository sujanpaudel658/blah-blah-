const mysql = require('mysql2');
require('dotenv').config();

// creating the pool - I prefer this over single connections tbh
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// quick test to see if we're connected
pool.getConnection((err, connection) => {
  if (err) {
    console.error('DB connection error:', err.message);
  } else {
    console.log('✓ Database connected');
    // Try to set max_allowed_packet for large image uploads
    connection.query('SET GLOBAL max_allowed_packet=67108864', (err) => {
      if (err) {
        console.log('⚠ Note: Could not set max_allowed_packet (may need admin privileges)');
        console.log('  To fix: Run "SET GLOBAL max_allowed_packet=67108864" in MySQL as admin');
      } else {
        console.log('✓ max_allowed_packet set to 64MB');
      }
      connection.release();
    });
  }
});

module.exports = pool.promise();
