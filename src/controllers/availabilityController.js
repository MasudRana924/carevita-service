const Availability = require('../models/Availability');
const { getCaregiverProfileByUserId, getCaregiverProfileById } = require('../models/CaregiverProfile');

const validateSlots = (slots) => {
  if (!Array.isArray(slots) || !slots.length) {
    return 'slots must be a non-empty array';
  }
  for (const slot of slots) {
    const day = Number(slot.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return 'day_of_week must be 0-6 (Sunday-Saturday)';
    }
    if (!slot.start_time || !slot.end_time) {
      return 'start_time and end_time are required';
    }
  }
  return null;
};

exports.getMyAvailability = async (req, res) => {
  try {
    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Caregiver profile not found');
    const slots = await Availability.listByProfileId(profile.id);
    return res.success(slots, 'Availability fetched successfully');
  } catch (error) {
    console.error('Get availability error:', error);
    return res.serverError('Failed to fetch availability');
  }
};

exports.updateMyAvailability = async (req, res) => {
  try {
    const profile = await getCaregiverProfileByUserId(req.user.id);
    if (!profile) return res.notFound('Caregiver profile not found');

    const slots = req.body.slots || req.body;
    const invalid = validateSlots(slots);
    if (invalid) return res.badRequest(invalid);

    const saved = await Availability.replaceWeeklySlots(profile.id, slots);
    return res.success(saved, 'Availability updated successfully');
  } catch (error) {
    console.error('Update availability error:', error);
    return res.serverError('Failed to update availability');
  }
};

exports.getPublicAvailability = async (req, res) => {
  try {
    let profile = await getCaregiverProfileById(req.params.id);
    if (!profile) profile = await getCaregiverProfileByUserId(req.params.id);
    if (!profile) return res.notFound('Caregiver profile not found');
    const slots = await Availability.listByProfileId(profile.id);
    return res.success(slots, 'Availability fetched successfully');
  } catch (error) {
    console.error('Public availability error:', error);
    return res.serverError('Failed to fetch availability');
  }
};
