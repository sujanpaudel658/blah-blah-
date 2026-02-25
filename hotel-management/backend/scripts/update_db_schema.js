const db = require('../config/db');

async function updateSchema() {
    try {
        console.log('Updating database schema...');

        // Add status column to hotels table
        try {
            await db.query(`
        ALTER TABLE hotels 
        ADD COLUMN status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        ADD COLUMN owner_id INT NULL,
        ADD INDEX idx_status (status),
        ADD CONSTRAINT fk_hotels_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
      `);
            console.log('Added status and owner_id columns to hotels table.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Columns likely already exist in hotels table.');
            } else {
                console.error('Error altering hotels table:', err);
            }
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
}

updateSchema();
