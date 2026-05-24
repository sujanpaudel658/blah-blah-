-- Permanent email verification timestamp (never cleared after first verify).
ALTER TABLE users
  ADD COLUMN email_verified_at DATETIME NULL AFTER is_verified;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, updated_at, created_at, NOW())
WHERE is_verified = 1 AND email_verified_at IS NULL;
