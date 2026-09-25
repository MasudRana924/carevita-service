# ADR 001: Repository Pattern for Data Access

## Status
Accepted

## Context
The codebase had database queries scattered across models and services, making it difficult to:
- Maintain consistent data access logic
- Test business logic independently of database
- Switch database implementations if needed
- Enforce data access patterns

## Decision
Implement the Repository Pattern to abstract database operations behind dedicated repository classes.

### Benefits
- **Separation of Concerns**: Business logic in services, data access in repositories
- **Testability**: Easy to mock repositories for unit testing
- **Maintainability**: Centralized data access logic
- **Flexibility**: Easier to switch database implementations or add caching

### Implementation
- Created `BaseRepository` class with common CRUD operations
- Created specific repositories: `BookingRepository`, `UserRepository`, `CaregiverProfileRepository`
- Repositories handle all SQL queries and data transformations
- Services use repositories instead of direct database access

## Consequences
- **Positive**: Cleaner code, better testability, consistent data access
- **Negative**: Additional layer of abstraction (more files to maintain)
- **Mitigation**: Keep repositories focused on data access only, no business logic

## References
- [Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html)
