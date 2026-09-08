-- Add district and thana to caregiver profiles for location-based search
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE caregiver_profiles ADD COLUMN IF NOT EXISTS thana VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_district ON caregiver_profiles(district);
CREATE INDEX IF NOT EXISTS idx_caregiver_profiles_thana ON caregiver_profiles(thana);
