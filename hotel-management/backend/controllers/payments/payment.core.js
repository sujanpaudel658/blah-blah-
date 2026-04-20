module.exports = {
  ...require('./payment.initiate'),
  ...require('./payment.verify'),
  ...require('./payment.operations'),
  ...require('./payment.stayqr'),
  ...require('./payment.payouts')
};
