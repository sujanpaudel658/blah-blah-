const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDb() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
    });

    try {
        console.log(`Creating database ${process.env.DB_NAME || 'nepal_stays'}...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'nepal_stays'}`);
        await connection.query(`USE ${process.env.DB_NAME || 'nepal_stays'}`);

        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual queries
        const queries = schema
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0);

        console.log('Running schema queries...');
        for (const query of queries) {
            await connection.query(query);
        }

        console.log(' Database and schema initialized successfully');
    } catch (error) {
        console.error(' Error initializing database:', error.message);
    } finally {
        await connection.end();
    }
}

initDb();
