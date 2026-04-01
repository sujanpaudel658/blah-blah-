-- Add cancellation_reason column to bookings table
-- This column tracks why a booking was cancelled (auto-cancelled at noon if pending, manual cancellation, etc)
--
-- Docker example:
--   docker exec -i hotel_db mysql -uroot -proot nepal_stays < database/migrations/005_add_cancellation_reason.sql
--
-- Local example:
--   mysql -u root -p nepal_stays < database/migrations/005_add_cancellation_reason.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Add cancellation_reason column if it doesn't exist
ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;

SET FOREIGN_KEY_CHECKS = 1;
