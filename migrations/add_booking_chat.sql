-- USER <-> CAREGIVER chat, open only while a booking is SERVICE_IN_PROGRESS.
-- Rows are hard-deleted when the service ends (completed or cancelled).
CREATE TABLE IF NOT EXISTS booking_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('USER', 'CAREGIVER')),
  message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document')),
  message TEXT,
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  attachment_mime VARCHAR(100),
  attachment_size INTEGER,
  attachment_public_id TEXT,
  client_message_id VARCHAR(100),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_chat_messages_booking_created
  ON booking_chat_messages (booking_id, created_at, id);

CREATE INDEX IF NOT EXISTS idx_booking_chat_messages_unread
  ON booking_chat_messages (booking_id, sender_role)
  WHERE is_read = false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_chat_messages_client_id
  ON booking_chat_messages (booking_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
