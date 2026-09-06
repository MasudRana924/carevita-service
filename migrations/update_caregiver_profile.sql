-- Add education, blood_group, date_of_birth to caregiver_profiles
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS education TEXT;
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- Add photo, details to hospitals
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS photo TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS details TEXT;
