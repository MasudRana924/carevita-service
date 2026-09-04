const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { authenticate } = require('../middleware/auth');

router.get('/services', authenticate, serviceController.listServices);
router.get('/services/:id', authenticate, serviceController.getService);
router.get('/hospitals', authenticate, serviceController.listHospitals);
router.get('/hospitals/:id', authenticate, serviceController.getHospital);
router.get('/hospitals/:id/availability', authenticate, serviceController.getHospitalAvailability);

module.exports = router;
