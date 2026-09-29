-- Booking columns for self-booking and frozen patient history.
-- Applied once via schema_migrations. Column adds also run on boot because
-- they are metadata-only and the insert path needs them immediately.

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
