const db = require('../config/db');

async function comprehensiveFix() {
    try {
        console.log('--- COMPREHENSIVE DATABASE REPAIR ---');

        // 1. Repair Bookings Table
        console.log('Checking Bookings Table...');
        const requiredBookingsColumns = [
            { name: 'booking_reference', def: 'VARCHAR(20) UNIQUE NOT NULL AFTER id' },
            { name: 'num_guests', def: 'INT DEFAULT 1 AFTER check_out_date' },
            { name: 'total_nights', def: 'INT NOT NULL AFTER num_guests' },
            { name: 'price_per_night', def: 'DECIMAL(10,2) NOT NULL AFTER total_nights' },
            { name: 'total_amount', def: 'DECIMAL(10,2) NOT NULL AFTER price_per_night' },
            { name: 'status', def: "ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') DEFAULT 'pending' AFTER total_amount" },
            { name: 'payment_status', def: "ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending' AFTER status" },
            { name: 'guest_name', def: 'VARCHAR(255) AFTER payment_status' },
            { name: 'guest_email', def: 'VARCHAR(100) AFTER guest_name' },
            { name: 'guest_phone', def: 'VARCHAR(20) AFTER guest_email' }
        ];

        for (const col of requiredBookingsColumns) {
            const [exists] = await db.query(`SHOW COLUMNS FROM bookings LIKE '${col.name}'`);
            if (exists.length === 0) {
                console.log(`Adding missing column to bookings: ${col.name}`);
                await db.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.def}`);
            }
        }

        // 2. Repair Payments Table
        console.log('Checking Payments Table...');
        const [payTable] = await db.query("SHOW TABLES LIKE 'payments'");
        if (payTable.length === 0) {
            console.log('Creating Payments Table...');
            await db.query(`
                CREATE TABLE payments (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    booking_id INT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    payment_method ENUM('cash', 'card', 'bank_transfer', 'esewa', 'khalti', 'fonepay') NOT NULL,
                    transaction_id VARCHAR(100),
                    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                    paid_at TIMESTAMP NULL,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
             `);
        } else {
            console.log('Payments table exists.');
        }

        console.log('ALL UPDATES APPLIED.');
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL REPAIR ERROR:', error.message);
        process.exit(1);
    }
}

comprehensiveFix();
