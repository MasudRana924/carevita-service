/** Fields never shown to providers before acceptance. */
const PRE_ACCEPT_REDACT = [
  'medical_history',
  'existing_conditions',
  'allergies',
  'current_medications',
  'family_member_medical_history',
  'family_member_existing_conditions',
  'family_member_allergies',
  'family_member_current_medications',
  'family_member_blood_group',
  'patient_requirements',
  'family_member_house',
  'family_member_phone',
  'customer_phone',
  'customer_email'
];

/** Full medical narrative withheld even after accept (minimum necessary policy). */
const POST_ACCEPT_WITHHOLD = [
  'medical_history',
  'family_member_medical_history'
];

const POST_ACCEPT_STATUSES = new Set([
  'PROVIDER_ACCEPTED',
  'PAYMENT_PAID',
  'SERVICE_IN_PROGRESS',
  'SERVICE_COMPLETED'
]);

const stripFields = (obj, fields) => {
  const out = { ...obj };
  for (const field of fields) {
    delete out[field];
  }
  return out;
};

/**
 * Present booking for API consumers with PHI policy:
 * - Owner / admin (asProvider=false): full booking (admin callers should audit separately)
 * - Provider before accept: service/time/area only — no PHI
 * - Provider after accept: allergies, conditions, medications (not full medical_history)
 */
const presentBooking = (booking, { asProvider = false, isAdmin = false } = {}) => {
  if (!booking) return booking;
  if (!asProvider || isAdmin) return booking;

  const status = String(booking.status || '').toUpperCase();
  if (!POST_ACCEPT_STATUSES.has(status)) {
    return stripFields(booking, PRE_ACCEPT_REDACT);
  }

  return stripFields(booking, POST_ACCEPT_WITHHOLD);
};

module.exports = {
  presentBooking,
  PRE_ACCEPT_REDACT,
  POST_ACCEPT_WITHHOLD,
  POST_ACCEPT_STATUSES
};
