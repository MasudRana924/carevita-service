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

router.get('/health', (req, res) => {
  res.success({ status: 'ok' }, 'CareMate API is running');
});

router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

router.get('/health/ready', async (req, res) => {
  try {
    const pool = require('../config/database');
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      database: 'error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
