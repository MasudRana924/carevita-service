# ADR 008: Database Indexing Strategy

## Status
Accepted

## Context
The application had no explicit database indexes, leading to:
- Slow query performance on large datasets
- Full table scans on frequently queried columns
- Poor scalability as data grows

## Decision
Implement comprehensive indexing strategy for frequently queried columns.

### Benefits
- **Performance**: Faster query execution
- **Scalability**: Better performance with larger datasets
- **Efficiency**: Reduced database load

### Implementation
Created migration `001_add_performance_indexes.sql` with indexes for:

#### Bookings
- `idx_bookings_user_id`: User bookings lookup
- `idx_bookings_user_status`: Filter by user + status
- `idx_bookings_provider_status`: Provider bookings by status
- `idx_bookings_date_time`: Date/time range queries
- `idx_bookings_offer_expires`: Offer expiry queries (partial)

#### Users
- `idx_users_phone`: Phone lookup
- `idx_users_email`: Email lookup
- `idx_users_role`: Role-based queries

#### Caregiver Profiles
- `idx_caregiver_profiles_district_thana`: Location-based search
- `idx_caregiver_profiles_service_areas`: Array search (GIN index)
- `idx_caregiver_profiles_verification_status`: Filter by verification

#### Messages & Conversations
- `idx_messages_conversation_id`: Message lookup
- `idx_messages_is_read`: Unread message queries
- `idx_conversations_user_id`: User conversations

#### Payments & Wallet
- `idx_payments_booking_id`: Payment lookup
- `idx_wallet_provider_id`: Wallet lookup

### Index Types
- **B-tree**: Default for equality and range queries
- **GIN**: For array types (service_areas)
- **Partial**: For conditional indexes (offer_expires_at)

## Consequences
- **Positive**: Improved query performance
- **Negative**: Slower writes, increased storage
- **Mitigation**: Selective indexing, monitor query performance

## References
- PostgreSQL indexing documentation
- Database performance tuning
