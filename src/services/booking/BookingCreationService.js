const { BookingRepository, CaregiverProfileRepository } = require('../../repositories');
const { findByUserIdAndId } = require('../../models/FamilyMember');
const { assertCaregiverFree, findNextCaregiver } = require('../bookingAssignment');
const { calculateBookingPrice } = require('../pricingService');
const { PLATFORM_FEE_RATE, CANCEL_FULL_REFUND_HOURS, CANCEL_PARTIAL_REFUND_HOURS, CANCEL_PARTIAL_REFUND_PERCENT } = require('../../config/platform');
const { notifyUser } = require('../pushNotificationService');
const { BadRequestError, NotFoundError, ConflictError } = require('../../utils/errors');
const pool = require('../../config/database');

/**
 * Booking Creation Service
 * Handles all booking creation logic
 */
class BookingCreationService {
  /**
   * Create a new booking for a user
   */
  async createUserBooking(userId, body) {
    const {
      family_member_id,
      provider_id,
      hospital_id,
      booking_date,
      start_time,
      duration_hours,
      patient_requirements,
      notes,
      service_type = 'HOSPITAL_ASSISTANCE',
      auto_assign = true,
      requested_provider_type = 'CAREGIVER'
    } = body;

    // Validate required fields
    if (!family_member_id || !booking_date || !start_time || !duration_hours) {
      throw new BadRequestError('family_member_id, booking_date, start_time, and duration_hours are required');
    }

    // Validate family member
    const familyMember = await findByUserIdAndId(userId, family_member_id);
    if (!familyMember) {
      throw new NotFoundError('Family member not found', 'NOT_FOUND');
    }

    // Calculate end time
    const end_time = new Date(`${booking_date}T${start_time}`);
    end_time.setHours(end_time.getHours() + parseInt(duration_hours, 10));
    const endTimeStr = end_time.toTimeString().slice(0, 5);

    // Determine provider subtype
    const providerSubtype = String(requested_provider_type || 'CAREGIVER').toUpperCase() === 'NURSE'
      ? 'NURSE'
      : 'CAREGIVER';

    // Handle preferred caregiver
    let caregiver = null;
    if (provider_id) {
      caregiver = await CaregiverProfileRepository.findById(provider_id);
      if (!caregiver) {
        throw new NotFoundError('Caregiver not found', 'NOT_FOUND');
      }

      if (!CaregiverProfileRepository.isEligibleForBooking(caregiver)) {
        throw new ConflictError('Selected provider is not eligible for booking', 'CONFLICT');
      }

      if (String(caregiver.provider_type || 'CAREGIVER').toUpperCase() !== providerSubtype) {
        throw new ConflictError(`Selected provider is not a ${providerSubtype}`, 'CONFLICT');
      }

      await assertCaregiverFree(caregiver, {
        booking_date,
        start_time,
        end_time: endTimeStr
      });
    }

    // Calculate pricing
    const price = calculateBookingPrice({
      serviceType: service_type,
      durationHours: duration_hours,
      hourlyRate: caregiver?.hourly_rate
    });

    // Create money rules snapshot
    const money_rules_snapshot = {
      PLATFORM_FEE_RATE,
      CANCEL_FULL_REFUND_HOURS,
      CANCEL_PARTIAL_REFUND_HOURS,
      CANCEL_PARTIAL_REFUND_PERCENT,
      captured_at: new Date().toISOString()
    };

    // Create booking draft
    const draft = {
      user_id: userId,
      family_member_id,
      service_type: service_type.toUpperCase(),
      provider_type: 'CAREGIVER',
      provider_id: caregiver?.id || null,
      hospital_id,
      booking_date,
      start_time,
      end_time: endTimeStr,
      duration_hours,
      patient_requirements,
      notes,
      discount: 0,
      ...price,
      money_rules_snapshot,
      requested_provider_type: providerSubtype,
      status: caregiver ? 'PROVIDER_ASSIGNED' : 'SEARCHING_PROVIDER'
    };

    // Create booking
    let booking = await BookingRepository.create(draft);

    // Persist subtype hint for assignment
    try {
      await pool.query(
        `
        UPDATE bookings
        SET money_rules_snapshot = COALESCE(money_rules_snapshot, '{}'::jsonb) || $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [
          booking.id,
          JSON.stringify({
            ...money_rules_snapshot,
            requested_provider_type: providerSubtype
          })
        ]
      );
    } catch (e) {
      // Column may not exist until migrate:sql
    }

    // Auto-offer when no preferred caregiver
    if (!caregiver && auto_assign !== false) {
      const matchContext = {
        ...booking,
        family_member_district: familyMember.district,
        family_member_thana: familyMember.thana,
        hospital_id,
        requested_provider_type: providerSubtype
      };
      const next = await findNextCaregiver(matchContext);
      if (next) {
        booking = await BookingRepository.assignProvider(booking.id, next.id, 'PROVIDER_ASSIGNED');
        await BookingRepository.addStatusHistory(
          booking.id,
          'SEARCHING_PROVIDER',
          'PROVIDER_ASSIGNED',
          userId,
          `Auto-assigned caregiver ${next.id}`
        );
        caregiver = next;
        booking.status = 'PROVIDER_ASSIGNED';
      }
    } else if (caregiver) {
      booking = await BookingRepository.setOfferExpiry(booking.id);
      booking.status = 'PROVIDER_ASSIGNED';
    }

    // Notify caregiver
    if (caregiver?.user_id) {
      await this._notifyCaregiver(caregiver.user_id, booking);
    }

    return booking;
  }

  /**
   * Notify caregiver about new booking
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
          screen: 'inbox',
          offer_expires_at: booking.offer_expires_at || null
        }
      });
    } catch (err) {
      console.error('Notify caregiver on booking create failed:', err.message);
    }
  }
}

module.exports = new BookingCreationService();
