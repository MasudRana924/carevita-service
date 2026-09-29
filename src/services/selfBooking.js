/**
 * Who the booking is for.
 * FAMILY (default) keeps the existing family_member_id flow unchanged.
 * SELF books the logged-in user as the patient.
 */

const BOOK_FOR_SELF = 'SELF';
const BOOK_FOR_FAMILY = 'FAMILY';

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
};

const textOrNull = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const dateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed.slice(0, 10) : null;
};

/**
 * @param {object} body
 * @returns {'SELF'|'FAMILY'}
 */
const resolveBookFor = (body = {}) => {
  const raw = String(body.book_for || '').trim().toUpperCase();
  const forSelfFlag = body.for_self === true || String(body.for_self).toLowerCase() === 'true';

  if (raw === BOOK_FOR_SELF || forSelfFlag) return BOOK_FOR_SELF;
  if (raw === BOOK_FOR_FAMILY || raw === '') return BOOK_FOR_FAMILY;
  throw badRequest('book_for must be SELF or FAMILY');
};

const assertBookingSubject = (body = {}) => {
  const bookFor = resolveBookFor(body);
  if (bookFor === BOOK_FOR_SELF && body.family_member_id) {
    throw badRequest('family_member_id must not be sent when book_for is SELF');
  }
  return bookFor;
};

/**
 * Patient identity always comes from the account.
 * Location and medical notes are optional extras the user can send,
 * because the user profile does not store district / thana / clinical fields.
 * @param {object} user
 * @param {object} body
 */
const buildSelfPatientSnapshot = (user, body = {}) => {
  const name = textOrNull(user?.name);
  if (!name) {
    throw badRequest('Add your name on your profile before booking for yourself');
  }

  return {
    name,
    phone: textOrNull(user.phone),
    photo: textOrNull(user.profile_photo),
    relationship: 'Self',
    date_of_birth: dateOnly(user.date_of_birth),
    district: textOrNull(body.district),
    thana: textOrNull(body.thana),
    house: textOrNull(body.house) || textOrNull(user.address),
    blood_group: textOrNull(body.blood_group),
    medical_history: textOrNull(body.medical_history),
    existing_conditions: textOrNull(body.existing_conditions),
    allergies: textOrNull(body.allergies),
    current_medications: textOrNull(body.current_medications)
  };
};

module.exports = {
  BOOK_FOR_SELF,
  BOOK_FOR_FAMILY,
  resolveBookFor,
  assertBookingSubject,
  buildSelfPatientSnapshot
};
