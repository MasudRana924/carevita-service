const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/userController');

router.get('/profile', authenticate, userController.getMyProfile);
router.put('/profile', authenticate, upload.single('profile_photo'), userController.updateMyProfile);
router.post('/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);
router.get('/bookings', authenticate, userController.getMyBookings);
router.get('/payments', authenticate, userController.getMyPayments);
router.get('/notifications', authenticate, userController.getMyNotifications);
router.post('/notifications/read-all', authenticate, userController.markNotificationsReadAll);

module.exports = router;
