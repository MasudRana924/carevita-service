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

  const data = response.data;
  const body =
    data && typeof data === 'object' && !Array.isArray(data) ? data : {};

  if (!body.id_token) {
    const preview =
      typeof data === 'string' ? data.slice(0, 400) : data;
    console.error('bKash grant token failed:', {
      status: response.status,
      tokenURL: bkashConfig.tokenURL,
      usernameSet: Boolean(bkashConfig.username),
      appKeySet: Boolean(bkashConfig.app_key),
      data: preview
    });
    const bkashMsg =
      body.statusMessage ||
      body.errorMessage ||
      body.message ||
      body.msg ||
      null;
    const err = new Error(
      bkashMsg
        ? `bKash grant token failed: ${bkashMsg}`
        : body.status === 'fail'
          ? `bKash grant token failed (status=fail, HTTP ${response.status}) — check BKASH_USERNAME/PASSWORD/APP_KEY/APP_SECRET`
          : typeof data === 'string'
            ? `bKash grant token failed (HTTP ${response.status})`
            : `No id_token received from bKash (HTTP ${response.status})`
    );
    err.details = typeof data === 'string' ? { raw: preview } : body;
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

const queryBkashPayment = async (idToken, paymentID) => {
  const response = await axios.get(
    `${bkashConfig.queryURL}${paymentID}`,
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
        response.data?.errorMessageEn ||
        'bKash query payment HTTP error'
    );
    err.details = response.data;
    err.status = response.status;
    throw err;
  }

  return response.data;
};

const bkashError = (data, fallback) => {
  const message =
    data?.errorMessageEn ||
    data?.errorMessage ||
    data?.statusMessage ||
    data?.message ||
    fallback;
  const err = new Error(message);
  err.details = data;
  err.statusCode = 400;
  err.code = 'PAYMENT_FAILED';
  err.externalCode = data?.externalCode || data?.internalCode;
  return err;
};

const isTimeoutError = (error) =>
  error?.code === 'ECONNABORTED' ||
  /timeout/i.test(String(error?.message || ''));

const isRefundCompleted = (body) =>
  String(body?.refundTransactionStatus || '').toLowerCase() === 'completed';

const clip = (value, max = 255, fallback = '') =>
  String(value || fallback).slice(0, max);

const formatAmount = (amount) => Number(amount).toFixed(2);

/**
 * Tokenized Checkout v2 Refund Transaction
 * POST /v2/tokenized-checkout/refund/payment/transaction
 * Success only when refundTransactionStatus === Completed
 * On 30s timeout, caller should use refund status API.
 */
const refundBkashPayment = async (idToken, {
  paymentId,
  trxId,
  refundAmount,
  sku = 'CareMate',
  reason = 'Booking cancelled'
}) => {
  try {
    const response = await axios.post(
      bkashConfig.refundURL,
      {
        paymentId: String(paymentId),
        trxId: String(trxId),
        refundAmount: formatAmount(refundAmount),
        sku: clip(sku, 255, 'CareMate'),
        reason: clip(reason, 255, 'Refund')
      },
      {
        headers: authHeaders(idToken),
        timeout: 30000,
        validateStatus: () => true
      }
    );

    const body = response.data || {};
    if (response.status >= 400 || body.externalCode || body.errorMessageEn) {
      throw bkashError(body, 'bKash refund failed');
    }
    if (!isRefundCompleted(body)) {
      throw bkashError(body, `Refund not completed (${body.refundTransactionStatus || 'unknown'})`);
    }
    return body;
  } catch (error) {
    if (isTimeoutError(error)) {
      const timeoutErr = new Error('bKash refund timed out after 30 seconds');
      timeoutErr.code = 'REFUND_TIMEOUT';
      timeoutErr.details = { paymentId, trxId };
      throw timeoutErr;
    }
    throw error;
  }
};

/**
 * Tokenized Checkout v2 Refund Status
 * POST /v2/tokenized-checkout/refund/payment/status
 */
const queryBkashRefundStatus = async (idToken, { paymentId, trxId }) => {
  const response = await axios.post(
    bkashConfig.refundStatusURL,
    {
      paymentId: String(paymentId),
      trxId: String(trxId)
    },
    {
      headers: authHeaders(idToken),
      timeout: 30000,
      validateStatus: () => true
    }
  );

  const body = response.data || {};
  if (response.status >= 400 || body.externalCode || body.errorMessageEn) {
    throw bkashError(body, 'bKash refund status failed');
  }
  return body;
};

const findCompletedRefund = (statusBody, refundAmount) => {
  const list = statusBody?.refundTransactions || [];
  const target = formatAmount(refundAmount);
  return list.find((item) => {
    const completed = String(item.refundTransactionStatus || '').toLowerCase() === 'completed';
    if (!completed) return false;
    if (refundAmount == null) return true;
    return formatAmount(item.refundAmount) === target;
  }) || null;
};

module.exports = {
  grantTokenFromBkash,
  grantAndSaveUserToken,
  ensureUserToken,
  createBkashPayment,
  executeBkashPayment,
  queryBkashPayment,
  refundBkashPayment,
  queryBkashRefundStatus,
  findCompletedRefund,
  isRefundCompleted,
  bkashConfig
};
