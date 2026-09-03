const Review = require('../models/Review');
const Booking = require('../models/Booking');
const HelpingHand = require('../models/HelpingHand');
const Nurse = require('../models/Nurse');
const Doctor = require('../models/Doctor');

exports.createReview = async (req, res) => {
  try {
    const {
      booking_id, provider_id, provider_type, overall_rating,
      punctuality_rating, politeness_rating, professionalism_rating,
      helpfulness_rating, trustworthiness_rating, review
    } = req.body;

    if (!booking_id || !provider_id || !provider_type || !overall_rating) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID, provider ID, provider type, and overall rating are required'
      });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    const existingReview = await Review.findByBookingId(booking_id);
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    const newReview = await Review.create({
      booking_id,
      user_id: req.user.id,
      provider_id,
      provider_type,
      overall_rating,
      punctuality_rating,
      politeness_rating,
      professionalism_rating,
      helpfulness_rating,
      trustworthiness_rating,
      review
    });

    const avgRating = await Review.getProviderAverageRating(provider_id, provider_type);

    if (provider_type === 'helping_hand') {
      await HelpingHand.updateRating(provider_id, avgRating.avg_overall);
    } else if (provider_type === 'nurse') {
      await Nurse.updateRating(provider_id, avgRating.avg_overall);
    } else if (provider_type === 'doctor') {
      await Doctor.updateRating(provider_id, avgRating.avg_overall);
    }

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review'
    });
  }
};

exports.getProviderReviews = async (req, res) => {
  try {
    const { provider_id, provider_type, limit } = req.query;

    if (!provider_id || !provider_type) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID and type are required'
      });
    }

    const reviews = await Review.findByProviderId(provider_id, provider_type, {
      limit: limit || 20
    });

    const avgRating = await Review.getProviderAverageRating(provider_id, provider_type);

    res.status(200).json({
      success: true,
      reviews,
      averageRating: avgRating
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const { limit } = req.query;

    const reviews = await Review.findByUserId(req.user.id, {
      limit: limit || 20
    });

    res.status(200).json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      overall_rating, punctuality_rating, politeness_rating, professionalism_rating,
      helpfulness_rating, trustworthiness_rating, review
    } = req.body;

    const existingReview = await Review.findById(id);

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (existingReview.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await Review.update(id, {
      overall_rating,
      punctuality_rating,
      politeness_rating,
      professionalism_rating,
      helpfulness_rating,
      trustworthiness_rating,
      review
    });

    const avgRating = await Review.getProviderAverageRating(
      existingReview.provider_id,
      existingReview.provider_type
    );

    if (existingReview.provider_type === 'helping_hand') {
      await HelpingHand.updateRating(existingReview.provider_id, avgRating.avg_overall);
    } else if (existingReview.provider_type === 'nurse') {
      await Nurse.updateRating(existingReview.provider_id, avgRating.avg_overall);
    } else if (existingReview.provider_type === 'doctor') {
      await Doctor.updateRating(existingReview.provider_id, avgRating.avg_overall);
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      review: updated
    });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review'
    });
  }
};
