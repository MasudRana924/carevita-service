const Redis = require('ioredis');

/**
 * Redis Configuration and Client
 * Handles Redis connection and caching operations
 */
class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Initialize Redis connection
   */
  connect() {
    if (this.client) {
      return this.client;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.isConnected = false;
      console.log('Redis client connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });

    return this.client;
  }

  /**
   * Get Redis client instance
   */
  getClient() {
    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Set a value with expiration
   */
  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      await this.getClient().setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('Redis set error:', error);
      return false;
    }
  }

  /**
   * Get a value
   */
  async get(key) {
    try {
      const value = await this.getClient().get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  /**
   * Delete a key
   */
  async del(key) {
    try {
      await this.getClient().del(key);
      return true;
    } catch (error) {
      console.error('Redis del error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    try {
      const keys = await this.getClient().keys(pattern);
      if (keys.length > 0) {
        await this.getClient().del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Redis delPattern error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const result = await this.getClient().exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key, ttl) {
    try {
      await this.getClient().expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Redis expire error:', error);
      return false;
    }
  }

  /**
   * Get TTL of a key
   */
  async ttl(key) {
    try {
      return await this.getClient().ttl(key);
    } catch (error) {
      console.error('Redis ttl error:', error);
      return -1;
    }
  }

  /**
   * Increment a value
   */
  async incr(key) {
    try {
      return await this.getClient().incr(key);
    } catch (error) {
      console.error('Redis incr error:', error);
      return 0;
    }
  }

  /**
   * Decrement a value
   */
  async decr(key) {
    try {
      return await this.getClient().decr(key);
    } catch (error) {
      console.error('Redis decr error:', error);
      return 0;
    }
  }

  /**
   * Set hash field
   */
  async hset(key, field, value) {
    try {
      const serialized = JSON.stringify(value);
      await this.getClient().hset(key, field, serialized);
      return true;
    } catch (error) {
      console.error('Redis hset error:', error);
      return false;
    }
  }

  /**
   * Get hash field
   */
  async hget(key, field) {
    try {
      const value = await this.getClient().hget(key, field);
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error('Redis hget error:', error);
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall(key) {
    try {
      const hash = await this.getClient().hgetall(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      console.error('Redis hgetall error:', error);
      return {};
    }
  }

  /**
   * Delete hash field
   */
  async hdel(key, field) {
    try {
      await this.getClient().hdel(key, field);
      return true;
    } catch (error) {
      console.error('Redis hdel error:', error);
      return false;
    }
  }

  /**
   * Add to sorted set
   */
  async zadd(key, score, member) {
    try {
      await this.getClient().zadd(key, score, member);
      return true;
    } catch (error) {
      console.error('Redis zadd error:', error);
      return false;
    }
  }

  /**
   * Get from sorted set by range
   */
  async zrange(key, start = 0, end = -1, withScores = false) {
    try {
      if (withScores) {
        return await this.getClient().zrange(key, start, end, 'WITHSCORES');
      }
      return await this.getClient().zrange(key, start, end);
    } catch (error) {
      console.error('Redis zrange error:', error);
      return [];
    }
  }

  /**
   * Remove from sorted set
   */
  async zrem(key, member) {
    try {
      await this.getClient().zrem(key, member);
      return true;
    } catch (error) {
      console.error('Redis zrem error:', error);
      return false;
    }
  }

  /**
   * Flush all keys (use with caution)
   */
  async flushall() {
    try {
      await this.getClient().flushall();
      return true;
    } catch (error) {
      console.error('Redis flushall error:', error);
      return false;
    }
  }

  /**
   * Get database info
   */
  async info() {
    try {
      return await this.getClient().info();
    } catch (error) {
      console.error('Redis info error:', error);
      return null;
    }
  }
}

// Export singleton instance
const redisClient = new RedisClient();

module.exports = redisClient;
