const publicUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    profile_photo: user.profile_photo || null,
    role: user.role,
    status: user.status || null,
    is_verified: user.is_verified,
    ekyc_status: user.ekyc_status,
    ekyc_session_status: user.ekyc_session_status || null,
    ekyc_verified_at: user.ekyc_verified_at || null,
    language_preference: user.language_preference || null,
    emergency_contact: user.emergency_contact || null,
    address: user.address || null,
    date_of_birth: user.date_of_birth || null,
    created_at: user.created_at || null,
    updated_at: user.updated_at || null
  };
};

const authUser = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    profile_photo: user.profile_photo || null,
    role: user.role,
    status: user.status || null,
    is_verified: user.is_verified,
    ekyc_status: user.ekyc_status,
    ekyc_session_status: user.ekyc_session_status || null
  };
};

module.exports = { publicUser, authUser };
