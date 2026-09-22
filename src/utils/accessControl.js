/**
 * Shared server-side access checks (never trust client role/ids).
 */

const accessDenied = (message = 'Access denied') => {
  const error = new Error(message);
  error.statusCode = 403;
  error.code = 'FORBIDDEN';
  return error;
};

const notFound = (message = 'Not found') => {
  const error = new Error(message);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  return error;
};

const isAdmin = (user) => user?.role === 'ADMIN';

const assertAuthenticated = (user) => {
  if (!user?.id) throw accessDenied('Authentication required');
  return user;
};

/** USER may only touch their own user id unless ADMIN. */
const assertSelfOrAdmin = (user, resourceUserId) => {
  assertAuthenticated(user);
  if (isAdmin(user)) return true;
  if (String(user.id) !== String(resourceUserId)) {
    throw accessDenied();
  }
  return true;
};

/**
 * Booking access: owner, assigned caregiver (caller sets asProvider), or admin.
 */
const assertBookingParticipant = (user, booking, { asProvider = false } = {}) => {
  assertAuthenticated(user);
  if (!booking) throw notFound('Booking not found');
  if (isAdmin(user)) return { isAdmin: true, isOwner: false, asProvider: false };
  const isOwner = String(booking.user_id) === String(user.id);
  if (!isOwner && !asProvider) throw accessDenied();
  return { isAdmin: false, isOwner, asProvider: !!asProvider };
};

/** Family member must belong to the requesting USER (admins use separate admin APIs). */
const assertFamilyMemberOwner = (user, member) => {
  assertAuthenticated(user);
  if (!member) throw notFound('Family member not found');
  if (isAdmin(user)) return true;
  if (String(member.user_id) !== String(user.id)) throw accessDenied();
  return true;
};

module.exports = {
  accessDenied,
  notFound,
  isAdmin,
  assertAuthenticated,
  assertSelfOrAdmin,
  assertBookingParticipant,
  assertFamilyMemberOwner
};
