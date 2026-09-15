-- Service start / complete + star-only reviews + earning settle on complete

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS earning_settled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_reminder_sent_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_profile_id UUID NOT NULL REFERENCES caregiver_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_caregiver ON reviews(caregiver_profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
