-- Speeds up chatbot and listing queries that compute MIN(base_price) per hotel.
-- Keep migration idempotent by creating the index only if missing.
SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'room_types'
    AND INDEX_NAME = 'idx_room_types_hotel_price'
);
SET @sql := IF(
  @idx_exists = 0,
  'ALTER TABLE room_types ADD INDEX idx_room_types_hotel_price (hotel_id, base_price)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
