const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, walletController.getCustomerWallet);
router.post('/add-funds', authenticate, walletController.addFunds);
router.get('/transactions', authenticate, walletController.getWalletTransactions);

module.exports = router;
