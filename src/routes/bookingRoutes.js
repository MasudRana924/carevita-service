const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const bookingChatController = require('../controllers/bookingChatController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { bookingWriteLimiter, reviewLimiter, safetyLimiter } = require('../middleware/rateLimiter');

router.post('/', authenticate, bookingWriteLimiter, bookingController.createBooking);
router.get('/', authenticate, bookingController.getBookings);
router.get('/:id/live-location', authenticate, bookingController.getLiveLocation);

// USER <-> CAREGIVER chat, open only while SERVICE_IN_PROGRESS
router.get('/:id/chat', authenticate, bookingChatController.getChat);
router.get('/:id/chat/messages', authenticate, bookingChatController.getMessages);
router.post('/:id/chat/messages', authenticate, upload.chatAttachment('file'), bookingChatController.sendMessage);
router.put('/:id/chat/read', authenticate, bookingChatController.markRead);

router.get('/:id', authenticate, bookingController.getBooking);
router.post('/:id/review', authenticate, reviewLimiter, bookingController.submitReview);
router.post('/:id/accept-next-caregiver', authenticate, bookingWriteLimiter, bookingController.acceptNextCaregiver);
router.post('/:id/decline-next-caregiver', authenticate, bookingWriteLimiter, bookingController.declineNextCaregiver);
router.post('/:id/cancel', authenticate, bookingWriteLimiter, bookingController.cancelBooking);
router.post('/:id/dispute', authenticate, bookingWriteLimiter, bookingController.createDispute);
router.get('/:id/disputes', authenticate, bookingController.getBookingDisputes);
router.post('/:id/safety-incident', authenticate, safetyLimiter, bookingController.reportSafetyIncident);

module.exports = router;
