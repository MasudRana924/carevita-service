const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, reviewController.createReview);
router.get('/provider', reviewController.getProviderReviews);
router.get('/', authenticate, reviewController.getUserReviews);
router.put('/:id', authenticate, reviewController.updateReview);

module.exports = router;
