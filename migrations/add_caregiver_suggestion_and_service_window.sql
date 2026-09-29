-- Next-caregiver suggestion (user must confirm) and missed-start / end reminders
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggested_provider_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggestion_expires_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_notified_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_is_emergency BOOLEAN;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_start_reported_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_reminder_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_bookings_suggestion_expires
  ON bookings (suggestion_expires_at)
  WHERE status = 'SEARCHING_PROVIDER' AND suggested_provider_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_no_start_pending
  ON bookings (booking_date, start_time)
  WHERE status = 'PAYMENT_PAID' AND no_start_notified_at IS NULL;
