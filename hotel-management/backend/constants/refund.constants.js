// Keep in sync with frontend superadmin refund UI.
const REFUND_REJECTION_CATEGORIES = Object.freeze([
  'Cancellation Policy Violation',
  'No-Show Cases',
  'Already Consumed Service',
  'Invalid or Duplicate Request',
  'Payment Issues',
  'Fraud or Policy Abuse Suspicion',
  'Special Rate Restrictions',
  'Missing Required Information'
]);

module.exports = {
  REFUND_REJECTION_CATEGORIES
};
