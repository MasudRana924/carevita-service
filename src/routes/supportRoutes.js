const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, supportController.createSupportTicket);
router.get('/', authenticate, supportController.getSupportTickets);
router.get('/:id', authenticate, supportController.getSupportTicket);
router.put('/:id', authenticate, supportController.updateSupportTicket);

module.exports = router;
