const crypto = require('crypto');

const PUBLIC_REGISTER_ROLES = new Set(['USER', 'CAREGIVER']);
const MAX_OTP_ATTEMPTS = 5;

/**
 * Public registration may only create USER or CAREGIVER.
 * Client-supplied ADMIN (or unknown) is rejected.
 * @returns {{ ok: true, role: string } | { ok: false, message: string }}
 */
const normalizeRegisterRole = (role) => {
  if (role == null || role === '') {
    return { ok: true, role: 'USER' };
  }
  const normalized = String(role).trim().toUpperCase();
  if (!PUBLIC_REGISTER_ROLES.has(normalized)) {
    return {
      ok: false,
      message: 'Invalid role. Public registration allows USER or CAREGIVER only.'
    };
  }
  return { ok: true, role: normalized };
};

/**
 * Bangladeshi mobile number → canonical `01XXXXXXXXX`.
 * Accepts `01…`, `8801…`, `+8801…` with spaces/dashes.
 * @returns {string|null} null when not a valid BD mobile number
 */
const normalizePhone = (raw) => {
  if (raw == null) return null;
  let digits = String(raw).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('880')) digits = digits.slice(2);
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null;
};

/**
 * Picks the login/OTP identifier from a request body. Email wins when both are sent.
 * @returns {{ ok: true, channel: 'email'|'phone', value: string } | { ok: false, message: string }}
 */
const resolveContact = (body = {}) => {
  const email = body.email != null ? String(body.email).trim() : '';
  const rawPhone = body.phone != null ? String(body.phone).trim() : '';

  if (email) return { ok: true, channel: 'email', value: email };
  if (rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return { ok: false, message: 'Invalid phone number. Use a Bangladeshi mobile number like 01712345678.' };
    }
    return { ok: true, channel: 'phone', value: phone };
  }
  return { ok: false, message: 'Email or phone is required' };
};

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

const newFamilyId = () => crypto.randomUUID();

module.exports = {
  PUBLIC_REGISTER_ROLES,
  MAX_OTP_ATTEMPTS,
  normalizeRegisterRole,
  normalizePhone,
  resolveContact,
  hashToken,
  newFamilyId
};
