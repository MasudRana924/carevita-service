const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.get('/provider', authenticate, reviewController.getProviderReviews);
router.get('/', authenticate, reviewController.getUserReviews);
router.put('/:id', authenticate, reviewController.updateReview);

module.exports = router;
