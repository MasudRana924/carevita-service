const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate } = require('../middleware/auth');

router.get('/search', medicineController.searchMedicines);
router.post('/orders', authenticate, medicineController.createMedicineOrder);
router.get('/orders', authenticate, medicineController.getMedicineOrders);
router.get('/orders/:id', authenticate, medicineController.getMedicineOrder);
router.delete('/orders/:id', authenticate, medicineController.cancelMedicineOrder);

module.exports = router;
