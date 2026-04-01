/**
 * Applies idempotent DB fixes used by this project (safe to run multiple times).
 * Loads backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, optional DB_PORT).
 */
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function ensureColumn(conn, tableName, columnName, alterSql, okLabel) {
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE ?`, [columnName]);
    if (cols.length === 0) {
        await conn.query(alterSql);
        console.log(`OK: ${okLabel}`);
    } else {
        console.log(`Skip: ${okLabel} already present`);
    }
}

async function ensureConstraint(conn, tableName, constraintName, alterSql, okLabel) {
    const [rows] = await conn.query(
        `SELECT CONSTRAINT_NAME
         FROM information_schema.TABLE_CONSTRAINTS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND CONSTRAINT_NAME = ?`,
        [tableName, constraintName]
    );
    if (rows.length === 0) {
        await conn.query(alterSql);
        console.log(`OK: ${okLabel}`);
    } else {
        console.log(`Skip: ${okLabel} already present`);
    }
}

async function main() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME || 'nepal_stays',
        multipleStatements: false
    };

    console.log(`Connecting to MySQL ${config.user}@${config.host}:${config.port}/${config.database} ...`);

    let conn;
    try {
        conn = await mysql.createConnection(config);
    } catch (e) {
        console.error('Connection failed:', e.message);
        process.exit(1);
    }

    try {
        // --- 002: booking_guest_details ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS booking_guest_details (
              booking_id INT NOT NULL PRIMARY KEY,
              guest_name VARCHAR(255),
              guest_email VARCHAR(255),
              guest_phone VARCHAR(20),
              special_requests TEXT,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              CONSTRAINT fk_bgd_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
            )
        `);
        console.log('OK: booking_guest_details table exists');

        // --- 003: users.profile_image ---
        await ensureColumn(
            conn,
            'users',
            'profile_image',
            'ALTER TABLE users ADD COLUMN profile_image VARCHAR(500) NULL AFTER phone',
            'users.profile_image'
        );

        // --- 004: bookings lifecycle metadata ---
        await ensureColumn(
            conn,
            'bookings',
            'confirmed_by',
            'ALTER TABLE bookings ADD COLUMN confirmed_by INT NULL AFTER payment_status',
            'bookings.confirmed_by'
        );
        await ensureColumn(
            conn,
            'bookings',
            'confirmed_at',
            'ALTER TABLE bookings ADD COLUMN confirmed_at TIMESTAMP NULL AFTER confirmed_by',
            'bookings.confirmed_at'
        );
        await ensureColumn(
            conn,
            'bookings',
            'checked_in_at',
            'ALTER TABLE bookings ADD COLUMN checked_in_at TIMESTAMP NULL AFTER confirmed_at',
            'bookings.checked_in_at'
        );
        await ensureColumn(
            conn,
            'bookings',
            'checked_out_at',
            'ALTER TABLE bookings ADD COLUMN checked_out_at TIMESTAMP NULL AFTER checked_in_at',
            'bookings.checked_out_at'
        );
        await ensureColumn(
            conn,
            'bookings',
            'cancelled_by',
            'ALTER TABLE bookings ADD COLUMN cancelled_by INT NULL AFTER cancelled_at',
            'bookings.cancelled_by'
        );

        await ensureConstraint(
            conn,
            'bookings',
            'fk_bookings_confirmed_by',
            `ALTER TABLE bookings
             ADD CONSTRAINT fk_bookings_confirmed_by
             FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL`,
            'bookings.fk_bookings_confirmed_by'
        );
        await ensureConstraint(
            conn,
            'bookings',
            'fk_bookings_cancelled_by',
            `ALTER TABLE bookings
             ADD CONSTRAINT fk_bookings_cancelled_by
             FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL`,
            'bookings.fk_bookings_cancelled_by'
        );

        // --- 005: role-aware notifications ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS notifications (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NULL,
              role ENUM('admin', 'superadmin', 'user') NOT NULL,
              type ENUM('booking', 'payment', 'offer', 'system', 'security', 'loyalty') NOT NULL,
              title VARCHAR(255) NOT NULL,
              message TEXT NOT NULL,
              reference_id INT NULL,
              is_read TINYINT(1) DEFAULT 0,
              priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              INDEX idx_notifications_user_role_read (user_id, role, is_read),
              INDEX idx_notifications_role_created (role, created_at),
              INDEX idx_notifications_type (type)
            )
        `);
        console.log('OK: notifications table exists');

        await ensureColumn(
            conn,
            'notifications',
            'role',
            "ALTER TABLE notifications ADD COLUMN role ENUM('admin', 'superadmin', 'user') NOT NULL DEFAULT 'user' AFTER user_id",
            'notifications.role'
        );
        await ensureColumn(
            conn,
            'notifications',
            'reference_id',
            "ALTER TABLE notifications ADD COLUMN reference_id INT NULL AFTER message",
            'notifications.reference_id'
        );
        await ensureColumn(
            conn,
            'notifications',
            'priority',
            "ALTER TABLE notifications ADD COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium' AFTER is_read",
            'notifications.priority'
        );
        try {
            await conn.query('ALTER TABLE notifications MODIFY COLUMN user_id INT NULL');
            console.log('OK: notifications.user_id nullable');
        } catch (e) {
            console.log(`Skip: notifications.user_id nullable change (${e.message})`);
        }

        // --- 006: offers and mapping ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS offers (
              id INT AUTO_INCREMENT PRIMARY KEY,
              title VARCHAR(255) NOT NULL,
              description TEXT NOT NULL,
              offer_type ENUM('percentage', 'flat', 'seasonal', 'coupon', 'loyalty') NOT NULL,
              discount_type ENUM('percentage', 'flat') NOT NULL,
              discount_value DECIMAL(10,2) NOT NULL,
              coupon_code VARCHAR(64) UNIQUE NULL,
              valid_from DATETIME NOT NULL,
              valid_to DATETIME NOT NULL,
              usage_limit INT NULL,
              applicable_hotels JSON NULL,
              applicable_rooms JSON NULL,
              user_segment ENUM('new', 'frequent', 'inactive', 'all') NOT NULL DEFAULT 'all',
              is_active TINYINT(1) DEFAULT 1,
              created_by INT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              CONSTRAINT fk_offers_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
              INDEX idx_offers_active_dates (is_active, valid_from, valid_to),
              INDEX idx_offers_coupon (coupon_code)
            )
        `);
        console.log('OK: offers table exists');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS user_offers (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NOT NULL,
              offer_id INT NOT NULL,
              is_used TINYINT(1) DEFAULT 0,
              assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              used_at TIMESTAMP NULL,
              UNIQUE KEY uq_user_offer (user_id, offer_id),
              CONSTRAINT fk_user_offers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              CONSTRAINT fk_user_offers_offer FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
              INDEX idx_user_offers_offer_used (offer_id, is_used)
            )
        `);
        console.log('OK: user_offers table exists');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS notification_jobs (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              event_type VARCHAR(100) NOT NULL,
              payload JSON NOT NULL,
              status ENUM('pending', 'processing', 'completed') DEFAULT 'pending',
              attempts INT DEFAULT 0,
              priority INT DEFAULT 5,
              error_message VARCHAR(500) NULL,
              execute_after DATETIME DEFAULT CURRENT_TIMESTAMP,
              processed_at DATETIME NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_jobs_status_execute (status, execute_after),
              INDEX idx_jobs_priority (priority)
            )
        `);
        console.log('OK: notification_jobs table exists');

        // --- 007: chatbot persistence ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              user_id INT NULL,
              session_key VARCHAR(64) NULL,
              source ENUM('guest', 'user', 'admin') DEFAULT 'guest',
              context JSON,
              last_message_at TIMESTAMP NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              CONSTRAINT fk_chat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
              UNIQUE KEY uk_chat_session_key (session_key),
              INDEX idx_chat_sessions_user (user_id)
            )
        `);
        console.log('OK: chat_sessions table exists');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
              id INT AUTO_INCREMENT PRIMARY KEY,
              session_id INT NOT NULL,
              user_id INT NULL,
              role ENUM('user', 'assistant', 'system') NOT NULL,
              message_text LONGTEXT NOT NULL,
              intent VARCHAR(100) NULL,
              metadata JSON,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_chat_messages_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
              CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
              INDEX idx_chat_messages_session (session_id, created_at)
            )
        `);
        console.log('OK: chat_messages table exists');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS chat_feedback (
              id INT AUTO_INCREMENT PRIMARY KEY,
              message_id INT NOT NULL,
              user_id INT NULL,
              rating TINYINT NOT NULL,
              comment TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_chat_feedback_message FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
              CONSTRAINT fk_chat_feedback_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
              UNIQUE KEY uk_chat_feedback_message_user (message_id, user_id),
              INDEX idx_chat_feedback_message (message_id)
            )
        `);
        console.log('OK: chat_feedback table exists');

        // --- 008: status history tables ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS booking_status_history (
              id INT AUTO_INCREMENT PRIMARY KEY,
              booking_id INT NOT NULL,
              from_status VARCHAR(32) NULL,
              to_status VARCHAR(32) NOT NULL,
              changed_by INT NULL,
              reason TEXT,
              changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
              CONSTRAINT fk_booking_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
              INDEX idx_booking_history_booking (booking_id, changed_at)
            )
        `);
        console.log('OK: booking_status_history table exists');

        await conn.query(`
            CREATE TABLE IF NOT EXISTS room_status_history (
              id INT AUTO_INCREMENT PRIMARY KEY,
              room_id INT NOT NULL,
              from_status VARCHAR(32) NULL,
              to_status VARCHAR(32) NOT NULL,
              source VARCHAR(64) NULL,
              reference_type VARCHAR(32) NULL,
              reference_id INT NULL,
              changed_by INT NULL,
              notes TEXT,
              changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_room_history_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
              CONSTRAINT fk_room_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
              INDEX idx_room_history_room (room_id, changed_at)
            )
        `);
        console.log('OK: room_status_history table exists');

        // --- 009: payout transaction ledger ---
        await conn.query(`
            CREATE TABLE IF NOT EXISTS hotel_payout_transactions (
              id INT AUTO_INCREMENT PRIMARY KEY,
              payout_request_id INT NULL,
              hotel_id INT NOT NULL,
              amount DECIMAL(10,2) NOT NULL,
              transaction_reference VARCHAR(128) NULL,
              status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'completed',
              processed_by INT NULL,
              processed_at TIMESTAMP NULL,
              notes TEXT,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT fk_payout_tx_request FOREIGN KEY (payout_request_id) REFERENCES hotel_payout_requests(id) ON DELETE SET NULL,
              CONSTRAINT fk_payout_tx_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
              CONSTRAINT fk_payout_tx_user FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
              INDEX idx_payout_tx_hotel (hotel_id, created_at),
              INDEX idx_payout_tx_request (payout_request_id)
            )
        `);
        console.log('OK: hotel_payout_transactions table exists');

        console.log('Migrations check finished.');
    } catch (e) {
        console.error('Migration error:', e.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

main();
