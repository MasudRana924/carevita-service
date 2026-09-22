const {
  normalizeRegisterRole,
  hashToken,
  MAX_OTP_ATTEMPTS,
  PUBLIC_REGISTER_ROLES
} = require('../../src/utils/authHelpers');

describe('authHelpers', () => {
  test('defaults empty role to USER', () => {
    expect(normalizeRegisterRole(undefined)).toEqual({ ok: true, role: 'USER' });
    expect(normalizeRegisterRole('')).toEqual({ ok: true, role: 'USER' });
  });

  test('allows USER and CAREGIVER', () => {
    expect(normalizeRegisterRole('user')).toEqual({ ok: true, role: 'USER' });
    expect(normalizeRegisterRole('CAREGIVER')).toEqual({ ok: true, role: 'CAREGIVER' });
    expect(PUBLIC_REGISTER_ROLES.has('USER')).toBe(true);
  });

  test('rejects ADMIN and unknown roles', () => {
    expect(normalizeRegisterRole('ADMIN').ok).toBe(false);
    expect(normalizeRegisterRole('NURSE').ok).toBe(false);
    expect(normalizeRegisterRole('hack').ok).toBe(false);
  });

  test('hashToken is stable sha256 hex', () => {
    const a = hashToken('abc');
    const b = hashToken('abc');
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken('xyz')).not.toBe(a);
  });

  test('OTP max attempts is at least 5', () => {
    expect(MAX_OTP_ATTEMPTS).toBeGreaterThanOrEqual(5);
  });
});
