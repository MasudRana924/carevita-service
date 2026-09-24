-- Conversations and Messages for real-time admin-user messaging system
-- This supports Facebook Messenger-like real-time communication between
-- Admin and users (CAREGIVER, USER, NURSE)

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, closed, archived
  last_message_at TIMESTAMP,
  last_message_preview TEXT,
  user_unread_count INTEGER DEFAULT 0,
  admin_unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(50) NOT NULL, -- ADMIN, USER, CAREGIVER, NURSE
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, file, etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_admin_id ON conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Function to update conversation timestamp and unread counts
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_message_at and preview
  UPDATE conversations 
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.message, 100),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.conversation_id;

  -- Update unread counts based on sender
  IF NEW.sender_role = 'ADMIN' THEN
    UPDATE conversations 
    SET user_unread_count = user_unread_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations 
    SET admin_unread_count = admin_unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on message insert
CREATE TRIGGER trigger_update_conversation_metadata
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_metadata();

-- Function to decrement unread count when message is read
CREATE OR REPLACE FUNCTION decrement_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_read = false AND NEW.is_read = true THEN
    UPDATE conversations 
    SET 
      user_unread_count = CASE WHEN NEW.sender_role = 'ADMIN' THEN GREATEST(user_unread_count - 1, 0) ELSE user_unread_count END,
      admin_unread_count = CASE WHEN NEW.sender_role != 'ADMIN' THEN GREATEST(admin_unread_count - 1, 0) ELSE admin_unread_count END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on message update
CREATE TRIGGER trigger_decrement_unread_count
AFTER UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION decrement_unread_count();
