const asyncHandler = require('../utils/asyncHandler');
const {
  findById,
  findByUserId,
  countByUserId,
  getStatusHistory
} = require('../models/Booking');
const Review = require('../models/Review');
const Dispute = require('../models/Dispute');
const { journeyFlags } = require('../services/bookingJourney');
const { parsePagination } = require('../utils/pagination');
const bookingService = require('../services/bookingService');

const mapServiceError = (res, error, fallback) => {
  if (error.statusCode) {
    return res.error(error.message, [], error.statusCode, error.code);
  }
  console.error(fallback, error);
  return res.serverError(fallback);
};

exports.createBooking = asyncHandler(async (req, res) => {
  try {
    const booking = await bookingService.createUserBooking(req.user.id, req.body);
    return res.created(booking, 'Booking created successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to create booking');
  }
});

exports.getBookings = asyncHandler(async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query);
  const { status } = req.query;

  const [bookings, total] = await Promise.all([
    findByUserId(req.user.id, { status, limit, offset }),
    countByUserId(req.user.id, { status })
  ]);

  const data = await Promise.all(
    bookings.map(async (booking) => {
      const review = await Review.findByBookingId(booking.id);
      return {
        ...booking,
        ...journeyFlags(booking, {
          userId: req.user.id,
          asProvider: false,
          review
        }),
        offer_expires_at: booking.offer_expires_at || null
      };
    })
  );

  return res.paginated(data, { page, limit, total }, 'Bookings fetched successfully');
});

exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await findById(req.params.id);
  if (!booking) return res.notFound('Booking not found');

  const asProvider = await bookingService.isAssignedCaregiver(booking, req.user.id);
  if (booking.user_id !== req.user.id && !asProvider && req.user.role !== 'ADMIN') {
    return res.forbidden('Access denied');
  }

  const history = await getStatusHistory(req.params.id);
  const payload = await bookingService.withJourney(booking, req.user.id);
  return res.success({ ...payload, history });
});

exports.acceptBooking = asyncHandler(async (req, res) => {
  try {
    const updated = await bookingService.acceptBooking(req.params.id, req.user.id);
    return res.success(updated, 'Booking accepted successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to accept booking');
  }
});

exports.rejectBooking = asyncHandler(async (req, res) => {
  try {
    const result = await bookingService.rejectBooking(req.params.id, req.user.id, req.body.reason);
    return res.success(result.booking, result.message);
  } catch (error) {
    return mapServiceError(res, error, 'Failed to reject booking');
  }
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  try {
    const booking = await findById(req.params.id);
    if (!booking) return res.notFound('Booking not found');
    const { updated, policy, refund } = await bookingService.cancelBooking(
      booking,
      req.user,
      req.body.reason
    );
    return res.success({
      ...updated,
      cancellation_policy: policy,
      refund
    }, 'Booking cancelled successfully');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to cancel booking');
  }
});

exports.startBooking = asyncHandler(async (req, res) => {
  try {
    const payload = await bookingService.startBooking(req.params.id, req.user.id, req.body || {});
    return res.success(payload, 'Service started');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to start service');
  }
});

exports.completeBooking = asyncHandler(async (req, res) => {
  try {
    const payload = await bookingService.completeBooking(req.params.id, req.user.id);
    return res.success(payload, 'Service completed');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to complete service');
  }
});

exports.updateLiveLocation = asyncHandler(async (req, res) => {
  try {
    const liveTrackingService = require('../services/liveTrackingService');
    const { emitLocation } = require('../realtime/socket');
    const location = await liveTrackingService.publishLocation(req.params.id, req.user.id, req.body || {});
    emitLocation(req.params.id, location);
    return res.success(location, 'Live location updated');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to update live location');
  }
});

exports.getLiveLocation = asyncHandler(async (req, res) => {
  try {
    const liveTrackingService = require('../services/liveTrackingService');
    const location = await liveTrackingService.getLiveLocation(req.params.id, req.user);
    return res.success(location, 'Live location fetched');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to fetch live location');
  }
});

exports.submitReview = asyncHandler(async (req, res) => {
  try {
    const payload = await bookingService.submitReview(req.params.id, req.user.id, req.body);
    return res.created(payload, 'Review submitted');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to submit review');
  }
});

exports.createDispute = asyncHandler(async (req, res) => {
  try {
    const dispute = await bookingService.createDispute(req.params.id, req.user, req.body);
    return res.created(dispute, 'Dispute created');
  } catch (error) {
    return mapServiceError(res, error, 'Failed to create dispute');
  }
});

exports.getBookingDisputes = asyncHandler(async (req, res) => {
  const booking = await findById(req.params.id);
  if (!booking) return res.notFound('Booking not found');

  const asProvider = await bookingService.isAssignedCaregiver(booking, req.user.id);
  if (booking.user_id !== req.user.id && !asProvider && req.user.role !== 'ADMIN') {
    return res.forbidden('Access denied');
  }

  const items = await Dispute.listByBookingId(booking.id);
  return res.success(items, 'Disputes fetched successfully');
});
