const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const nurseController = require('../controllers/nurseController');

router.post('/profile', authenticate, authorize(['NURSE']), nurseController.createProfile);
router.get('/profile', authenticate, authorize(['NURSE']), nurseController.getMyProfile);
router.put('/profile', authenticate, authorize(['NURSE']), nurseController.updateMyProfile);
router.post('/documents', authenticate, authorize(['NURSE']), nurseController.submitDocument);
router.get('/availability', authenticate, authorize(['NURSE']), nurseController.getMyAvailability);
router.post('/availability', authenticate, authorize(['NURSE']), nurseController.setMyAvailability);
router.get('/search', authenticate, nurseController.searchNurses);
router.get('/:id', authenticate, nurseController.viewNurseProfile);
router.get('/bookings/my', authenticate, authorize(['NURSE']), nurseController.getMyBookings);
router.get('/earnings/my', authenticate, authorize(['NURSE']), nurseController.getMyEarnings);
router.get('/reviews/my', authenticate, authorize(['NURSE']), nurseController.getMyReviews);

module.exports = router;
