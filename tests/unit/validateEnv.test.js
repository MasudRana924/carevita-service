const {
  validateEnv,
  assertProductionConfig,
  isProduction
} = require('../../src/config/validateEnv');

describe('validateEnv', () => {
  test('isProduction detects production', () => {
    expect(isProduction({ NODE_ENV: 'production' })).toBe(true);
    expect(isProduction({ NODE_ENV: 'development' })).toBe(false);
  });

  test('development allows missing secrets', () => {
    const result = validateEnv({ NODE_ENV: 'development' });
    expect(result.ok).toBe(true);
  });

  test('production rejects ALLOW_STATIC_OTP', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      ALLOW_STATIC_OTP: 'true',
      JWT_SECRET: 'prod-secret-one-long-enough',
      JWT_REFRESH_SECRET: 'prod-secret-two-long-enough',
      BKASH_CALLBACK_SECRET: 'cb',
      DIDIT_WEBHOOK_SECRET: 'wh',
      DATABASE_URL: 'postgresql://u:p@localhost/db'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('ALLOW_STATIC_OTP'))).toBe(true);
  });

  test('production requires critical secrets', () => {
    const result = validateEnv({ NODE_ENV: 'production' });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('JWT_SECRET'),
        expect.stringContaining('JWT_REFRESH_SECRET'),
        expect.stringContaining('BKASH_CALLBACK_SECRET'),
        expect.stringContaining('DIDIT_WEBHOOK_SECRET'),
        expect.stringMatching(/DATABASE_URL|DB_HOST/)
      ])
    );
  });

  test('production rejects insecure JWT defaults', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'your-secret-key',
      JWT_REFRESH_SECRET: 'your-refresh-secret-key',
      BKASH_CALLBACK_SECRET: 'cb',
      DIDIT_WEBHOOK_SECRET: 'wh',
      DATABASE_URL: 'postgresql://u:p@localhost/db'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('insecure default'))).toBe(true);
  });

  test('production rejects identical JWT secrets', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'same-secret-value',
      JWT_REFRESH_SECRET: 'same-secret-value',
      BKASH_CALLBACK_SECRET: 'cb',
      DIDIT_WEBHOOK_SECRET: 'wh',
      DATABASE_URL: 'postgresql://u:p@localhost/db'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('distinct'))).toBe(true);
  });

  test('production accepts valid config', () => {
    const result = validateEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'prod-secret-one-long-enough',
      JWT_REFRESH_SECRET: 'prod-secret-two-long-enough',
      BKASH_CALLBACK_SECRET: 'cb',
      DIDIT_WEBHOOK_SECRET: 'wh',
      DATABASE_URL: 'postgresql://u:p@localhost/db'
    });
    expect(result).toEqual({ ok: true });
  });

  test('assertProductionConfig throws with INVALID_ENV', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'production' })).toThrow(/Unsafe production/);
    try {
      assertProductionConfig({ NODE_ENV: 'production' });
    } catch (error) {
      expect(error.code).toBe('INVALID_ENV');
      expect(Array.isArray(error.errors)).toBe(true);
    }
  });
});
