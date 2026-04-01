-- Fix: Field 'total_price' doesn't have a default value
-- This migration handles the orphaned total_price column in the bookings table
-- Run once against your DB (local MySQL or Docker).
--
-- Docker example:
--   docker exec -i hotel_db mysql -uroot -proot nepal_stays < database/migrations/004_fix_total_price_column.sql
--
-- Local example:
--   mysql -u root -p nepal_stays < database/migrations/004_fix_total_price_column.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Check if total_price column exists and either set default or populate from total_amount
ALTER TABLE bookings
  MODIFY COLUMN total_price DECIMAL(10,2) DEFAULT 0.00;

-- Optional: If you want to populate existing rows with values from total_amount
UPDATE bookings SET total_price = total_amount WHERE total_price IS NULL OR total_price = 0;

SET FOREIGN_KEY_CHECKS = 1;
