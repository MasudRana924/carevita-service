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
const attachPatient = (booking) => {
  const source = String(booking.book_for || 'FAMILY').toUpperCase() === 'SELF' ? 'SELF' : 'FAMILY';
  return {
    ...booking,
    patient: {
      source,
      family_member_id: booking.family_member_id || null,
      name: booking.family_member_name || null,
      relationship: booking.family_member_relationship || null,
      photo: booking.family_member_photo || null,
      blood_group: booking.family_member_blood_group || null,
      date_of_birth: booking.family_member_dob || null,
      district: booking.family_member_district || null,
      thana: booking.family_member_thana || null,
      house: booking.family_member_house || null
    }
  };
};

const presentBooking = (booking, { asProvider = false, isAdmin = false } = {}) => {
  if (!booking) return booking;
  const safe = { ...booking };
  delete safe.patient_snapshot;
  delete safe.patient;

  if (!asProvider || isAdmin) return attachPatient(safe);

  const status = String(safe.status || '').toUpperCase();
  if (!POST_ACCEPT_STATUSES.has(status)) {
    return attachPatient(stripFields(safe, PRE_ACCEPT_REDACT));
  }

  return attachPatient(stripFields(safe, POST_ACCEPT_WITHHOLD));
};

module.exports = {
  presentBooking,
  PRE_ACCEPT_REDACT,
  POST_ACCEPT_WITHHOLD,
  POST_ACCEPT_STATUSES
};
