-- Product privacy policy CMS: one published policy per registration audience.
-- USER → family app registration; CAREGIVER → caregiver/nurse registration.

CREATE TABLE IF NOT EXISTS privacy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT 'Privacy Policy',
  content TEXT NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT privacy_policies_audience_check CHECK (audience IN ('USER', 'CAREGIVER')),
  CONSTRAINT privacy_policies_audience_unique UNIQUE (audience)
);

CREATE INDEX IF NOT EXISTS idx_privacy_policies_published
  ON privacy_policies (audience)
  WHERE is_published = true;
