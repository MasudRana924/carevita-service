const {
  reconcilePaymentAmount,
  snapshotPlatformFeeForPaidAmount
} = require('../../src/utils/paymentIntegrity');

describe('paymentIntegrity', () => {
  test('reconcile accepts matching advance amount', () => {
    const result = reconcilePaymentAmount(
      { advance_amount: 100, total_amount: 200 },
      100
    );
    expect(result).toEqual({ ok: true, amount: 100 });
  });

  test('reconcile rejects mismatch', () => {
    const result = reconcilePaymentAmount(
      { advance_amount: 100, total_amount: 200 },
      150
    );
    expect(result.ok).toBe(false);
    expect(result.expected).toBe(100);
  });

  test('snapshot fee uses booking platform_fee proportionally', () => {
    const fee = snapshotPlatformFeeForPaidAmount(
      { total_amount: 200, platform_fee: 10 },
      100
    );
    expect(fee).toBe(5);
  });
});
