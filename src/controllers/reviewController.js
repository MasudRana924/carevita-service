const {
  findByProviderId,
  findByUserId,
  findById,
  findByBookingId,
  createReview,
  updateReview,
  getProviderAverageRating
} = require('../models/Review');
const { findById: findBookingById } = require('../models/Booking');
const { updateRating: updateCaregiverRating, getCaregiverProfileById } = require('../models/CaregiverProfile');
const { updateRating: updateNurseRating, getNurseProfileById } = require('../models/NurseProfile');
const { createNotification } = require('../models/Notification');

const syncProviderRating = async (providerId, providerType) => {
  const avgRating = await getProviderAverageRating(providerId, providerType);
  const avg = parseFloat(avgRating.avg_overall) || 0;
  if (providerType === 'CAREGIVER') {
    await updateCaregiverRating(providerId, avg);
  } else if (providerType === 'NURSE') {
    await updateNurseRating(providerId, avg);
  }
  return avgRating;
};

exports.createReview = async (req, res) => {
  try {
    const {
      booking_id,
      rating,
      comment,
      feedback,
      overall_rating,
      punctuality_rating,
      politeness_rating,
      professionalism_rating,
      helpfulness_rating,
      trustworthiness_rating,
      review
    } = req.body;

    if (!booking_id) {
      return res.error('booking_id is required');
    }

    const booking = await findBookingById(booking_id);
    if (!booking) {
      return res.notFound('Booking not found');
    }

    if (booking.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    if (booking.status !== 'SERVICE_COMPLETED') {
      return res.error('Can only review completed bookings');
    }

    if (!booking.provider_id || !['CAREGIVER', 'NURSE'].includes(booking.provider_type)) {
      return res.error('This booking has no reviewable provider');
    }

    const existing = await findByBookingId(booking.id);
    if (existing) {
      return res.error('You have already reviewed this booking', [], 409);
    }

    const overall = overall_rating || rating;
    if (!overall || overall < 1 || overall > 5) {
      return res.error('Rating is required (1-5)');
    }

    const reviewText = review || feedback || comment || null;

    const created = await createReview({
      booking_id: booking.id,
      user_id: req.user.id,
      provider_id: booking.provider_id,
      provider_type: booking.provider_type,
      overall_rating: overall,
      punctuality_rating: punctuality_rating || overall,
      politeness_rating: politeness_rating || overall,
      professionalism_rating: professionalism_rating || overall,
      helpfulness_rating: helpfulness_rating || overall,
      trustworthiness_rating: trustworthiness_rating || overall,
      review: reviewText
    });

    await syncProviderRating(booking.provider_id, booking.provider_type);

    try {
      let providerUserId = null;
      if (booking.provider_type === 'CAREGIVER') {
        const profile = await getCaregiverProfileById(booking.provider_id);
        providerUserId = profile?.user_id;
      } else if (booking.provider_type === 'NURSE') {
        const profile = await getNurseProfileById(booking.provider_id);
        providerUserId = profile?.user_id;
      }
      if (providerUserId) {
        await createNotification({
          user_id: providerUserId,
          title: 'New Review Received',
          message: `You received a ${overall}/5 review with feedback on booking ${booking.booking_number}.`,
          type: 'REVIEW',
          reference_id: created.id,
          reference_type: 'review'
        });
      }
    } catch (e) {
      console.error('Notify provider on review error:', e.message);
    }

    res.created(created, 'Review submitted successfully');
  } catch (error) {
    console.error('Create review error:', error);
    res.serverError('Failed to submit review');
  }
};

exports.getProviderReviews = async (req, res) => {
  try {
    const { provider_id, provider_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!provider_id || !provider_type) {
      return res.error('Provider ID and type are required');
    }

    const reviews = await findByProviderId(provider_id, provider_type, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const avgRating = await getProviderAverageRating(provider_id, provider_type);

    res.success({
      reviews,
      averageRating: avgRating
    }, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: reviews.length
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.serverError('Failed to fetch reviews');
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const reviews = await findByUserId(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.success(reviews, null, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: reviews.length
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.serverError('Failed to fetch reviews');
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      overall_rating, punctuality_rating, politeness_rating, professionalism_rating,
      helpfulness_rating, trustworthiness_rating, review, rating, comment, feedback
    } = req.body;

    const reviewToUpdate = await findById(id);

    if (!reviewToUpdate) {
      return res.notFound('Review not found');
    }

    if (reviewToUpdate.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const overall = overall_rating || rating || reviewToUpdate.overall_rating;

    const updated = await updateReview(id, {
      overall_rating: overall,
      punctuality_rating: punctuality_rating || reviewToUpdate.punctuality_rating,
      politeness_rating: politeness_rating || reviewToUpdate.politeness_rating,
      professionalism_rating: professionalism_rating || reviewToUpdate.professionalism_rating,
      helpfulness_rating: helpfulness_rating || reviewToUpdate.helpfulness_rating,
      trustworthiness_rating: trustworthiness_rating || reviewToUpdate.trustworthiness_rating,
      review: review || feedback || comment || reviewToUpdate.review,
      is_visible: reviewToUpdate.is_visible
    });

    await syncProviderRating(reviewToUpdate.provider_id, reviewToUpdate.provider_type);

    res.success(updated, 'Review updated successfully');
  } catch (error) {
    console.error('Update review error:', error);
    res.serverError('Failed to update review');
  }
};
