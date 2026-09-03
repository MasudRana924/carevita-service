const User = require('../models/User');
const Booking = require('../models/Booking');
const HelpingHand = require('../models/HelpingHand');
const Nurse = require('../models/Nurse');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const SupportTicket = require('../models/SupportTicket');
const Payment = require('../models/Payment');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.findAll({ limit: 1 });
    const totalBookings = await Booking.findAll({ limit: 1 });
    const activeBookings = await Booking.getActiveBookings();
    const todayBookings = await Booking.getTodayBookings();
    const totalHelpingHands = await HelpingHand.findAll({ limit: 1 });
    const totalNurses = await Nurse.findAll({ limit: 1 });
    const totalDoctors = await Doctor.findAll({ limit: 1 });
    const openTickets = await SupportTicket.findAll({ status: 'open', limit: 1 });
    const ticketStats = await SupportTicket.getTicketStats();

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: totalUsers.length,
        totalBookings: totalBookings.length,
        activeBookings: activeBookings.length,
        todayBookings: todayBookings.length,
        totalHelpingHands: totalHelpingHands.length,
        totalNurses: totalNurses.length,
        totalDoctors: totalDoctors.length,
        openTickets: openTickets.length,
        ticketStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, status, limit, offset } = req.query;

    const users = await User.findAll({
      role,
      status,
      limit: limit || 50,
      offset: offset || 0
    });

    res.status(200).json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await User.updateStatus(id, status);

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const { status, provider_type, date_from, date_to, limit, offset } = req.query;

    const bookings = await Booking.findAll({
      status,
      provider_type,
      date_from,
      date_to,
      limit: limit || 50,
      offset: offset || 0
    });

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings'
    });
  }
};

exports.getAllProviders = async (req, res) => {
  try {
    const { provider_type, limit, offset } = req.query;

    let providers = [];
    if (provider_type === 'helping_hand') {
      providers = await HelpingHand.findAll({ limit, offset });
    } else if (provider_type === 'nurse') {
      providers = await Nurse.findAll({ limit, offset });
    } else if (provider_type === 'doctor') {
      providers = await Doctor.findAll({ limit, offset });
    }

    res.status(200).json({
      success: true,
      providers
    });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch providers'
    });
  }
};

exports.verifyProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { provider_type, verification_data } = req.body;

    if (provider_type === 'helping_hand') {
      await HelpingHand.updateVerification(id, verification_data);
    } else if (provider_type === 'nurse') {
      await Nurse.updateVerification(id, verification_data);
    } else if (provider_type === 'doctor') {
      await Doctor.updateVerification(id, verification_data.is_verified);
    }

    res.status(200).json({
      success: true,
      message: 'Provider verification updated successfully'
    });
  } catch (error) {
    console.error('Verify provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify provider'
    });
  }
};

exports.getAllSupportTickets = async (req, res) => {
  try {
    const { status, category, priority, assigned_to, limit, offset } = req.query;

    const tickets = await SupportTicket.findAll({
      status,
      category,
      priority,
      assigned_to,
      limit: limit || 50,
      offset: offset || 0
    });

    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch support tickets'
    });
  }
};

exports.assignSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const ticket = await SupportTicket.assign(id, assigned_to);

    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign ticket'
    });
  }
};

exports.resolveSupportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const ticket = await SupportTicket.resolve(id, resolution);

    res.status(200).json({
      success: true,
      message: 'Ticket resolved successfully',
      ticket
    });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve ticket'
    });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const { status, payment_method, date_from, date_to, limit, offset } = req.query;

    const payments = await Payment.findAll({
      status,
      payment_method,
      date_from,
      date_to,
      limit: limit || 50,
      offset: offset || 0
    });

    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
};

exports.getAllHospitals = async (req, res) => {
  try {
    const { city, district, type, limit, offset } = req.query;

    const hospitals = await Hospital.findAll({
      city,
      district,
      type,
      limit: limit || 50,
      offset: offset || 0
    });

    res.status(200).json({
      success: true,
      hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospitals'
    });
  }
};

exports.verifyHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;

    const hospital = await Hospital.updateVerification(id, is_verified);

    res.status(200).json({
      success: true,
      message: 'Hospital verification updated successfully',
      hospital
    });
  } catch (error) {
    console.error('Verify hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify hospital'
    });
  }
};
