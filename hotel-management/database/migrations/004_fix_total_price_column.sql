

SET FOREIGN_KEY_CHECKS = 0;

-- Check if total_price column exists and either set default or populate from total_amount
ALTER TABLE bookings
  MODIFY COLUMN total_price DECIMAL(10,2) DEFAULT 0.00;

-- Optional
UPDATE bookings SET total_price = total_amount WHERE total_price IS NULL OR total_price = 0;

SET FOREIGN_KEY_CHECKS = 1;
