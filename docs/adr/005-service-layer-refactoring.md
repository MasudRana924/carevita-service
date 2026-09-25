# ADR 005: Service Layer Refactoring

## Status
Accepted

## Context
The `bookingService.js` file had grown to 834 lines with multiple responsibilities:
- Booking creation
- Status transitions
- Cancellation logic
- Review submission
- Dispute handling

This caused:
- Difficult maintenance
- Hard to test individual features
- Violation of Single Responsibility Principle
- Merge conflicts in large files

## Decision
Refactor large service files into smaller, focused modules following Single Responsibility Principle.

### Benefits
- **Maintainability**: Smaller, focused files
- **Testability**: Easier to test individual features
- **Readability**: Clear separation of concerns
- **Collaboration**: Reduced merge conflicts

### Implementation
Split `bookingService.js` into:
- `BookingCreationService`: Booking creation logic
- `BookingStatusService`: Status transitions (accept, start, complete)
- `BookingCancellationService`: Cancellation and rejection
- `BookingReviewService`: Review submission
- `BookingDisputeService`: Dispute creation

Each service:
- Has a single responsibility
- Exports a singleton instance
- Uses repositories for data access
- Uses custom error classes

## Consequences
- **Positive**: Better code organization, easier maintenance
- **Negative**: More files to navigate
- **Mitigation**: Clear naming conventions, index files for imports

## References
- Single Responsibility Principle
- Clean Architecture
