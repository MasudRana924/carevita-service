const { BookingRepository, CaregiverProfileRepository } = require('../../repositories');
const { STATUSES, assertTransition } = require('../bookingJourney');
const { assertCaregiverFree } = require('../bookingAssignment');
const { notifyUser } = require('../pushNotificationService');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../../utils/errors');
const { writeAudit } = require('../../utils/audit');
const liveTrackingService = require('../liveTrackingService');
const { emitLocation, emitTrackingEnded } = require('../../realtime/socket');

/**
 * Booking Status Service
 * Handles booking status transitions
 */
class BookingStatusService {
  /**
   * Accept a booking (by caregiver)
   */
  async acceptBooking(bookingId, userId) {
    const caregiver = await CaregiverProfileRepository.findByUserId(userId);
    if (!caregiver) {
      throw new NotFoundError('Caregiver profile not found', 'NOT_FOUND');
    }

    const client = await pool.connect();
    let updated;
    let oldStatus;
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
        [bookingId]
      );
      const booking = locked.rows[0];
      if (!booking) {
        throw new NotFoundError('Booking not found', 'NOT_FOUND');
      }

      if (booking.provider_type !== 'CAREGIVER' || booking.provider_id !== caregiver.id) {
        throw new ForbiddenError('Access denied — this booking is not assigned to you');
      }

      if (![STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED].includes(booking.status)) {
        throw new BadRequestError('Booking cannot be accepted in current status');
      }

      await assertCaregiverFree(caregiver, booking, { excludeBookingId: booking.id });
      assertTransition(booking.status, STATUSES.PROVIDER_ACCEPTED);
      oldStatus = booking.status;

      const result = await client.query(
        `
        UPDATE bookings
        SET status = $1,
            offer_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND status = ANY($3::text[])
          AND provider_id = $4
        RETURNING *
        `,
        [
          STATUSES.PROVIDER_ACCEPTED,
          booking.id,
          [STATUSES.SEARCHING_PROVIDER, STATUSES.PROVIDER_ASSIGNED],
          caregiver.id
        ]
      );
      updated = result.rows[0];
      if (!updated) {
        throw new ConflictError('Booking was reassigned or already accepted', 'CONFLICT');
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await BookingRepository.addStatusHistory(
      updated.id,
      oldStatus,
      STATUSES.PROVIDER_ACCEPTED,
      userId,
      'Provider accepted booking'
    );

    await this._notifyUser(updated.user_id, updated, 'BOOKING_ACCEPTED', 'Booking Accepted', `Your booking ${updated.booking_number} was accepted. Tap to view details.`);

    return updated;
  }

  /**
   * Start service (by caregiver)
   */
  async startBooking(bookingId, userId, location = {}) {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found', 'NOT_FOUND');
    }

    const caregiver = await CaregiverProfileRepository.findByUserId(userId);
    if (!caregiver || booking.provider_id !== caregiver.id) {
      throw new ForbiddenError('Access denied — this booking is not assigned to you');
    }

    if (booking.status !== 'PAYMENT_PAID') {
      throw new BadRequestError('Service can only be started after the user has paid');
    }

    const latitude = location.latitude ?? location.lat;
    const longitude = location.longitude ?? location.lng ?? location.long;
    if (latitude == null || longitude == null || latitude === '' || longitude === '') {
      throw new BadRequestError('latitude and longitude are required to start service (for live tracking)');
    }

    assertTransition(booking.status, STATUSES.SERVICE_IN_PROGRESS);
    const oldStatus = booking.status;
    await BookingRepository.startService(bookingId);
    await BookingRepository.addStatusHistory(
      booking.id,
      oldStatus,
      'SERVICE_IN_PROGRESS',
      userId,
      'Caregiver started service',
      Number(latitude),
      Number(longitude)
    );

    let liveLocation = null;
    try {
      liveLocation = await liveTrackingService.publishLocation(booking.id, userId, {
        latitude,
        longitude,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed
      });
      emitLocation(booking.id, liveLocation);
    } catch (locErr) {
      console.error('Initial live location save failed:', locErr.message);
    }

    await this._notifyUser(booking.user_id, booking, 'SERVICE_STARTED', 'Service Started', `Caregiver started booking ${booking.booking_number}. Live tracking is available.`, {
      action: 'OPEN_LIVE_TRACKING',
      screen: 'live_tracking',
      live_tracking: 'true'
    });

    return { ...booking, live_location: liveLocation };
  }

  /**
   * Complete service (by caregiver)
   */
  async completeBooking(bookingId, userId) {
    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found', 'NOT_FOUND');
    }

    const caregiver = await CaregiverProfileRepository.findByUserId(userId);
    if (!caregiver || booking.provider_id !== caregiver.id) {
      throw new ForbiddenError('Access denied — this booking is not assigned to you');
    }

    if (booking.status !== 'SERVICE_IN_PROGRESS') {
      throw new BadRequestError('Service can only be completed after it has started');
    }

    assertTransition(booking.status, STATUSES.SERVICE_COMPLETED);
    const oldStatus = booking.status;
    await BookingRepository.completeService(bookingId);
    const settled = await BookingRepository.settleEarning(bookingId);
    await BookingRepository.addStatusHistory(booking.id, oldStatus, 'SERVICE_COMPLETED', userId, 'Caregiver ended service');

    try {
      await liveTrackingService.stopTracking(booking.id);
      emitTrackingEnded(booking.id);
    } catch (trackErr) {
      console.error('Stop live tracking failed:', trackErr.message);
    }

    if (booking.provider_type === 'CAREGIVER' && booking.provider_id) {
      try {
        await CaregiverProfileRepository.incrementCompletedBookings(booking.provider_id);
      } catch (countErr) {
        console.error('Increment completed bookings failed:', countErr.message);
      }
    }

    const caregiverEarning = await this._getCaregiverEarning(booking.id);

    await this._notifyUser(booking.user_id, booking, 'SERVICE_COMPLETED', 'Service Completed', `Booking ${booking.booking_number} has ended. Tap to view details.`, {
      action: 'OPEN_BOOKING',
      screen: 'booking_details',
      show_review: 'true',
      live_tracking: 'false'
    });

    if (caregiver?.user_id) {
      const amountText = caregiverEarning != null ? ` BDT ${caregiverEarning}` : '';
      await this._notifyCaregiver(caregiver.user_id, booking, 'EARNING_SETTLED', 'Earning settled to wallet', `Service completed for ${booking.booking_number}.${amountText} is now in your wallet.`, {
        action: 'OPEN_WALLET',
        screen: 'wallet',
        payout_status: 'SETTLED_TO_WALLET',
        caregiver_earning: String(caregiverEarning || '')
      });
    }

    return {
      ...booking,
      earning_settled: !!settled?.earning_settled_at,
      caregiver_earning: caregiverEarning
    };
  }

  /**
   * Notify user about status change
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
          status: booking.status,
          ...extraData
        }
      });
    } catch (err) {
      console.error('Notify user failed:', err.message);
    }
  }

  /**
   * Notify caregiver about status change
   */
  async _notifyCaregiver(userId, booking, type, title, body, extraData = {}) {
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
          status: booking.status,
          ...extraData
        }
      });
    } catch (err) {
      console.error('Notify caregiver failed:', err.message);
    }
  }

  /**
   * Get caregiver earning for booking
   */
  async _getCaregiverEarning(bookingId) {
    const { getCaregiverEarningForBooking } = require('../walletService');
    return await getCaregiverEarningForBooking(bookingId);
  }
}

module.exports = new BookingStatusService();
