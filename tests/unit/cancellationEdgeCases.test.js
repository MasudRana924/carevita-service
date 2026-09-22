const {
  resolveCancelRules
} = require('../../src/services/cancellationPolicy');

describe('cancellationPolicy snapshot edge cases', () => {
  test('parses JSON string snapshot from drivers', () => {
    const rules = resolveCancelRules({
      money_rules_snapshot: JSON.stringify({
        CANCEL_FULL_REFUND_HOURS: 36,
        CANCEL_PARTIAL_REFUND_HOURS: 8,
        CANCEL_PARTIAL_REFUND_PERCENT: 40
      })
    });
    expect(rules.fullHours).toBe(36);
    expect(rules.partialPercent).toBe(40);
  });

  test('falls back when snapshot garbage', () => {
    const rules = resolveCancelRules({ money_rules_snapshot: 'not-json' });
    expect(Number.isFinite(rules.fullHours)).toBe(true);
  });
});
