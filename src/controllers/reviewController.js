const { findByProviderId, findByUserId, updateReview, getProviderAverageRating } = require('../models/Review');
const { findById: findBookingById } = require('../models/Booking');
const { updateRating: updateCaregiverRating } = require('../models/CaregiverProfile');
const { updateRating: updateNurseRating } = require('../models/NurseProfile');

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
      helpfulness_rating, trustworthiness_rating, review
    } = req.body;

    const existingReview = await findByProviderId(req.user.id, 'USER', { limit: 1 });
    const reviewToUpdate = existingReview.find(r => r.id === id);

    if (!reviewToUpdate) {
      return res.notFound('Review not found');
    }

    if (reviewToUpdate.user_id !== req.user.id) {
      return res.forbidden('Access denied');
    }

    const updated = await updateReview(id, {
      overall_rating,
      punctuality_rating,
      politeness_rating,
      professionalism_rating,
      helpfulness_rating,
      trustworthiness_rating,
      review
    });

    const avgRating = await getProviderAverageRating(
      reviewToUpdate.provider_id,
      reviewToUpdate.provider_type
    );

    if (reviewToUpdate.provider_type === 'CAREGIVER') {
      await updateCaregiverRating(reviewToUpdate.provider_id, avgRating.avg_overall);
    } else if (reviewToUpdate.provider_type === 'NURSE') {
      await updateNurseRating(reviewToUpdate.provider_id, avgRating.avg_overall);
    }

    res.success(updated, 'Review updated successfully');
  } catch (error) {
    console.error('Update review error:', error);
    res.serverError('Failed to update review');
  }
};
