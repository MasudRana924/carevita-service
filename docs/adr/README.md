# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the CareMate project.

## What are ADRs?

ADRs document important architectural decisions made in the project, including:
- Context and problem statement
- Decision made
- Consequences of the decision
- References for further reading

## ADR List

1. **[ADR 001: Repository Pattern for Data Access](./001-repository-pattern.md)** - Abstracting database operations
2. **[ADR 002: Redis Caching Layer](./002-redis-caching-layer.md)** - Implementing Redis for performance
3. **[ADR 003: Message Queue for Async Tasks](./003-message-queue-async-tasks.md)** - Bull queue for background jobs
4. **[ADR 004: Structured Logging with Winston](./004-structured-logging.md)** - Production-ready logging
5. **[ADR 005: Service Layer Refactoring](./005-service-layer-refactoring.md)** - Splitting large service files
6. **[ADR 006: Docker Containerization](./006-docker-containerization.md)** - Container-based deployment
7. **[ADR 007: Socket.IO Redis Adapter](./007-socket-io-redis-adapter.md)** - Scaling real-time features
8. **[ADR 008: Database Indexing Strategy](./008-database-indexing-strategy.md)** - Performance optimization

## ADR Template

```markdown
# ADR XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[What is the problem we're trying to solve?]

## Decision
[What decision did we make?]

### Benefits
[List the benefits]

### Implementation
[How did we implement it?]

## Consequences
[What are the consequences of this decision?]

## References
[Links to relevant documentation]
```

## Adding New ADRs

When making a significant architectural decision:
1. Create a new ADR file following the template
2. Use sequential numbering (009, 010, etc.)
3. Update this README
4. Review with the team before accepting
