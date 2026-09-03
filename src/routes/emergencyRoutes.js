const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, emergencyController.createEmergency);
router.get('/', authenticate, emergencyController.getEmergencies);
router.get('/:id', authenticate, emergencyController.getEmergency);
router.put('/:id', authenticate, emergencyController.updateEmergency);
router.put('/:id/resolve', authenticate, emergencyController.resolveEmergency);

module.exports = router;
