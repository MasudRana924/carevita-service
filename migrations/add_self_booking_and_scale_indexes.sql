-- Self-booking flag + patient snapshot, and indexes for the hot read/write paths.
-- Idempotent: safe to run on boot and via migrate:sql.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS book_for VARCHAR(20) NOT NULL DEFAULT 'FAMILY';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS patient_snapshot JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_book_for_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_book_for_check
      CHECK (book_for IN ('SELF', 'FAMILY'));
  END IF;
END $$;

-- Overlap checks when assigning / accepting a caregiver
CREATE INDEX IF NOT EXISTS idx_bookings_overlap_active
  ON bookings (provider_id, booking_date, start_time, end_time)
  WHERE provider_type = 'CAREGIVER'
    AND status IN ('PROVIDER_ASSIGNED', 'PROVIDER_ACCEPTED', 'PAYMENT_PAID', 'SERVICE_IN_PROGRESS');

-- User booking list: WHERE user_id ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_bookings_user_created
  ON bookings (user_id, created_at DESC);

-- Caregiver job list
CREATE INDEX IF NOT EXISTS idx_bookings_provider_date
  ON bookings (provider_id, provider_type, booking_date);

-- Admin dashboard counts and 7-day charts
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON bookings (created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date
  ON bookings (booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings (payment_status);

CREATE INDEX IF NOT EXISTS idx_payments_completed
  ON payments (status)
  WHERE status = 'COMPLETED';

CREATE INDEX IF NOT EXISTS idx_family_members_user_created
  ON family_members (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_caregiver_district_lower
  ON caregiver_profiles (lower(district));

CREATE INDEX IF NOT EXISTS idx_caregiver_thana_lower
  ON caregiver_profiles (lower(thana));

CREATE INDEX IF NOT EXISTS idx_caregiver_available_match
  ON caregiver_profiles (lower(district), lower(thana), rating DESC, completed_bookings DESC)
  WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_caregiver_rating_bookings
  ON caregiver_profiles (rating DESC NULLS LAST, completed_bookings DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_hospitals_active_district
  ON hospitals (district, name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_booking_history_booking
  ON booking_status_history (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_status
  ON users (status);
