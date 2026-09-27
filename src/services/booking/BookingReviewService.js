const { BookingRepository, CaregiverProfileRepository } = require('../../repositories');
const Review = require('../../models/Review');
const { notifyUser } = require('../pushNotificationService');
const { NotFoundError, ForbiddenError, BadRequestError, ConflictError } = require('../../utils/errors');

/**
 * Booking Review Service
 * Handles review submission and rating updates
 */
class BookingReviewService {
  /**
   * Submit a review for a booking
   */
  async submitReview(bookingId, userId, { rating, comment }) {
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      throw new BadRequestError('rating must be an integer from 1 to 5');
    }

    const booking = await BookingRepository.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found', 'NOT_FOUND');
    }

    if (booking.user_id !== userId) {
      throw new ForbiddenError('Only the booking user can submit a review');
    }

    if (booking.status !== 'SERVICE_COMPLETED') {
      throw new BadRequestError('Review is allowed only after the caregiver ends the service');
    }

    if (booking.provider_type !== 'CAREGIVER' || !booking.provider_id) {
      throw new BadRequestError('This booking has no caregiver to review');
    }

    const existing = await Review.findByBookingId(booking.id);
    if (existing) {
      throw new ConflictError('You have already submitted a review for this booking', 'CONFLICT');
    }

    try {
      await Review.createReview({
        booking_id: booking.id,
        user_id: userId,
        caregiver_profile_id: booking.provider_id,
        rating: ratingNum,
        comment: comment ? String(comment).trim() : null
      });
    } catch (createErr) {
      if (createErr.code === '23505') {
        throw new ConflictError('You have already submitted a review for this booking', 'CONFLICT');
      }
      throw createErr;
    }

    const stats = await Review.averageRatingForCaregiver(booking.provider_id);
    await CaregiverProfileRepository.updateRating(booking.provider_id, stats.avg_rating);

    const caregiver = await CaregiverProfileRepository.findById(booking.provider_id);
    if (caregiver?.user_id) {
      await this._notifyCaregiver(caregiver.user_id, booking, ratingNum);
    }

    return {
      ...booking,
      caregiver_rating: stats.avg_rating,
      review_count: stats.total
    };
  }

  /**
   * Notify caregiver about new review
   */
  async _notifyCaregiver(userId, booking, rating) {
    try {
      const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      await notifyUser({
        userId,
        title: 'New rating received',
        body: `You received ${rating} star${rating === 1 ? '' : 's'} for booking ${booking.booking_number}. ${stars}`,
        type: 'REVIEW_RECEIVED',
        bookingId: booking.id,
        referenceId: booking.id,
        referenceType: 'booking',
        extraData: {
          booking_number: booking.booking_number,
          rating: String(rating),
          status: 'SERVICE_COMPLETED',
          action: 'OPEN_BOOKING',
          screen: 'booking_details'
        }
      });
    } catch (err) {
      console.error('Notify caregiver on review failed:', err.message);
    }
  }
}

module.exports = new BookingReviewService();
