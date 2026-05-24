const mysql = require('mysql2');
const path = require('path');

// Always load backend/.env (cwd can differ under concurrently/npm scripts).
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
  override: true
});

const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = Number(process.env.DB_PORT || 3306);
const dbName = process.env.DB_NAME || 'nepal_stays';

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return field.string() === '1';
    }
    return next();
  }
});

// Skip startup probe in tests to avoid side effects and noisy logs.
if (process.env.NODE_ENV !== 'test') {
  // Test connection on startup
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(
        ` Database connection failed (${dbHost}:${dbPort}/${dbName}):`,
        err.message
      );
      if (err.code === 'ETIMEDOUT' && dbHost === 'localhost') {
        console.error(
          ' Tip: use DB_HOST=127.0.0.1 in backend/.env (Windows localhost often uses IPv6).'
        );
      }
      return;
    }
    console.log(` Database connected (${dbHost}:${dbPort}/${dbName})`);
    // XAMPP/MariaDB: may fail without SUPER; harmless for normal queries.
    connection.query('SET GLOBAL max_allowed_packet=67108864', (err) => {
      if (err && process.env.DEBUG_DB === '1') {
        console.warn('[db] max_allowed_packet (optional on XAMPP):', err.message);
      }
      connection.release();
    });
  });
}

module.exports = pool.promise();
