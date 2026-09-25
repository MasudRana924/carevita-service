# ADR 002: Redis Caching Layer

## Status
Accepted

## Context
The application frequently accesses the same data (user profiles, caregiver availability, booking details) leading to:
- Repeated database queries
- Increased database load
- Slower response times
- Potential scalability bottlenecks

## Decision
Implement Redis as a caching layer to store frequently accessed data with appropriate TTL (Time To Live).

### Benefits
- **Performance**: Reduced database load, faster response times
- **Scalability**: Offload read operations to Redis
- **Rate Limiting**: Built-in rate limiting support
- **Session Storage**: Centralized session management

### Implementation
- Created `RedisClient` wrapper for ioredis
- Created `CacheService` with typed cache methods
- Cache keys use prefix pattern: `caremate:{entity}:{id}`
- Different TTL for different data types:
  - User data: 1 hour
  - Caregiver availability: 5 minutes
  - Search results: 5 minutes
  - Pricing data: 24 hours

### Cache Invalidation Strategy
- Manual invalidation on data updates
- TTL-based expiration
- Pattern-based bulk invalidation when needed

## Consequences
- **Positive**: Improved performance, reduced database load
- **Negative**: Cache invalidation complexity, additional infrastructure
- **Mitigation**: Clear cache invalidation patterns, monitoring cache hit rates

## References
- Redis documentation
- Cache invalidation patterns
