const axios = require('axios');
const bkashConfig = require('../config/bkash');
const { upsertToken, getValidToken } = require('../models/BkashToken');

/**
 * Grant token from bKash.
 * Response shape:
 * { token_type, id_token, expires_in, refresh_token }
 */
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
        Accept: 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  const data = response.data || {};

  if (!data.id_token) {
    console.error('bKash grant token failed:', {
      status: response.status,
      data
    });
    const err = new Error(
      data.statusMessage ||
        data.errorMessage ||
        data.message ||
        'No id_token received from bKash'
    );
    err.details = data;
    err.status = response.status;
    throw err;
  }

  return data;
};

/**
 * Always grant fresh token for this user, save in bkash_tokens, return id_token.
 * Used before create / execute payment.
 */
const grantAndSaveUserToken = async (userId) => {
  const granted = await grantTokenFromBkash();
  const ttlSec = Number(granted.expires_in) || bkashConfig.tokenTtlSeconds;
  const expiresAt = new Date(Date.now() + ttlSec * 1000);

  await upsertToken(userId, granted.id_token, expiresAt);

  return {
    id_token: granted.id_token,
    refresh_token: granted.refresh_token || null,
    expires_in: ttlSec,
    expires_at: expiresAt
  };
};

/**
 * Prefer valid DB token; otherwise grant + save.
 */
const ensureUserToken = async (userId) => {
  const existing = await getValidToken(userId);
  if (existing) return existing;

  const saved = await grantAndSaveUserToken(userId);
  return saved.id_token;
};

const authHeaders = (idToken) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
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
      timeout: 30000,
      validateStatus: () => true
    }
  );

  if (response.status >= 400) {
    const err = new Error(
      response.data?.statusMessage ||
        response.data?.errorMessage ||
        'bKash create payment HTTP error'
    );
    err.details = response.data;
    err.status = response.status;
    throw err;
  }

  return response.data;
};

const executeBkashPayment = async (idToken, paymentID) => {
  const response = await axios.post(
    `${bkashConfig.executeURL}${paymentID}`,
    {},
    {
      headers: authHeaders(idToken),
      timeout: 30000,
      validateStatus: () => true
    }
  );

  if (response.status >= 400) {
    const err = new Error(
      response.data?.statusMessage ||
        response.data?.errorMessage ||
        'bKash execute payment HTTP error'
    );
    err.details = response.data;
    err.status = response.status;
    throw err;
  }

  return response.data;
};

module.exports = {
  grantTokenFromBkash,
  grantAndSaveUserToken,
  ensureUserToken,
  createBkashPayment,
  executeBkashPayment,
  bkashConfig
};
