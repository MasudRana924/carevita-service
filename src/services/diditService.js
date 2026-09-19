const crypto = require('crypto');
const axios = require('axios');
const diditConfig = require('../config/didit');

const OPEN_STATUSES = new Set([
  'Not Started',
  'In Progress',
  'Resubmitted',
  'Awaiting User',
  'In Review'
]);

const APPROVED_STATUS = 'Approved';
const NEGATIVE_STATUSES = new Set(['Declined', 'Kyc Expired']);

const isConfigured = () => Boolean(diditConfig.apiKey && diditConfig.workflowId);

const diditError = (message, status = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = status;
  error.details = details;
  return error;
};

const createSession = async ({
  vendorData,
  callback,
  email,
  language,
  metadata = {}
}) => {
  if (!isConfigured()) {
    throw diditError(
      'Didit eKYC is not configured. Set DIDIT_API_KEY and DIDIT_WORKFLOW_ID.',
      503
    );
  }

  const body = {
    workflow_id: diditConfig.workflowId,
    vendor_data: String(vendorData),
    metadata
  };

  if (callback) {
    body.callback = callback;
    body.callback_method = 'both';
  }

  if (email) {
    body.contact_details = {
      email,
      email_lang: language === 'bn' ? 'en' : (language || 'en')
    };
  }

  const response = await axios.post(
    `${diditConfig.apiUrl}/v3/session/`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': diditConfig.apiKey
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  if (response.status !== 201 && response.status !== 200) {
    const data = response.data;
    const fieldError = data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data)
          .map(([field, value]) => {
            const text = Array.isArray(value) ? value.join(', ') : (typeof value === 'string' ? value : '');
            return text ? `${field}: ${text}` : '';
          })
          .filter(Boolean)
          .join('; ')
      : '';
    const message =
      fieldError ||
      (data && (data.detail || data.message)) ||
      'Didit session create failed';
    console.error('Didit create session failed:', {
      status: response.status,
      workflowId: diditConfig.workflowId,
      data
    });
    throw diditError(message, response.status >= 400 && response.status < 500 ? response.status : 502, data);
  }

  return response.data;
};

const getDecision = async (sessionId) => {
  if (!diditConfig.apiKey) {
    throw diditError('Didit eKYC is not configured. Set DIDIT_API_KEY.', 503);
  }

  const response = await axios.get(
    `${diditConfig.apiUrl}/v3/session/${sessionId}/decision/`,
    {
      headers: {
        Accept: 'application/json',
        'x-api-key': diditConfig.apiKey
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  if (response.status === 404) {
    throw diditError('Didit session not found', 404);
  }

  if (response.status < 200 || response.status >= 300) {
    console.error('Didit retrieve session failed:', {
      status: response.status,
      data: response.data
    });
    throw diditError('Failed to retrieve Didit session', 502, response.data);
  }

  return response.data;
};

/**
 * Manually set Didit session to Approved / Declined / Resubmitted.
 * Eligible current statuses include In Review, Approved, Declined, etc.
 */
const updateSessionStatus = async (sessionId, { newStatus, comment } = {}) => {
  if (!diditConfig.apiKey) {
    throw diditError('Didit eKYC is not configured. Set DIDIT_API_KEY.', 503);
  }
  if (!sessionId) {
    throw diditError('session_id is required', 400);
  }
  if (!newStatus) {
    throw diditError('new_status is required', 400);
  }

  const body = { new_status: newStatus };
  if (comment) body.comment = String(comment).slice(0, 1000);

  const response = await axios.patch(
    `${diditConfig.apiUrl}/v3/session/${sessionId}/update-status/`,
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': diditConfig.apiKey
      },
      timeout: 30000,
      validateStatus: () => true
    }
  );

  if (response.status < 200 || response.status >= 300) {
    const data = response.data;
    const fieldError = data && typeof data === 'object' && !Array.isArray(data)
      ? Object.entries(data)
          .map(([field, value]) => {
            const text = Array.isArray(value) ? value.join(', ') : (typeof value === 'string' ? value : '');
            return text ? `${field}: ${text}` : '';
          })
          .filter(Boolean)
          .join('; ')
      : '';
    const message =
      fieldError ||
      (data && (data.detail || data.message)) ||
      'Didit update-status failed';
    console.error('Didit update-status failed:', {
      status: response.status,
      sessionId,
      newStatus,
      data
    });
    throw diditError(
      message,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      data
    );
  }

  return response.data;
};

const shortenFloats = (data) => {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, shortenFloats(value)])
    );
  }
  if (typeof data === 'number' && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
};

const sortKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortKeys(obj[key]);
      return acc;
    }, {});
  }
  return obj;
};

const safeEqualHex = (expected, received) => {
  if (!expected || !received) return false;
  const a = Buffer.from(String(expected), 'utf8');
  const b = Buffer.from(String(received), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const isTimestampFresh = (timestampHeader) => {
  const ts = parseInt(timestampHeader, 10);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= diditConfig.timestampWindowSeconds;
};

const verifySignatureV2 = (jsonBody, signatureHeader, secret) => {
  const canonical = JSON.stringify(sortKeys(shortenFloats(jsonBody)));
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
  return safeEqualHex(expected, signatureHeader);
};

const verifySignatureRaw = (rawBody, signatureHeader, secret) => {
  if (!rawBody) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signatureHeader);
};

const verifySignatureSimple = (jsonBody, signatureHeader, secret) => {
  const canonical = [
    jsonBody.timestamp ?? '',
    jsonBody.session_id ?? '',
    jsonBody.status ?? '',
    jsonBody.webhook_type ?? ''
  ].join(':');
  const expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  return safeEqualHex(expected, signatureHeader);
};

/**
 * @returns {{ ok: boolean, trustedDecision: boolean, reason?: string }}
 */
const verifyWebhook = ({ body, rawBody, signatureV2, signature, signatureSimple, timestamp }) => {
  const secret = diditConfig.webhookSecret;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, trustedDecision: false, reason: 'missing_secret' };
    }
    console.warn('DIDIT_WEBHOOK_SECRET is not set; skipping signature verification');
    return { ok: true, trustedDecision: true, reason: 'dev_skip' };
  }

  if (!timestamp || !isTimestampFresh(timestamp)) {
    return { ok: false, trustedDecision: false, reason: 'stale_timestamp' };
  }

  if (signatureV2 && verifySignatureV2(body, signatureV2, secret)) {
    return { ok: true, trustedDecision: true };
  }

  if (signature && verifySignatureRaw(rawBody, signature, secret)) {
    return { ok: true, trustedDecision: true };
  }

  if (signatureSimple && verifySignatureSimple(body, signatureSimple, secret)) {
    return { ok: true, trustedDecision: false };
  }

  return { ok: false, trustedDecision: false, reason: 'invalid_signature' };
};

module.exports = {
  OPEN_STATUSES,
  APPROVED_STATUS,
  NEGATIVE_STATUSES,
  isConfigured,
  createSession,
  getDecision,
  updateSessionStatus,
  verifyWebhook
};
