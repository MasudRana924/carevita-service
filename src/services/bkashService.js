const axios = require('axios');
const bkashConfig = require('../config/bkash');
const {
  upsertToken,
  getValidToken
} = require('../models/BkashToken');

const grantTokenFromBkash = async () => {
  const response = await axios.post(
    bkashConfig.tokenURL,
    {
      app_key: bkashConfig.app_key,
      app_secret: bkashConfig.app_secret
    },
    {
      headers: {
        'Content-Type': 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password
      },
      timeout: 30000
    }
  );

  if (!response.data?.id_token) {
    const err = new Error('No id_token received from bKash');
    err.details = response.data;
    throw err;
  }

  return response.data;
};

/**
 * Ensure user has a valid bKash id_token in DB; grant + save if missing/expired.
 */
const ensureUserToken = async (userId) => {
  const existing = await getValidToken(userId);
  if (existing) return existing;

  const granted = await grantTokenFromBkash();
  const expiresAt = new Date(Date.now() + bkashConfig.tokenTtlSeconds * 1000);
  await upsertToken(userId, granted.id_token, expiresAt);
  return granted.id_token;
};

const authHeaders = (idToken) => ({
  'Content-Type': 'application/json',
  authorization: idToken,
  'x-app-key': bkashConfig.app_key
});

const createBkashPayment = async (idToken, { amount, merchantInvoiceNumber, intent = 'sale' }) => {
  const response = await axios.post(
    bkashConfig.createURL,
    {
      amount: String(amount),
      currency: 'BDT',
      merchantInvoiceNumber,
      intent
    },
    {
      headers: authHeaders(idToken),
      timeout: 30000
    }
  );
  return response.data;
};

const executeBkashPayment = async (idToken, paymentID) => {
  const response = await axios.post(
    `${bkashConfig.executeURL}${paymentID}`,
    {},
    {
      headers: authHeaders(idToken),
      timeout: 30000
    }
  );
  return response.data;
};

module.exports = {
  grantTokenFromBkash,
  ensureUserToken,
  createBkashPayment,
  executeBkashPayment,
  bkashConfig
};
