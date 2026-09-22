-- P0/P1: nurse subtype, safety incidents, location consent, money snapshot meta

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS provider_type VARCHAR(20) NOT NULL DEFAULT 'CAREGIVER';

ALTER TABLE caregiver_profiles
  DROP CONSTRAINT IF EXISTS caregiver_profiles_provider_type_check;

ALTER TABLE caregiver_profiles
  ADD CONSTRAINT caregiver_profiles_provider_type_check
  CHECK (provider_type IN ('CAREGIVER', 'NURSE'));

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS credential_number VARCHAR(100);

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS credential_type VARCHAR(100);

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS credential_status VARCHAR(50) DEFAULT 'UNVERIFIED';

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS credential_expires_at DATE;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS specialization TEXT;

ALTER TABLE caregiver_profiles
  ADD COLUMN IF NOT EXISTS credential_note TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS money_rules_snapshot JSONB DEFAULT '{}'::jsonb;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payout_frozen BOOLEAN DEFAULT false;

ALTER TABLE booking_live_locations
  ADD COLUMN IF NOT EXISTS consent_granted BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
  admin_note TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_booking ON safety_incidents(booking_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);

CREATE INDEX IF NOT EXISTS idx_caregiver_provider_type ON caregiver_profiles(provider_type);
