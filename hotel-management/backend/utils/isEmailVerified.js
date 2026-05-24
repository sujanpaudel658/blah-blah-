/**
 * Lifetime email verification check (database only — independent of port, host, or JWT age).
 * Source of truth: email_verified_at (set once, never cleared by app code).
 * Fallback: is_verified for legacy rows before migration 008.
 */
function isEmailVerified(userOrValue) {
  if (userOrValue && typeof userOrValue === 'object' && !Buffer.isBuffer(userOrValue)) {
    if (userOrValue.email_verified_at) {
      return true;
    }
    return isEmailVerified(userOrValue.is_verified);
  }

  const value = userOrValue;
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (Buffer.isBuffer(value)) {
    return value.length > 0 && value[0] === 1;
  }
  if (typeof value === 'bigint') {
    return value === 1n;
  }
  return false;
}

module.exports = { isEmailVerified };
