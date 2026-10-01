-- Account-level gender (USER and CAREGIVER). caregiver_profiles keeps its own copy for search/booking cards.
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Caregivers created before this migration stored photo/gender/dob only on caregiver_profiles.
UPDATE users u
SET gender = COALESCE(u.gender, cp.gender),
    date_of_birth = COALESCE(u.date_of_birth, cp.date_of_birth),
    profile_photo = COALESCE(u.profile_photo, cp.profile_photo)
FROM caregiver_profiles cp
WHERE cp.user_id = u.id
  AND (u.gender IS NULL OR u.date_of_birth IS NULL OR u.profile_photo IS NULL);
