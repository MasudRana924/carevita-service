-- Support chat: exactly ONE conversation per user (WhatsApp-style thread with admin),
-- attachments (image / PDF), cursor-friendly indexes.
-- Idempotent: works on a fresh DB and on both historical conversation/message schemas.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS admin_unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_sender_role VARCHAR(20);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_role VARCHAR(20) NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text',
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mime VARCHAR(100);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_public_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100);

-- Legacy schema used sender_type/content; copy into the columns the API uses.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
    EXECUTE 'UPDATE messages SET sender_role = sender_type WHERE sender_role IS NULL';
    EXECUTE 'ALTER TABLE messages ALTER COLUMN sender_type DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') THEN
    EXECUTE 'UPDATE messages SET message = content WHERE message IS NULL';
    EXECUTE 'ALTER TABLE messages ALTER COLUMN content DROP NOT NULL';
  END IF;
END $$;

UPDATE messages SET sender_role = 'user' WHERE sender_role IS NULL;
ALTER TABLE messages ALTER COLUMN sender_role SET NOT NULL;
ALTER TABLE messages ALTER COLUMN message DROP NOT NULL;

-- Merge duplicate threads: keep the oldest conversation per user, move messages into it.
WITH ranked AS (
  SELECT id, user_id,
         FIRST_VALUE(id) OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS keep_id
  FROM conversations
)
UPDATE messages m
SET conversation_id = r.keep_id
FROM ranked r
WHERE m.conversation_id = r.id AND r.id <> r.keep_id;

DELETE FROM conversations c
USING conversations older
WHERE c.user_id = older.user_id
  AND (older.created_at < c.created_at OR (older.created_at = c.created_at AND older.id < c.id));

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_unread ON messages(conversation_id, sender_role) WHERE is_read = false;
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_client_message_id
  ON messages(conversation_id, client_message_id) WHERE client_message_id IS NOT NULL;

-- Rebuild denormalized counters after the merge.
UPDATE conversations c
SET
  user_unread_count = (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_role = 'admin' AND m.is_read = false),
  admin_unread_count = (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_role = 'user' AND m.is_read = false),
  last_message_at = (SELECT MAX(m.created_at) FROM messages m WHERE m.conversation_id = c.id),
  last_message_preview = (
    SELECT COALESCE(NULLIF(m.message, ''), CASE WHEN m.message_type = 'image' THEN 'Photo' ELSE 'Document' END)
    FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
  ),
  last_message_sender_role = (
    SELECT m.sender_role FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
  );
