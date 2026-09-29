/**
 * Cache-aside reads on Upstash Redis.
 * Redis is tried first. Any miss, timeout, quota error, or outage falls
 * through to the database loader. Callers never fail because Redis failed.
 */

const { Redis } = require('@upstash/redis');

const TIMEOUT_MS = 800;
const COOLDOWN_MS = 30000;

let sharedClient = null;
let testClient = null;
let disabledUntil = 0;

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

/**
 * @param {string} key
 * @param {number} ttlSeconds
 * @param {() => Promise<any>} loader
 * @param {{ namespace?: string, cacheNull?: boolean }} [options]
 */
const getOrSet = async (key, ttlSeconds, loader, options = {}) => {
  const cacheNull = options.cacheNull !== false;
  const redis = getRedis();
  if (!redis) return loader();

  let fullKey = key;
  if (options.namespace) {
    try {
      const version = await withTimeout(redis.get(`ver:${options.namespace}`), TIMEOUT_MS);
      fullKey = `${key}:v${version == null ? 0 : version}`;
    } catch (error) {
      markFailed(error);
      return loader();
    }
  }

  try {
    const hit = await withTimeout(redis.get(fullKey), TIMEOUT_MS);
    if (hit != null) return hit;
  } catch (error) {
    markFailed(error);
    return loader();
  }

  const fresh = await loader();
  if (!cacheNull && (fresh == null)) return fresh;

  try {
    await withTimeout(redis.set(fullKey, fresh, { ex: ttlSeconds }), TIMEOUT_MS);
  } catch (error) {
    markFailed(error);
  }
  return fresh;
};

/**
 * Bumps a namespace version so the next read misses.
 * Failures are swallowed — TTL still expires stale entries.
 */
const bumpNamespace = async (namespace) => {
  const redis = getRedis();
  if (!redis) return;
  try {
    await withTimeout(redis.incr(`ver:${namespace}`), TIMEOUT_MS);
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
};

module.exports = {
  getOrSet,
  bumpNamespace,
  setRedisClientForTests,
  resetCacheForTests
};
