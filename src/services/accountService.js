const { findById, updateUser } = require('../models/User');
const { getCaregiverProfileByUserId, updateCaregiverProfile } = require('../models/CaregiverProfile');
const { invalidateCaregiverCatalog } = require('./catalogCache');

const GENDERS = ['male', 'female', 'other'];
const LANGUAGES = ['bn', 'en'];
const MAX_NAME_LENGTH = 255;
const MAX_ADDRESS_LENGTH = 500;

const httpError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });
const validationError = (message) => httpError(message, 400, 'VALIDATION_ERROR');

const isBlank = (value) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const dateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const presentAccount = (user, caregiverProfile = null) => ({
  id: user.id,
  role: user.role,
  name: user.name || null,
  email: user.email || null,
  phone: user.phone || null,
  profile_photo: user.profile_photo || caregiverProfile?.profile_photo || null,
  gender: user.gender || caregiverProfile?.gender || null,
  date_of_birth: dateOnly(user.date_of_birth || caregiverProfile?.date_of_birth),
  address: user.address || null,
  emergency_contact: user.emergency_contact || null,
  language_preference: user.language_preference || null,
  status: user.status || null,
  is_verified: !!user.is_verified,
  ekyc_status: !!user.ekyc_status,
  caregiver_profile_id: caregiverProfile?.id || null,
  created_at: user.created_at || null,
  updated_at: user.updated_at || null
});

const loadCaregiverProfile = async (user) => (
  user.role === 'CAREGIVER' ? getCaregiverProfileByUserId(user.id) : null
);

const getAccount = async (userId) => {
  const user = await findById(userId);
  if (!user) throw httpError('User not found', 404, 'NOT_FOUND');
  return presentAccount(user, await loadCaregiverProfile(user));
};

const parseName = (value) => {
  if (value === undefined) return undefined;
  const name = String(value ?? '').trim();
  if (!name) throw validationError('Name cannot be empty');
  if (name.length > MAX_NAME_LENGTH) throw validationError(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
  return name;
};

const parseGender = (value) => {
  if (isBlank(value)) return undefined;
  const gender = String(value).trim().toLowerCase();
  if (!GENDERS.includes(gender)) throw validationError(`gender must be one of: ${GENDERS.join(', ')}`);
  return gender;
};

const parseDateOfBirth = (value, now = new Date()) => {
  if (isBlank(value)) return undefined;
  const raw = String(value).trim().slice(0, 10);
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw validationError('date_of_birth must be a valid date in YYYY-MM-DD format');
  }
  if (parsed.getTime() > now.getTime()) throw validationError('date_of_birth cannot be in the future');
  if (parsed.getUTCFullYear() < 1900) throw validationError('date_of_birth is too far in the past');
  return raw;
};

const parseText = (value, field, maxLength) => {
  if (isBlank(value)) return undefined;
  const text = String(value).trim();
  if (text.length > maxLength) throw validationError(`${field} cannot exceed ${maxLength} characters`);
  return text;
};

const parseLanguage = (value) => {
  if (isBlank(value)) return undefined;
  const lang = String(value).trim().toLowerCase();
  if (!LANGUAGES.includes(lang)) throw validationError(`language_preference must be one of: ${LANGUAGES.join(', ')}`);
  return lang;
};

/** Validates the editable account fields. Email, phone and photo are not editable here. */
const parseAccountUpdate = (body = {}) => {
  const update = {
    name: parseName(body.name),
    gender: parseGender(body.gender),
    date_of_birth: parseDateOfBirth(body.date_of_birth),
    address: parseText(body.address, 'address', MAX_ADDRESS_LENGTH),
    emergency_contact: parseText(body.emergency_contact, 'emergency_contact', 20),
    language_preference: parseLanguage(body.language_preference)
  };
  return Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
};

/** Caregiver cards (search, booking details, chat) read photo/gender/dob from caregiver_profiles. */
const syncCaregiverProfile = async (caregiverProfile, fields) => {
  if (!caregiverProfile) return caregiverProfile;
  const mirrored = Object.fromEntries(
    ['profile_photo', 'gender', 'date_of_birth']
      .filter((key) => fields[key] !== undefined)
      .map((key) => [key, fields[key]])
  );
  if (Object.keys(mirrored).length === 0) return caregiverProfile;
  const updated = await updateCaregiverProfile(caregiverProfile.id, mirrored);
  await invalidateCaregiverCatalog();
  return updated;
};

const updateAccount = async (userId, body) => {
  const fields = parseAccountUpdate(body);
  const user = await findById(userId);
  if (!user) throw httpError('User not found', 404, 'NOT_FOUND');

  const updatedUser = Object.keys(fields).length ? await updateUser(userId, fields) : user;
  const caregiverProfile = await syncCaregiverProfile(await loadCaregiverProfile(user), fields);
  return presentAccount(updatedUser, caregiverProfile);
};

const updatePhoto = async (userId, file) => {
  if (!file?.path) throw validationError('Photo is required. Send the image in the "photo" field.');
  const user = await findById(userId);
  if (!user) throw httpError('User not found', 404, 'NOT_FOUND');

  const updatedUser = await updateUser(userId, { profile_photo: file.path });
  const caregiverProfile = await syncCaregiverProfile(await loadCaregiverProfile(user), { profile_photo: file.path });
  return presentAccount(updatedUser, caregiverProfile);
};

module.exports = {
  GENDERS,
  presentAccount,
  parseAccountUpdate,
  parseDateOfBirth,
  getAccount,
  updateAccount,
  updatePhoto,
  syncCaregiverProfile
};
