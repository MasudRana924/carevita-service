const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const familyRoutes = require('./familyRoutes');
const helpingHandRoutes = require('./helpingHandRoutes');
const nurseRoutes = require('./nurseRoutes');
const doctorRoutes = require('./doctorRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const bookingRoutes = require('./bookingRoutes');
const medicineRoutes = require('./medicineRoutes');
const diagnosticRoutes = require('./diagnosticRoutes');
const ambulanceRoutes = require('./ambulanceRoutes');
const medicalRecordRoutes = require('./medicalRecordRoutes');
const medicationRoutes = require('./medicationRoutes');
const emergencyRoutes = require('./emergencyRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const supportRoutes = require('./supportRoutes');
const paymentRoutes = require('./paymentRoutes');
const walletRoutes = require('./walletRoutes');
const adminRoutes = require('./adminRoutes');
const hospitalRoutes = require('./hospitalRoutes');

router.use('/auth', authRoutes);
router.use('/family', familyRoutes);
router.use('/helping-hand', helpingHandRoutes);
router.use('/nurse', nurseRoutes);
router.use('/doctor', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/bookings', bookingRoutes);
router.use('/medicines', medicineRoutes);
router.use('/diagnostics', diagnosticRoutes);
router.use('/ambulance', ambulanceRoutes);
router.use('/medical-records', medicalRecordRoutes);
router.use('/medications', medicationRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/support', supportRoutes);
router.use('/payments', paymentRoutes);
router.use('/wallet', walletRoutes);
router.use('/admin', adminRoutes);
router.use('/hospitals', hospitalRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CareMate API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
