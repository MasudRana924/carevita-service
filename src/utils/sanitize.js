const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'hashedpassword',
  'currentpassword',
  'newpassword'
]);

const sanitize = (value, seen = new WeakSet()) => {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return undefined;
  if (seen.has(value)) return undefined;

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen));
  }

  const cleaned = {};
  for (const [key, nested] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) continue;
    cleaned[key] = sanitize(nested, seen);
  }
  return cleaned;
};

module.exports = { sanitize };
