const express = require('express');
const router = express.Router();
const providerServiceController = require('../controllers/providerServiceController');
const { authenticate, authorize } = require('../middleware/auth');

// Provider service management
router.post('/services', authenticate, authorize(['CAREGIVER', 'NURSE']), providerServiceController.addService);
router.get('/services', authenticate, authorize(['CAREGIVER', 'NURSE']), providerServiceController.getServices);
router.patch('/services/:id', authenticate, authorize(['CAREGIVER', 'NURSE']), providerServiceController.updateService);
router.delete('/services/:id', authenticate, authorize(['CAREGIVER', 'NURSE']), providerServiceController.removeService);

module.exports = router;
