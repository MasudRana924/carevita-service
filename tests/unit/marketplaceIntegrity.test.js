const { isEligibleForBooking } = require('../../src/models/CaregiverProfile');
const { normalizeRegisterRole } = require('../../src/utils/authHelpers');
const { canTransition, STATUSES } = require('../../src/services/bookingJourney');
const { resolveCancelRules } = require('../../src/services/cancellationPolicy');

describe('nurse eligibility', () => {
  test('caregiver approved is eligible', () => {
    expect(isEligibleForBooking({
      is_available: true,
      verification_status: 'APPROVED',
      provider_type: 'CAREGIVER'
    })).toBe(true);
  });

  test('nurse without verified credential is not eligible', () => {
    expect(isEligibleForBooking({
      is_available: true,
      verification_status: 'APPROVED',
      provider_type: 'NURSE',
      credential_status: 'PENDING'
    })).toBe(false);
  });

  test('nurse with expired credential is not eligible', () => {
    expect(isEligibleForBooking({
      is_available: true,
      verification_status: 'APPROVED',
      provider_type: 'NURSE',
      credential_status: 'VERIFIED',
      credential_expires_at: '2020-01-01'
    })).toBe(false);
  });

  test('nurse verified and not expired is eligible', () => {
    expect(isEligibleForBooking({
      is_available: true,
      verification_status: 'APPROVED',
      provider_type: 'NURSE',
      credential_status: 'VERIFIED',
      credential_expires_at: '2099-01-01'
    })).toBe(true);
  });
});

describe('booking transitions', () => {
  test('happy path transitions allowed', () => {
    expect(canTransition(STATUSES.PROVIDER_ASSIGNED, STATUSES.PROVIDER_ACCEPTED)).toBe(true);
    expect(canTransition(STATUSES.PROVIDER_ACCEPTED, STATUSES.PAYMENT_PAID)).toBe(true);
    expect(canTransition(STATUSES.PAYMENT_PAID, STATUSES.SERVICE_IN_PROGRESS)).toBe(true);
  });

  test('cannot skip to in progress from assigned', () => {
    expect(canTransition(STATUSES.PROVIDER_ASSIGNED, STATUSES.SERVICE_IN_PROGRESS)).toBe(false);
  });
});

describe('cancel rules snapshot', () => {
  test('uses snapshot over env when present', () => {
    const rules = resolveCancelRules({
      money_rules_snapshot: {
        CANCEL_FULL_REFUND_HOURS: 48,
        CANCEL_PARTIAL_REFUND_HOURS: 12,
        CANCEL_PARTIAL_REFUND_PERCENT: 25
      }
    });
    expect(rules.fullHours).toBe(48);
    expect(rules.partialHours).toBe(12);
    expect(rules.partialPercent).toBe(25);
  });
});

describe('rbac register role', () => {
  test('rejects ADMIN', () => {
    expect(normalizeRegisterRole('ADMIN').ok).toBe(false);
  });
});
