

SET FOREIGN_KEY_CHECKS = 0;

-- Add cancellation_reason column if it doesn't exist
ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;

SET FOREIGN_KEY_CHECKS = 1;
