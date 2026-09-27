const { BookingRepository, CaregiverProfileRepository } = require('../../repositories');
const { STATUSES, assertTransition } = require('../bookingJourney');
const { evaluateCancellation } = require('../cancellationPolicy');
const { processBookingRefund } = require('../refundService');
const { notifyUser } = require('../pushNotificationService');
const { writeAudit } = require('../../utils/audit');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');

/**
 * Booking Cancellation Service
 * Handles booking cancellation logic
 */
class BookingCancellationService {
  /**
   * Cancel a booking
   */
  async cancelBooking(booking, user, reason) {
    const caregiver = await CaregiverProfileRepository.findById(booking.provider_id);
    const asProvider = caregiver && caregiver.user_id === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (booking.user_id !== user.id && !asProvider && !isAdmin) {
      throw new ForbiddenError('Access denied');
    }

    const policy = evaluateCancellation(booking, { byAdmin: isAdmin });
    if (!policy.canCancel) {
      throw new BadRequestError(policy.message || 'Cannot cancel this booking');
    }

    if (asProvider && !isAdmin && ['PAYMENT_PAID', 'SERVICE_IN_PROGRESS'].includes(booking.status)) {
      throw new BadRequestError('Paid bookings can only be cancelled by the user or admin');
    }

    const cancelStatus = isAdmin
      ? STATUSES.CANCELLED_BY_ADMIN
      : (booking.user_id === user.id ? STATUSES.CANCELLED_BY_USER : STATUSES.CANCELLED_BY_PROVIDER);

    assertTransition(booking.status, cancelStatus);
    const oldStatus = booking.status;
    const updated = await BookingRepository.cancelBooking(booking.id, cancelStatus, reason);
    await BookingRepository.addStatusHistory(booking.id, oldStatus, cancelStatus, user.id, reason);

    let refund = { skipped: true };
    if (policy.refundAmount > 0) {
      try {
        refund = await processBookingRefund(booking, {
          refundAmount: policy.refundAmount,
          reason: reason || 'Booking cancelled'
        });
      } catch (refundErr) {
        console.error('Cancel refund failed:', refundErr.message);
        refund = { skipped: false, failed: true, message: refundErr.message };
      }
    }

    await writeAudit({
      actorId: user.id,
      action: 'BOOKING_CANCELLED',
      entityType: 'booking',
      entityId: booking.id,
      meta: { status: cancelStatus, policy, refund_skipped: refund.skipped }
    });

    // Notify the other party
    const notifyTarget = booking.user_id === user.id
      ? caregiver?.user_id
      : booking.user_id;

    if (notifyTarget) {
      await this._notifyParty(notifyTarget, booking);
    }

    return { updated, policy, refund };
  }

  /**
   * Reject a booking (by caregiver)
   */
  async rejectBooking(bookingId, userId, reason) {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found', 'NOT_FOUND');
    }

    const caregiver = await CaregiverProfileRepository.findByUserId(userId);
    if (!caregiver || booking.provider_id !== caregiver.id) {
      throw new ForbiddenError('Access denied — this booking is not assigned to you');
    }

    if (![STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED, STATUSES.PROVIDER_ACCEPTED].includes(booking.status)) {
      throw new BadRequestError('Booking cannot be rejected in current status');
    }

    const rejectReason = reason || 'No reason provided';
    await BookingRepository.addRejection(booking.id, booking.provider_id, rejectReason);

    const { reassignOrSearch } = require('../bookingAssignment');
    const result = await reassignOrSearch(
      booking,
      userId,
      `Provider rejected: ${rejectReason}`
    );

    if (result.next) {
      await this._notifyCaregiver(result.next.user_id, booking);
      await this._notifyUser(booking.user_id, booking, 'BOOKING_REASSIGNED', 'Caregiver changed', `Your booking ${booking.booking_number} was reassigned to another caregiver.`);

      return {
        booking: { ...result.booking, reassigned: true, searching: false },
        message: 'Booking reassigned to another caregiver'
      };
    }

    await this._notifyUser(booking.user_id, booking, 'BOOKING_REJECTED', 'Looking for another caregiver', `The previous caregiver declined ${booking.booking_number}. We are searching for another caregiver.`, { reason: rejectReason });

    return {
      booking: { ...result.booking, reassigned: false, searching: true },
      message: 'Caregiver declined. Searching for another caregiver'
    };
  }

  /**
   * Notify user about cancellation/rejection
   */
  async _notifyUser(userId, booking, type, title, body, extraData = {}) {
    try {
      await notifyUser({
        userId,
        title,
        body,
        type,
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          screen: 'inbox',
          ...extraData
        }
      });
    } catch (err) {
      console.error('Notify user failed:', err.message);
    }
  }

  /**
   * Notify caregiver about cancellation/rejection
   */
  async _notifyCaregiver(userId, booking) {
    try {
      await notifyUser({
        userId,
        title: 'New Booking Request',
        body: `You have a new booking ${booking.booking_number}. Tap to view details.`,
        type: 'BOOKING_CREATED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          screen: 'inbox'
        }
      });
    } catch (err) {
      console.error('Notify caregiver failed:', err.message);
    }
  }

  /**
   * Notify party about cancellation
   */
  async _notifyParty(userId, booking) {
    try {
      await notifyUser({
        userId,
        title: 'Booking Cancelled',
        body: `Booking ${booking.booking_number} was cancelled.`,
        type: 'BOOKING_CANCELLED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: { screen: 'inbox' }
      });
    } catch (err) {
      console.error('Cancel notify failed:', err.message);
    }
  }
}

module.exports = new BookingCancellationService();
