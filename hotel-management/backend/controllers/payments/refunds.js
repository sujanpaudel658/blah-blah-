const {
  refundPayment,
  getPendingRefunds,
  confirmRefund,
  rejectRefund
} = require('./payment.core');

module.exports = {
  refundPayment,
  getPendingRefunds,
  confirmRefund,
  rejectRefund
};
