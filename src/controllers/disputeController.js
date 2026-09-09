const { createDispute, getDisputeById, getDisputeByBookingId, updateDispute, getAllDisputes } = require('../models/Dispute');
const { findById: findBooking } = require('../models/Booking');

/**
 * Create dispute for a booking
 */
exports.createDispute = async (req, res) => {
  try {
    const { booking_id, dispute_type, description } = req.body;
    const userId = req.user.id;

    // Check if booking exists and user is authorized
    const booking = await findBooking(booking_id);
    if (!booking) {
      return res.notFound('Booking not found');
    }

    // Only booking owner can create dispute
    if (booking.user_id !== userId && req.user.role !== 'ADMIN') {
      return res.forbidden('Access denied');
    }

    // Check if dispute already exists
    const existingDispute = await getDisputeByBookingId(booking_id);
    if (existingDispute) {
      return res.badRequest('Dispute already exists for this booking');
    }

    const dispute = await createDispute({
      booking_id,
      raised_by: userId,
      dispute_type,
      description
    });

    res.success(dispute, 'Dispute created successfully');
  } catch (error) {
    console.error('Create dispute error:', error);
    res.serverError('Failed to create dispute');
  }
};

/**
 * Get dispute by ID
 */
exports.getDispute = async (req, res) => {
  try {
    const { id } = req.params;

    const dispute = await getDisputeById(id);
    if (!dispute) {
      return res.notFound('Dispute not found');
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && dispute.raised_by !== req.user.id) {
      return res.forbidden('Access denied');
    }

    res.success(dispute);
  } catch (error) {
    console.error('Get dispute error:', error);
    res.serverError('Failed to get dispute');
  }
};

/**
 * Get dispute by booking ID
 */
exports.getBookingDispute = async (req, res) => {
  try {
    const { booking_id } = req.params;

    const booking = await findBooking(booking_id);
    if (!booking) {
      return res.notFound('Booking not found');
    }

    // Check authorization
    if (req.user.role !== 'ADMIN' && booking.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const dispute = await getDisputeByBookingId(booking_id);
    if (!dispute) {
      return res.notFound('No dispute found for this booking');
    }

    res.success(dispute);
  } catch (error) {
    console.error('Get booking dispute error:', error);
    res.serverError('Failed to get dispute');
  }
};

/**
 * Admin: Get all disputes
 */
exports.getAllDisputes = async (req, res) => {
  try {
    const { status, dispute_type, page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const disputes = await getAllDisputes({
      status,
      dispute_type,
      limit,
      offset
    });

    res.success(disputes);
  } catch (error) {
    console.error('Get all disputes error:', error);
    res.serverError('Failed to get disputes');
  }
};

/**
 * Admin: Update dispute (resolve/reject)
 */
exports.updateDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, resolution_type, refund_amount } = req.body;

    if (req.user.role !== 'ADMIN') {
      return res.forbidden('Access denied');
    }

    const dispute = await updateDispute(id, {
      status,
      resolution,
      resolution_type,
      refund_amount,
      resolved_by: req.user.id
    });

    if (!dispute) {
      return res.notFound('Dispute not found');
    }

    // If resolved with refund, trigger refund logic here
    if (status === 'RESOLVED' && refund_amount && refund_amount > 0) {
      // TODO: Implement refund logic through payment service
      console.log(`Refund of ${refund_amount} to be processed for dispute ${id}`);
    }

    res.success(dispute, 'Dispute updated successfully');
  } catch (error) {
    console.error('Update dispute error:', error);
    res.serverError('Failed to update dispute');
  }
};
