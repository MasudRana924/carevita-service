-- Fix notification_tokens: add unique constraint required by ON CONFLICT
-- Remove duplicate rows first (keep newest)
DELETE FROM notification_tokens a
USING notification_tokens b
WHERE a.user_id = b.user_id
  AND a.device_id = b.device_id
  AND a.platform = b.platform
  AND a.ctid < b.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_tokens_user_device_platform_key'
  ) THEN
    ALTER TABLE notification_tokens
      ADD CONSTRAINT notification_tokens_user_device_platform_key
      UNIQUE (user_id, device_id, platform);
  END IF;
END $$;
