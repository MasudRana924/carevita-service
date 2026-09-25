const bookingValidator = require('./bookingValidator');
const authValidator = require('./authValidator');
const caregiverValidator = require('./caregiverValidator');

module.exports = {
  ...bookingValidator,
  ...authValidator,
  ...caregiverValidator
};
