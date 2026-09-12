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

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareMate API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
