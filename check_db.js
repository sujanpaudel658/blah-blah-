const mysql = require('mysql2/promise');
require('dotenv').config({ path: './hotel-management/backend/.env' });

async function checkSchema() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nepal_stays'
    });

    const [rows] = await connection.query('DESC users');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkSchema();
