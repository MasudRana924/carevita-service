const { BookingRepository, CaregiverProfileRepository } = require('../../repositories');
const Dispute = require('../../models/Dispute');
const { notifyUser } = require('../pushNotificationService');
const { writeAudit } = require('../../utils/audit');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../../utils/errors');

/**
 * Booking Dispute Service
 * Handles dispute creation and management
 */
class BookingDisputeService {
  /**
   * Create a dispute for a booking
   */
  async createDispute(bookingId, user, { reason, details }) {
    if (!reason) {
      throw new BadRequestError('reason is required');
    }

    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found', 'NOT_FOUND');
    }

    const caregiver = await CaregiverProfileRepository.findById(booking.provider_id);
    const asProvider = caregiver && caregiver.user_id === user.id;

    if (booking.user_id !== user.id && !asProvider) {
      throw new ForbiddenError('Access denied');
    }

    if (!['PAYMENT_PAID', 'SERVICE_IN_PROGRESS', 'SERVICE_COMPLETED'].includes(booking.status)) {
      throw new BadRequestError('Dispute is allowed only after payment');
    }

    const existing = await Dispute.findOpenByBookingId(booking.id);
    if (existing) {
      throw new ConflictError('An open dispute already exists for this booking', 'CONFLICT');
    }

    const dispute = await Dispute.createDispute({
      bookingId: booking.id,
      raisedBy: user.id,
      role: asProvider ? 'CAREGIVER' : 'USER',
      reason,
      details
    });

    await writeAudit({
      actorId: user.id,
      action: 'DISPUTE_CREATED',
      entityType: 'dispute',
      entityId: dispute.id,
      meta: { booking_id: booking.id, reason }
    });

    // Notify the other party
    const notifyTarget = asProvider
      ? booking.user_id
      : caregiver?.user_id;

    if (notifyTarget) {
      await this._notifyParty(notifyTarget, booking, dispute.id);
    }

    return dispute;
  }

  /**
   * Notify party about new dispute
   */
  async _notifyParty(userId, booking, disputeId) {
    try {
      await notifyUser({
        userId,
        title: 'New dispute',
        body: `A dispute was opened for booking ${booking.booking_number}.`,
        type: 'DISPUTE_UPDATED',
        bookingId: booking.id,
        referenceId: disputeId,
        referenceType: 'dispute',
        extraData: { screen: 'inbox' }
      });
    } catch (err) {
      console.error('Dispute notify failed:', err.message);
    }
  }
}

module.exports = new BookingDisputeService();
