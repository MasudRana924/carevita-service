-- Production edge-case hardening indexes / constraints

CREATE UNIQUE INDEX IF NOT EXISTS uq_safety_incidents_open_booking
  ON safety_incidents (booking_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_bookings_payout_frozen
  ON bookings (payout_frozen)
  WHERE payout_frozen = true;

CREATE INDEX IF NOT EXISTS idx_withdrawals_status_user
  ON withdrawals (caregiver_user_id, status);
