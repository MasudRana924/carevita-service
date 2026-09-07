-- Add eKYC columns to users table (defaults to false on registration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ekyc_status BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ekyc_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ekyc_reference_id TEXT;
