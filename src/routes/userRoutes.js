const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/userController');
const inboxController = require('../controllers/inboxController');

router.get('/notifications', authenticate, inboxController.listInbox);
router.get('/notifications/unread-count', authenticate, inboxController.unreadCount);
router.post('/notifications/read-all', authenticate, inboxController.markAllRead);
router.get('/notifications/:id', authenticate, inboxController.getInboxItem);
router.put('/notifications/:id/read', authenticate, inboxController.markRead);

// Account for USER and CAREGIVER: details, profile fields (no photo), photo only
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, userController.updateMe);
router.put('/me/photo', authenticate, upload.profilePhoto('photo'), userController.updateMyPhoto);

router.get('/profile', authenticate, userController.getMyProfile);
router.put('/profile', authenticate, upload.single('profile_photo'), userController.updateMyProfile);
router.post('/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);
router.get('/bookings', authenticate, userController.getMyBookings);

module.exports = router;
