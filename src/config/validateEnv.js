/**
 * Fail-closed production configuration checks.
 * Development/test keep working with incomplete secrets so local DX is preserved.
 */

const INSECURE_JWT_FALLBACKS = new Set([
  'your-secret-key',
  'your-refresh-secret-key',
  'caremet924'
]);

const isProduction = (env = process.env) =>
  String(env.NODE_ENV || '').toLowerCase() === 'production';

const missing = (env, key) => {
  const value = env[key];
  return value == null || String(value).trim() === '';
};

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
const validateEnv = (env = process.env) => {
  const errors = [];

  if (String(env.ALLOW_STATIC_OTP || '').toLowerCase() === 'true' && isProduction(env)) {
    errors.push('ALLOW_STATIC_OTP must not be enabled in production');
  }

  if (!isProduction(env)) {
    return errors.length ? { ok: false, errors } : { ok: true };
  }

  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BKASH_CALLBACK_SECRET',
    'DIDIT_WEBHOOK_SECRET'
  ];

  for (const key of required) {
    if (missing(env, key)) {
      errors.push(`${key} is required in production`);
    }
  }

  if (!missing(env, 'DATABASE_URL')) {
    // DATABASE_URL alone is enough
  } else if (missing(env, 'DB_HOST') || missing(env, 'DB_NAME') || missing(env, 'DB_USER')) {
    errors.push('DATABASE_URL or DB_HOST/DB_NAME/DB_USER are required in production');
  }

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = String(env[key] || '').trim();
    if (value && INSECURE_JWT_FALLBACKS.has(value)) {
      errors.push(`${key} must not use a known insecure default in production`);
    }
  }

  if (
    !missing(env, 'JWT_SECRET') &&
    !missing(env, 'JWT_REFRESH_SECRET') &&
    env.JWT_SECRET === env.JWT_REFRESH_SECRET
  ) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be distinct in production');
  }

  return errors.length ? { ok: false, errors } : { ok: true };
};

/**
 * Throws if production configuration is unsafe.
 * @param {NodeJS.ProcessEnv} [env]
 */
const assertProductionConfig = (env = process.env) => {
  const result = validateEnv(env);
  if (!result.ok) {
    const message = `Unsafe production configuration:\n- ${result.errors.join('\n- ')}`;
    const error = new Error(message);
    error.code = 'INVALID_ENV';
    error.errors = result.errors;
    throw error;
  }
  return result;
};

module.exports = {
  validateEnv,
  assertProductionConfig,
  isProduction,
  INSECURE_JWT_FALLBACKS
};
