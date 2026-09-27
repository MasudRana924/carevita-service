# ADR 004: Structured Logging with Winston

## Status
Accepted

## Context
The application used console.log statements for logging, which:
- Lacked structure and consistency
- Made debugging difficult in production
- Had no log levels or filtering
- Couldn't be easily integrated with log aggregation tools

## Decision
Implement Winston for structured, production-ready logging.

### Benefits
- **Structured Logs**: JSON format for easy parsing
- **Log Levels**: Error, warn, info, debug
- **Transports**: File, console, and extensible to others
- **Rotation**: Automatic log file rotation
- **Context**: Request ID, user ID, and other metadata

### Implementation
- Created logger configuration with Winston
- Multiple transports:
  - `combined.log`: All logs
  - `error.log`: Error logs only
  - Console: Development only
- Log format: JSON with timestamp, level, message, metadata
- Request logging middleware for HTTP requests
- Error logging middleware for errors
- Specialized loggers for:
  - Database queries
  - External API calls
  - Cache operations
  - Business events
  - Security events

### Log Levels
- `error`: Errors that need immediate attention
- `warn`: Warning issues
- `info`: General informational messages
- `debug`: Detailed debugging (development)

## Consequences
- **Positive**: Better observability, easier debugging
- **Negative**: Additional dependency, disk space usage
- **Mitigation**: Log rotation, log level configuration

## References
- Winston documentation
- 12-factor app logging
