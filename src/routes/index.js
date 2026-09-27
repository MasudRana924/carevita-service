const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const familyMemberRoutes = require('./familyMemberRoutes');
const caregiverRoutes = require('./caregiverRoutes');
const bookingRoutes = require('./bookingRoutes');
const adminRoutes = require('./adminRoutes');
const hospitalRoutes = require('./hospitalRoutes');
const inboxRoutes = require('./inboxRoutes');
const notificationTokenRoutes = require('./notificationTokenRoutes');
const paymentRoutes = require('./paymentRoutes');
const ekycRoutes = require('./ekycRoutes');
const privacyPolicyRoutes = require('./privacyPolicyRoutes');
const conversationRoutes = require('./conversationRoutes');
const adminConversationRoutes = require('./adminConversationRoutes');
const healthRoutes = require('./healthRoutes');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/family-members', familyMemberRoutes);
router.use('/caregiver', caregiverRoutes);
router.use('/bookings', bookingRoutes);
router.use('/admin', adminRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/inbox', inboxRoutes);
router.use('/notifications', notificationTokenRoutes);
router.use('/payments', paymentRoutes);
router.use('/ekyc', ekycRoutes);
router.use('/privacy-policies', privacyPolicyRoutes);
router.use('/conversations', conversationRoutes);
router.use('/admin/conversations', adminConversationRoutes);
router.use('/health', healthRoutes);

module.exports = router;
