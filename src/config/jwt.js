const jwt = require('jsonwebtoken');
require('dotenv').config();

const INSECURE_DEFAULTS = new Set([
  'your-secret-key',
  'your-refresh-secret-key',
  'caremet924'
]);

const resolveSecret = (envKey, insecureFallback) => {
  const value = process.env[envKey];
  if (value && String(value).trim()) return String(value).trim();
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error(`${envKey} is required in production`);
  }
  return insecureFallback;
};

const JWT_SECRET = resolveSecret('JWT_SECRET', 'your-secret-key');
const JWT_REFRESH_SECRET = resolveSecret('JWT_REFRESH_SECRET', 'your-refresh-secret-key');

/** Access token ~15 minutes unless overridden (legacy clients may set 7d via env). */
const JWT_EXPIRE = process.env.JWT_EXPIRE || '15m';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

const parseDurationToMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  if (/^\d+$/.test(String(value))) return Number(value) * 1000;
  const match = String(value).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const mult = { s: 1000, m: 60 * 1000, h: 3600 * 1000, d: 86400 * 1000 }[unit];
  return amount * mult;
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRE });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

const getRefreshExpiresAt = () => {
  const ms = parseDurationToMs(JWT_REFRESH_EXPIRE, 30 * 24 * 3600 * 1000);
  return new Date(Date.now() + ms);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  getRefreshExpiresAt,
  JWT_EXPIRE,
  JWT_REFRESH_EXPIRE,
  INSECURE_DEFAULTS
};
