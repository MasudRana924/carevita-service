const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate } = require('../middleware/auth');

router.post('/profile', authenticate, doctorController.createDoctorProfile);
router.get('/profile', authenticate, doctorController.getDoctorProfile);
router.put('/profile', authenticate, doctorController.updateDoctorProfile);
router.get('/search', doctorController.searchDoctors);
router.get('/:id', doctorController.getDoctorById);
router.get('/appointments', authenticate, doctorController.getDoctorAppointments);
router.put('/appointments/:id/status', authenticate, doctorController.updateAppointmentStatus);
router.get('/availability', authenticate, doctorController.getAvailability);

module.exports = router;
