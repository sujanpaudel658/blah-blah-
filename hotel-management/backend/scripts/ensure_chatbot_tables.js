// Idempotent chatbot tables only (lighter than run_pending_migrations.js).
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME || 'nepal_stays',
        multipleStatements: false
    };

    const conn = await mysql.createConnection(config);
    try {
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
        console.log('OK: chat_sessions');

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
        console.log('OK: chat_messages');

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
        console.log('OK: chat_feedback');
    } finally {
        await conn.end();
    }
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
