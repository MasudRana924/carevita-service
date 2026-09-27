# ADR 003: Message Queue for Async Tasks

## Status
Accepted

## Context
The application performs several time-consuming operations synchronously:
- Sending push notifications
- Sending emails
- Writing audit logs
- Generating reports

This causes:
- Slower API response times
- Potential timeouts
- Poor user experience
- No retry mechanism for failed operations

## Decision
Implement Bull (Redis-based queue) for asynchronous task processing.

### Benefits
- **Performance**: Faster API responses (offload to background)
- **Reliability**: Built-in retry mechanism
- **Scalability**: Multiple workers can process jobs
- **Monitoring**: Queue stats and job tracking
- **Separation**: Clear separation between API and background tasks

### Implementation
- Created `QueueManager` for Bull queue management
- Implemented specific queues:
  - `notifications`: Push notifications
  - `emails`: Email sending
  - `audit-logs`: Audit log writing
  - `cache-invalidation`: Cache invalidation
- Jobs have configurable priority, attempts, and backoff strategy
- Queue processors run with configurable concurrency

### Job Processing
- High priority: Audit logs (critical)
- Normal priority: Notifications, emails
- Low priority: Reports, cache invalidation

## Consequences
- **Positive**: Better performance, reliable task execution
- **Negative**: Additional complexity, Redis dependency
- **Mitigation**: Clear job definitions, monitoring queue health

## References
- Bull documentation
- Message queue patterns
