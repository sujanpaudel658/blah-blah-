require('dotenv').config({ path: __dirname + '/../.env' });
const db = require('../config/db');

async function updateDb() {
    try {
        await db.query("ALTER TABLE rooms MODIFY COLUMN status ENUM('available', 'occupied', 'booked', 'maintenance', 'cleaning') DEFAULT 'available'");
        console.log('Room status ENUM updated successfully.');
    } catch (err) {
        console.error('Error updating DB:', err);
    } finally {
        process.exit();
    }
}
updateDb();
