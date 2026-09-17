require('dotenv').config();

/**
 * Render dashboard values often include wrapping quotes / trailing spaces.
 * Those make bKash grant-token return no id_token.
 */
const envOr = (name, fallback) => {
  const raw = process.env[name];
  if (raw == null) return fallback;
  let value = String(raw).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || fallback;
};

/**
 * bKash Checkout sandbox config (override via .env)
 */
module.exports = {
  createURL: envOr(
    'BKASH_CREATE_URL',
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create'
  ),
  executeURL: envOr(
    'BKASH_EXECUTE_URL',
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/execute/'
  ),
  queryURL: envOr(
    'BKASH_QUERY_URL',
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/query/'
  ),
  tokenURL: envOr(
    'BKASH_TOKEN_URL',
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/token/grant'
  ),
  refundURL: envOr(
    'BKASH_REFUND_URL',
    'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout/refund/payment/transaction'
  ),
  refundStatusURL: envOr(
    'BKASH_REFUND_STATUS_URL',
    'https://tokenized.sandbox.bka.sh/v2/tokenized-checkout/refund/payment/status'
  ),
  script: envOr(
    'BKASH_SCRIPT',
    'https://scripts.sandbox.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout-sandbox.js'
  ),
  app_key: envOr('BKASH_APP_KEY', '5nej5keguopj928ekcj3dne8p'),
  app_secret: envOr(
    'BKASH_APP_SECRET',
    '1honf6u1c56mqcivtc9ffl960slp4v2756jle5925nbooa46ch62'
  ),
  username: envOr('BKASH_USERNAME', 'testdemo'),
  password: envOr('BKASH_PASSWORD', 'test%#de23@msdao'),
  // id_token usually valid ~1 hour; refresh 5 min early
  tokenTtlSeconds: parseInt(envOr('BKASH_TOKEN_TTL_SECONDS', '3300'), 10)
};
