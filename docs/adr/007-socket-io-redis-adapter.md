# ADR 007: Socket.IO Redis Adapter for Scaling

## Status
Accepted

## Context
The application uses Socket.IO for real-time features:
- Live tracking
- Conversation updates
- Booking notifications

Single server instance limitations:
- No horizontal scaling
- Connection limits per instance
- Single point of failure
- No cross-instance communication

## Decision
Implement Socket.IO Redis adapter to enable horizontal scaling and cross-instance communication.

### Benefits
- **Scalability**: Multiple server instances
- **Reliability**: No single point of failure
- **Communication**: Cross-instance message passing
- **Load Balancing**: Distribute connections

### Implementation
- Added `@socket.io/redis-adapter` dependency
- Configured Redis adapter in Socket.IO initialization
- Adapter automatically enabled when Redis is available
- Falls back to in-memory adapter if Redis unavailable
- Pub/sub pattern for message distribution

### Configuration
```javascript
if (redisClient.isReady()) {
  const pubClient = redisClient.getClient();
  const subClient = pubClient.duplicate();
  ioOptions.adapter = createAdapter(pubClient, subClient);
}
```

## Consequences
- **Positive**: Horizontal scaling, better reliability
- **Negative**: Redis dependency, slight latency increase
- **Mitigation**: Graceful fallback, monitoring

## References
- Socket.IO Redis adapter documentation
- Real-time architecture patterns
