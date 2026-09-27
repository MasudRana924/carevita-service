const redisClient = require('../config/redis');

/**
 * Cache Service
 * Provides caching operations with automatic key generation and TTL management
 */
class CacheService {
  constructor() {
    this.prefix = 'caremate:';
    this.defaultTTL = 3600; // 1 hour
  }

  /**
   * Generate cache key with prefix
   */
  _key(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Cache user data
   */
  async cacheUser(userId, userData, ttl = this.defaultTTL) {
    const key = this._key(`user:${userId}`);
    return await redisClient.set(key, userData, ttl);
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId) {
    const key = this._key(`user:${userId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate user cache
   */
  async invalidateUser(userId) {
    const key = this._key(`user:${userId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache caregiver profile
   */
  async cacheCaregiverProfile(profileId, profileData, ttl = this.defaultTTL) {
    const key = this._key(`caregiver:${profileId}`);
    return await redisClient.set(key, profileData, ttl);
  }

  /**
   * Get cached caregiver profile
   */
  async getCachedCaregiverProfile(profileId) {
    const key = this._key(`caregiver:${profileId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate caregiver profile cache
   */
  async invalidateCaregiverProfile(profileId) {
    const key = this._key(`caregiver:${profileId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache caregiver availability
   */
  async cacheCaregiverAvailability(profileId, availability, ttl = 300) {
    const key = this._key(`availability:${profileId}`);
    return await redisClient.set(key, availability, ttl);
  }

  /**
   * Get cached caregiver availability
   */
  async getCachedCaregiverAvailability(profileId) {
    const key = this._key(`availability:${profileId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate caregiver availability cache
   */
  async invalidateCaregiverAvailability(profileId) {
    const key = this._key(`availability:${profileId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache booking data
   */
  async cacheBooking(bookingId, bookingData, ttl = this.defaultTTL) {
    const key = this._key(`booking:${bookingId}`);
    return await redisClient.set(key, bookingData, ttl);
  }

  /**
   * Get cached booking data
   */
  async getCachedBooking(bookingId) {
    const key = this._key(`booking:${bookingId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate booking cache
   */
  async invalidateBooking(bookingId) {
    const key = this._key(`booking:${bookingId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache user bookings list
   */
  async cacheUserBookings(userId, bookings, ttl = 600) {
    const key = this._key(`user_bookings:${userId}`);
    return await redisClient.set(key, bookings, ttl);
  }

  /**
   * Get cached user bookings
   */
  async getCachedUserBookings(userId) {
    const key = this._key(`user_bookings:${userId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate user bookings cache
   */
  async invalidateUserBookings(userId) {
    const key = this._key(`user_bookings:${userId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache caregiver bookings list
   */
  async cacheCaregiverBookings(profileId, bookings, ttl = 600) {
    const key = this._key(`caregiver_bookings:${profileId}`);
    return await redisClient.set(key, bookings, ttl);
  }

  /**
   * Get cached caregiver bookings
   */
  async getCachedCaregiverBookings(profileId) {
    const key = this._key(`caregiver_bookings:${profileId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate caregiver bookings cache
   */
  async invalidateCaregiverBookings(profileId) {
    const key = this._key(`caregiver_bookings:${profileId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(searchKey, results, ttl = 300) {
    const key = this._key(`search:${searchKey}`);
    return await redisClient.set(key, results, ttl);
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(searchKey) {
    const key = this._key(`search:${searchKey}`);
    return await redisClient.get(key);
  }

  /**
   * Cache family member data
   */
  async cacheFamilyMember(memberId, memberData, ttl = this.defaultTTL) {
    const key = this._key(`family_member:${memberId}`);
    return await redisClient.set(key, memberData, ttl);
  }

  /**
   * Get cached family member data
   */
  async getCachedFamilyMember(memberId) {
    const key = this._key(`family_member:${memberId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate family member cache
   */
  async invalidateFamilyMember(memberId) {
    const key = this._key(`family_member:${memberId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache hospital data
   */
  async cacheHospital(hospitalId, hospitalData, ttl = this.defaultTTL * 24) {
    const key = this._key(`hospital:${hospitalId}`);
    return await redisClient.set(key, hospitalData, ttl);
  }

  /**
   * Get cached hospital data
   */
  async getCachedHospital(hospitalId) {
    const key = this._key(`hospital:${hospitalId}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate hospital cache
   */
  async invalidateHospital(hospitalId) {
    const key = this._key(`hospital:${hospitalId}`);
    return await redisClient.del(key);
  }

  /**
   * Cache pricing data
   */
  async cachePricing(pricingKey, pricingData, ttl = this.defaultTTL * 24) {
    const key = this._key(`pricing:${pricingKey}`);
    return await redisClient.set(key, pricingData, ttl);
  }

  /**
   * Get cached pricing data
   */
  async getCachedPricing(pricingKey) {
    const key = this._key(`pricing:${pricingKey}`);
    return await redisClient.get(key);
  }

  /**
   * Invalidate pricing cache
   */
  async invalidatePricing(pricingKey) {
    const key = this._key(`pricing:${pricingKey}`);
    return await redisClient.del(key);
  }

  /**
   * Rate limit check
   */
  async checkRateLimit(identifier, limit, window = 60) {
    const key = this._key(`ratelimit:${identifier}`);
    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, window);
    }
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      reset: await redisClient.ttl(key)
    };
  }

  /**
   * Set session data
   */
  async setSession(sessionId, sessionData, ttl = 86400) {
    const key = this._key(`session:${sessionId}`);
    return await redisClient.set(key, sessionData, ttl);
  }

  /**
   * Get session data
   */
  async getSession(sessionId) {
    const key = this._key(`session:${sessionId}`);
    return await redisClient.get(key);
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId) {
    const key = this._key(`session:${sessionId}`);
    return await redisClient.del(key);
  }

  /**
   * Invalidate all cache for a pattern
   */
  async invalidatePattern(pattern) {
    const key = this._key(pattern);
    return await redisClient.delPattern(key);
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll() {
    return await redisClient.delPattern(this._key('*'));
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const info = await redisClient.info();
    const keyspace = info.match(/# Keyspace([\s\S]*?)(?=#|$)/);
    return {
      connected: redisClient.isReady(),
      keyspace: keyspace ? keyspace[1].trim() : 'No data'
    };
  }
}

module.exports = new CacheService();
