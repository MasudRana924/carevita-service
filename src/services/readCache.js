/**
 * Cache-aside reads on Upstash Redis.
 * Redis is tried first. Any miss, timeout, quota error, or outage falls
 * through to the database loader. Callers never fail because Redis failed.
 */

const { Redis } = require('@upstash/redis');

const TIMEOUT_MS = 200;
const COOLDOWN_MS = 30000;
const VERSION_MEMORY_MS = 1000;

let sharedClient = null;
let testClient = null;
let disabledUntil = 0;
/** @type {Map<string, { version: number|string, expiresAt: number }>} */
const versionMemory = new Map();

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Redis timeout');
      error.code = 'REDIS_TIMEOUT';
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const markFailed = (error) => {
  disabledUntil = Date.now() + COOLDOWN_MS;
  console.error('Redis unavailable, reading from database:', error.message);
};

const isCoolingDown = () => Date.now() < disabledUntil;

const getRedis = () => {
  if (isCoolingDown()) return null;
  if (testClient) return testClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!sharedClient) {
    sharedClient = new Redis({ url, token });
  }
  return sharedClient;
};

const rememberVersion = (namespace, version) => {
  versionMemory.set(namespace, {
    version,
    expiresAt: Date.now() + VERSION_MEMORY_MS
  });
};

const readVersion = async (redis, namespace) => {
  const cached = versionMemory.get(namespace);
  if (cached && cached.expiresAt > Date.now()) return cached.version;

  const version = await withTimeout(redis.get(`ver:${namespace}`), TIMEOUT_MS);
  const normalized = version == null ? 0 : version;
  rememberVersion(namespace, normalized);
  return normalized;
};

/**
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<any>} loader
 * @param {{ namespace?: string, cacheNull?: boolean, serialize?: (value: any) => any, deserialize?: (value: any) => Promise<any>|any }} [options]
 */
const getOrSet = async (key, ttlSeconds, loader, options = {}) => {
  const cacheNull = options.cacheNull !== false;
  const redis = getRedis();
  if (!redis) return loader();

  let fullKey = key;
  if (options.namespace) {
    try {
      const version = await readVersion(redis, options.namespace);
      fullKey = `${key}:v${version}`;
    } catch (error) {
      markFailed(error);
      return loader();
    }
  }

  try {
    const hit = await withTimeout(redis.get(fullKey), TIMEOUT_MS);
    if (hit != null) {
      if (!options.deserialize) return hit;
      try {
        return await options.deserialize(hit);
      } catch (error) {
        console.error('Cache hydrate failed, reading from database:', error.message);
        return loader();
      }
    }
  } catch (error) {
    markFailed(error);
    return loader();
  }

  const fresh = await loader();
  if (!cacheNull && (fresh == null)) return fresh;

  const stored = options.serialize ? options.serialize(fresh) : fresh;
  try {
    await withTimeout(redis.set(fullKey, stored, { ex: ttlSeconds }), TIMEOUT_MS);
  } catch (error) {
    markFailed(error);
  }
  return fresh;
};

/**
 * Bumps a namespace version so the next read misses.
 * This process sees the new version immediately. Others see it within a second.
 * Failures are swallowed — TTL still expires stale entries.
 */
const bumpNamespace = async (namespace) => {
  versionMemory.delete(namespace);
  const redis = getRedis();
  if (!redis) return;
  try {
    const next = await withTimeout(redis.incr(`ver:${namespace}`), TIMEOUT_MS);
    rememberVersion(namespace, next);
  } catch (error) {
    markFailed(error);
  }
};

const setRedisClientForTests = (client) => {
  testClient = client;
  disabledUntil = 0;
};

const resetCacheForTests = () => {
  testClient = null;
  sharedClient = null;
  disabledUntil = 0;
  versionMemory.clear();
};

module.exports = {
  getOrSet,
  bumpNamespace,
  setRedisClientForTests,
  resetCacheForTests
};
