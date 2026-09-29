-- Scale indexes. Applied once.
-- CONCURRENTLY avoids a write lock on large tables. It cannot run inside a
-- transaction, and it fails on a PgBouncer transaction pooler.
-- Set DATABASE_DIRECT_URL to the non-pooler Postgres URL so these stay concurrent.
-- Without that URL the migrator strips CONCURRENTLY and still runs each
-- statement once, outside server boot.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_overlap_active
  ON bookings (provider_id, booking_date, start_time, end_time)
  WHERE provider_type = 'CAREGIVER'
    AND status IN ('PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PAYMENT_PAID', 'SERVICE_IN_PROGRESS');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_created
  ON bookings (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_date
  ON bookings (provider_id, provider_type, booking_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_created_at
  ON bookings (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_booking_date
  ON bookings (booking_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_status
  ON bookings (payment_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_completed
  ON payments (status)
  WHERE status = 'COMPLETED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_family_members_user_created
  ON family_members (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_caregiver_district_lower
  ON caregiver_profiles (lower(district));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_caregiver_thana_lower
  ON caregiver_profiles (lower(thana));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_caregiver_available_match
  ON caregiver_profiles (lower(district), lower(thana), rating DESC, completed_bookings DESC)
  WHERE is_available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_caregiver_rating_bookings
  ON caregiver_profiles (rating DESC NULLS LAST, completed_bookings DESC NULLS LAST);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hospitals_active_district
  ON hospitals (district, name)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_booking_history_booking
  ON booking_status_history (booking_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_status
  ON users (status);
