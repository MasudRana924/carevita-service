/**
 * Admin controllers split by domain; this facade keeps require('../controllers/adminController') working.
 */
module.exports = {
  ...require('./adminDashboardController'),
  ...require('./adminUserController'),
  ...require('./adminCaregiverController'),
  ...require('./adminHospitalController')
};
