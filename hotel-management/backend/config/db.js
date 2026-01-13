const mysql = require('mysql2');
require('dotenv').config();

// creating the pool - I prefer this over single connections tbh
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nepal_stays',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✓ Database connected');
  connection.query('SET GLOBAL max_allowed_packet=67108864', (err) => {
    if (!err) console.log('✓ max_allowed_packet set to 64MB');
    connection.release();
  });
});

module.exports = pool.promise();
