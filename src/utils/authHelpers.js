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

const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token), 'utf8').digest('hex');

const newFamilyId = () => crypto.randomUUID();

module.exports = {
  PUBLIC_REGISTER_ROLES,
  MAX_OTP_ATTEMPTS,
  normalizeRegisterRole,
  hashToken,
  newFamilyId
};
