const express = require('express');
const router = express.Router();
const ekycController = require('../controllers/ekycController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/initiate', authenticate, authorize('CAREGIVER'), ekycController.initiate);
router.get('/status', authenticate, authorize('CAREGIVER'), ekycController.getStatus);
router.post('/webhook', ekycController.webhook);

module.exports = router;
