const db = require('../config/db');

async function fixDatabase() {
    try {
        console.log('--- Comprehensive Database Repair Tool ---');

        // 1. Ensure room_types table exists
        console.log('Checking room_types table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS room_types (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hotel_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                base_price DECIMAL(10,2) NOT NULL,
                max_occupancy INT DEFAULT 2,
                amenities JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 2. Ensure rooms table has all required columns
        console.log('Checking rooms table columns...');
        const requiredColumns = [
            { name: 'room_type_id', definition: 'INT AFTER hotel_id' },
            { name: 'floor', definition: 'INT AFTER room_number' },
            { name: 'status', definition: "ENUM('available', 'occupied', 'maintenance', 'cleaning') DEFAULT 'available' AFTER floor" },
            { name: 'notes', definition: 'TEXT AFTER status' }
        ];

        for (const col of requiredColumns) {
            const [columns] = await db.query(`SHOW COLUMNS FROM rooms LIKE '${col.name}'`);
            if (columns.length === 0) {
                console.log(`Adding missing column: ${col.name}`);
                await db.query(`ALTER TABLE rooms ADD COLUMN ${col.name} ${col.definition}`);

                // Special case for foreign key if room_type_id was missing
                if (col.name === 'room_type_id') {
                    try {
                        await db.query('ALTER TABLE rooms ADD CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE CASCADE');
                        console.log('Foreign key constraint added.');
                    } catch (e) {
                        console.log('Note: Foreign key constraint might already exist or failed to add.');
                    }
                }
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }

        // 3. Ensure bookings table exists and has all columns
        console.log('Checking bookings table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_reference VARCHAR(20) UNIQUE NOT NULL,
                user_id INT NOT NULL,
                hotel_id INT NOT NULL,
                room_id INT NOT NULL,
                check_in_date DATE NOT NULL,
                check_out_date DATE NOT NULL,
                num_guests INT DEFAULT 1,
                total_nights INT NOT NULL,
                price_per_night DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show') DEFAULT 'pending',
                payment_status ENUM('pending', 'partial', 'paid', 'refunded') DEFAULT 'pending',
                special_requests TEXT,
                guest_name VARCHAR(255),
                guest_email VARCHAR(255),
                guest_phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 4. Ensure payments table exists
        console.log('Checking payments table...');
        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
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

        console.log('Database repair complete!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

fixDatabase();
