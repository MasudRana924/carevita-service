const express = require('express');
const router = express.Router();
const medicationController = require('../controllers/medicationController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, medicationController.createMedication);
router.get('/', authenticate, medicationController.getMedications);
router.get('/:id', authenticate, medicationController.getMedication);
router.put('/:id', authenticate, medicationController.updateMedication);
router.delete('/:id', authenticate, medicationController.deleteMedication);

module.exports = router;
