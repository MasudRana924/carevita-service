const CacheService = require('../../../src/services/CacheService');

// Mock Redis client
jest.mock('../../../src/config/redis');

describe('CacheService', () => {
  let cacheService;
  let mockRedisClient;

  beforeEach(() => {
    cacheService = CacheService;
    mockRedisClient = require('../../../src/config/redis');
    jest.clearAllMocks();
  });

  describe('cacheUser', () => {
    it('should cache user data successfully', async () => {
      const mockUserId = 'user-uuid';
      const mockUserData = { id: mockUserId, name: 'John Doe' };
      
      mockRedisClient.set.mockResolvedValue(true);

      const result = await cacheService.cacheUser(mockUserId, mockUserData);

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'caremate:user:user-uuid',
        mockUserData,
        3600
      );
    });

    it('should handle caching errors gracefully', async () => {
      const mockUserId = 'user-uuid';
      const mockUserData = { id: mockUserId, name: 'John Doe' };
      
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.cacheUser(mockUserId, mockUserData);

      expect(result).toBe(false);
    });
  });

  describe('getCachedUser', () => {
    it('should retrieve cached user data', async () => {
      const mockUserId = 'user-uuid';
      const mockUserData = { id: mockUserId, name: 'John Doe' };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockUserData));

      const result = await cacheService.getCachedUser(mockUserId);

      expect(result).toEqual(mockUserData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('caremate:user:user-uuid');
    });

    it('should return null when user not cached', async () => {
      const mockUserId = 'user-uuid';
      
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getCachedUser(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('invalidateUser', () => {
    it('should invalidate user cache', async () => {
      const mockUserId = 'user-uuid';
      
      mockRedisClient.del.mockResolvedValue(true);

      const result = await cacheService.invalidateUser(mockUserId);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('caremate:user:user-uuid');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const identifier = 'user-123';
      const limit = 10;
      
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(true);

      const result = await cacheService.checkRateLimit(identifier, limit);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should deny requests exceeding limit', async () => {
      const identifier = 'user-123';
      const limit = 10;
      
      mockRedisClient.incr.mockResolvedValue(11);
      mockRedisClient.expire.mockResolvedValue(true);

      const result = await cacheService.checkRateLimit(identifier, limit);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('cacheCaregiverAvailability', () => {
    it('should cache caregiver availability with short TTL', async () => {
      const profileId = 'caregiver-uuid';
      const availability = { available: true };
      
      mockRedisClient.set.mockResolvedValue(true);

      const result = await cacheService.cacheCaregiverAvailability(profileId, availability);

      expect(result).toBe(true);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'caremate:availability:caregiver-uuid',
        availability,
        300
      );
    });
  });
});
