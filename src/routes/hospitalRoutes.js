const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Public hospital list for users
router.get('/', serviceController.listHospitals);
router.get('/:id', serviceController.getHospital);

module.exports = router;
