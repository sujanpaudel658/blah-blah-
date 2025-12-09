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
    connection.release();
  }
});

module.exports = pool.promise();
