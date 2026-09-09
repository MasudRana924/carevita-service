const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const familyMemberRoutes = require('./familyMemberRoutes');
const caregiverRoutes = require('./caregiverRoutes');
const nurseRoutes = require('./nurseRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const serviceRoutes = require('./serviceRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const ekycRoutes = require('./ekycRoutes');
const medicineRoutes = require('./medicineRoutes');
const providerServiceRoutes = require('./providerServiceRoutes');
const providerPaymentAccountRoutes = require('./providerPaymentAccountRoutes');
const withdrawalRoutes = require('./withdrawalRoutes');
const disputeRoutes = require('./disputeRoutes');
const notificationTokenRoutes = require('./notificationTokenRoutes');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/family-members', familyMemberRoutes);
router.use('/caregiver', caregiverRoutes);
router.use('/nurse', nurseRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/services', serviceRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ekyc', ekycRoutes);
router.use('/medicines', medicineRoutes);
router.use('/caregiver', providerServiceRoutes);
router.use('/nurse', providerServiceRoutes);
router.use('/caregiver', providerPaymentAccountRoutes);
router.use('/nurse', providerPaymentAccountRoutes);
router.use('/caregiver', withdrawalRoutes);
router.use('/nurse', withdrawalRoutes);
router.use('/bookings', disputeRoutes);
router.use('/notifications', notificationTokenRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareBridge API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
