/**
 * Booking data layer — split by concern, re-exported for existing requires.
 */
module.exports = {
  ...require('./booking/queries'),
  ...require('./booking/status'),
  ...require('./booking/overlap'),
  ...require('./booking/settlement')
};
