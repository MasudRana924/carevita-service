const BookingLiveLocation = require('../models/BookingLiveLocation');
const { findById } = require('../models/Booking');
const { getCaregiverProfileByUserId } = require('../models/CaregiverProfile');

const isAssignedCaregiver = async (booking, userId) => {
  if (booking.provider_type !== 'CAREGIVER') return false;
  const profile = await getCaregiverProfileByUserId(userId);
  return !!profile && booking.provider_id === profile.id;
};

const parseCoord = (value, name) => {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const error = new Error(`${name} is required and must be a number`);
    error.statusCode = 400;
    throw error;
  }
  return n;
};

const assertCanPublish = async (bookingId, caregiverUserId) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  if (!(await isAssignedCaregiver(booking, caregiverUserId))) {
    const error = new Error('Access denied — this booking is not assigned to you');
    error.statusCode = 403;
    throw error;
  }
  if (booking.status !== 'SERVICE_IN_PROGRESS') {
    const error = new Error('Live tracking is only available while service is in progress');
    error.statusCode = 400;
    throw error;
  }
  return booking;
};

const assertCanView = async (bookingId, user) => {
  const booking = await findById(bookingId);
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const asProvider = await isAssignedCaregiver(booking, user.id);
  const isOwner = booking.user_id === user.id;
  if (!isOwner && !asProvider && user.role !== 'ADMIN') {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }
  return booking;
};

const presentLocation = (row, booking = null) => {
  if (!row) {
    return {
      booking_id: booking?.id || null,
      is_active: false,
      latitude: null,
      longitude: null,
      accuracy: null,
      heading: null,
      speed: null,
      updated_at: null
    };
  }

  return {
    booking_id: row.booking_id,
    is_active: !!row.is_active && booking?.status === 'SERVICE_IN_PROGRESS',
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    accuracy: row.accuracy != null ? Number(row.accuracy) : null,
    heading: row.heading != null ? Number(row.heading) : null,
    speed: row.speed != null ? Number(row.speed) : null,
    updated_at: row.updated_at || null,
    booking_status: booking?.status || null
  };
};

const publishLocation = async (bookingId, caregiverUserId, payload = {}) => {
  const booking = await assertCanPublish(bookingId, caregiverUserId);
  const latitude = parseCoord(payload.latitude ?? payload.lat, 'latitude');
  const longitude = parseCoord(payload.longitude ?? payload.lng ?? payload.long, 'longitude');

  if (latitude < -90 || latitude > 90) {
    const error = new Error('latitude must be between -90 and 90');
    error.statusCode = 400;
    throw error;
  }
  if (longitude < -180 || longitude > 180) {
    const error = new Error('longitude must be between -180 and 180');
    error.statusCode = 400;
    throw error;
  }

  const row = await BookingLiveLocation.upsertLocation({
    bookingId,
    caregiverUserId,
    latitude,
    longitude,
    accuracy: payload.accuracy != null ? Number(payload.accuracy) : null,
    heading: payload.heading != null ? Number(payload.heading) : null,
    speed: payload.speed != null ? Number(payload.speed) : null,
    isActive: true
  });

  return presentLocation(row, booking);
};

const getLiveLocation = async (bookingId, user) => {
  const booking = await assertCanView(bookingId, user);
  const row = await BookingLiveLocation.getByBookingId(bookingId);
  return presentLocation(row, booking);
};

const stopTracking = async (bookingId) => {
  const row = await BookingLiveLocation.deactivate(bookingId);
  return presentLocation(row, { id: bookingId, status: 'SERVICE_COMPLETED' });
};

const roomName = (bookingId) => `booking:${bookingId}`;

module.exports = {
  publishLocation,
  getLiveLocation,
  stopTracking,
  presentLocation,
  roomName,
  assertCanPublish,
  assertCanView
};
