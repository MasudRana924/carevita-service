require('dotenv').config();

/**
 * bKash Checkout sandbox config (override via .env)
 */
module.exports = {
  createURL:
    process.env.BKASH_CREATE_URL ||
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/create',
  executeURL:
    process.env.BKASH_EXECUTE_URL ||
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/payment/execute/',
  tokenURL:
    process.env.BKASH_TOKEN_URL ||
    'https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout/token/grant',
  script:
    process.env.BKASH_SCRIPT ||
    'https://scripts.sandbox.bka.sh/versions/1.2.0-beta/checkout/bKash-checkout-sandbox.js',
  app_key: process.env.BKASH_APP_KEY || '5nej5keguopj928ekcj3dne8p',
  app_secret:
    process.env.BKASH_APP_SECRET || '1honf6u1c56mqcivtc9ffl960slp4v2756jle5925nbooa46ch62',
  username: process.env.BKASH_USERNAME || 'testdemo',
  password: process.env.BKASH_PASSWORD || 'test%#de23@msdao',
  // id_token usually valid ~1 hour; refresh 5 min early
  tokenTtlSeconds: parseInt(process.env.BKASH_TOKEN_TTL_SECONDS || '3300', 10)
};
