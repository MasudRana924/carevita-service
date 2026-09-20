-- Caregiver must accept PROVIDER_ASSIGNED before offer_expires_at
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_bookings_offer_expires_at
  ON bookings (offer_expires_at)
  WHERE status = 'PROVIDER_ASSIGNED' AND offer_expires_at IS NOT NULL;
