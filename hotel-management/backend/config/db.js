const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nepal_stays',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Skip startup probe in tests to avoid side effects and noisy logs.
if (process.env.NODE_ENV !== 'test') {
  // Test connection on startup
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      return;
    }
    console.log('✓ Database connected');
    connection.query('SET GLOBAL max_allowed_packet=67108864', (err) => {
      if (err && process.env.DEBUG_DB === '1') console.warn('[db] max_allowed_packet:', err.message);
      connection.release();
    });
  });
}

module.exports = pool.promise();
