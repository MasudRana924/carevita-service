-- CareMate core additions: district/thana, FCM tokens, inbox, family address fields
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS thana VARCHAR(100);

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS thana VARCHAR(100);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS house TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS existing_conditions TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS current_medications TEXT;

CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, device_id, platform)
);

CREATE TABLE IF NOT EXISTS inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  type VARCHAR(100),
  reference_id UUID,
  reference_type VARCHAR(50),
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_district ON caregiver_profiles(district);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_thana ON caregiver_profiles(thana);
CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_user_unread ON inbox(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON notification_tokens(user_id);
