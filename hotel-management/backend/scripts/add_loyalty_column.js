/**
 * Migration: Add loyalty_free_night column to bookings table
 * 
 * Run this script once to add the loyalty tracking column:
 *   node scripts/add_loyalty_column.js
 */
const db = require('../config/db');

(async () => {
    try {
        // Add loyalty_free_night column (0 = normal booking, 1 = free night was applied)
        await db.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS loyalty_free_night TINYINT(1) DEFAULT 0
        `);
        console.log('✓ loyalty_free_night column added to bookings table');

        // Add loyalty_discount column to track the discount amount applied
        await db.query(`
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS loyalty_discount DECIMAL(10,2) DEFAULT 0.00
        `);
        console.log('✓ loyalty_discount column added to bookings table');

        console.log('\n✅ Loyalty program migration completed successfully!');
    } catch (error) {
        if (error.message.includes('Duplicate column')) {
            console.log('⚠ Columns already exist. Migration skipped.');
        } else {
            console.error('❌ Migration failed:', error.message);
        }
    } finally {
        process.exit();
    }
})();
