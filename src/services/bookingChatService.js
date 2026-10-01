const BookingChat = require('../models/BookingChat');
const { findById } = require('../models/Booking');
const { findById: findUserById } = require('../models/User');
const { getCaregiverProfileByUserId, getCaregiverProfileById } = require('../models/CaregiverProfile');
const { notifyUser } = require('./pushNotificationService');
const { parseMessageInput } = require('./supportChatService');

const PUSH_TYPE = 'BOOKING_CHAT_MESSAGE';
const ROLE_USER = 'USER';
const ROLE_CAREGIVER = 'CAREGIVER';
const ACTIVE_STATUS = 'SERVICE_IN_PROGRESS';

const httpError = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });

const isChatActive = (booking) => booking?.status === ACTIVE_STATUS;

const otherRole = (role) => (role === ROLE_USER ? ROLE_CAREGIVER : ROLE_USER);

const userRoom = (userId) => `user:${userId}`;

const resolveCaregiverUserId = async (booking) => {
  if (booking.provider_type !== 'CAREGIVER' || !booking.provider_id) return null;
  const profile = await getCaregiverProfileById(booking.provider_id);
  return profile?.user_id || null;
};

/**
 * Loads the booking and works out which side of the chat `userId` is on.
 * Returns { booking, role, userId, caregiverUserId, counterpartUserId }.
 */
const resolveParticipant = async (bookingId, userId) => {
  const booking = await findById(bookingId);
  if (!booking) throw httpError('Booking not found', 404, 'NOT_FOUND');

  const caregiverUserId = await resolveCaregiverUserId(booking);
  let role = null;
  if (booking.user_id === userId) role = ROLE_USER;
  else if (caregiverUserId && caregiverUserId === userId) role = ROLE_CAREGIVER;
  if (!role) throw httpError('Access denied', 403, 'FORBIDDEN');

  return {
    booking,
    role,
    userId: booking.user_id,
    caregiverUserId,
    counterpartUserId: role === ROLE_USER ? caregiverUserId : booking.user_id
  };
};

const assertActive = (booking) => {
  if (!isChatActive(booking)) {
    throw httpError('Chat is only available while the service is in progress', 409, 'CHAT_CLOSED');
  }
};

const loadCounterpart = async (ctx) => {
  if (!ctx.counterpartUserId) return null;
  const user = await findUserById(ctx.counterpartUserId);
  if (!user) return null;

  let photo = user.profile_photo || null;
  if (ctx.role === ROLE_USER) {
    const profile = await getCaregiverProfileByUserId(ctx.counterpartUserId);
    photo = profile?.profile_photo || photo;
  }
  return {
    id: user.id,
    role: otherRole(ctx.role),
    name: user.name || null,
    photo
  };
};

const chatSummary = async (ctx) => {
  const active = isChatActive(ctx.booking);
  const [unread_count, last_message, counterpart] = await Promise.all([
    active ? BookingChat.countUnread(ctx.booking.id, otherRole(ctx.role)) : 0,
    active ? BookingChat.getLastMessage(ctx.booking.id) : null,
    loadCounterpart(ctx)
  ]);
  return {
    booking_id: ctx.booking.id,
    booking_number: ctx.booking.booking_number,
    is_active: active,
    my_role: ctx.role,
    unread_count,
    last_message,
    counterpart
  };
};

/** Chat block embedded in GET /bookings/:id. Null for viewers who are not participants (admin). */
const summaryForBooking = async (booking, viewerUserId) => {
  try {
    const ctx = await resolveParticipant(booking.id, viewerUserId);
    return await chatSummary(ctx);
  } catch (error) {
    if (error.statusCode === 403) return null;
    throw error;
  }
};

const getSummary = async (bookingId, userId) => chatSummary(await resolveParticipant(bookingId, userId));

const emitToParticipants = (ctx, event, payload) => {
  const { getIO } = require('../realtime/socket');
  const io = getIO();
  if (!io) return;
  [ctx.userId, ctx.caregiverUserId].filter(Boolean).forEach((id) => {
    io.to(userRoom(id)).emit(event, payload);
  });
};

const pushBodyFor = (message) => {
  if (message.message) {
    return message.message.length > 100 ? `${message.message.slice(0, 100)}...` : message.message;
  }
  return message.message_type === 'image' ? 'Sent you a photo' : 'Sent you a document';
};

const pushToCounterpart = (ctx, message) => {
  if (!ctx.counterpartUserId) return;
  notifyUser({
    userId: ctx.counterpartUserId,
    title: message.sender_name || (ctx.role === ROLE_USER ? 'Customer' : 'Caregiver'),
    body: pushBodyFor(message),
    type: PUSH_TYPE,
    bookingId: ctx.booking.id,
    referenceId: ctx.booking.id,
    referenceType: 'booking',
    skipInbox: true,
    data: {
      action: 'OPEN_BOOKING_CHAT',
      screen: 'booking_chat',
      booking_number: ctx.booking.booking_number,
      message_id: message.id,
      sender_role: ctx.role
    }
  }).catch((error) => console.error('Booking chat push failed:', error.message));
};

const sendMessage = async ({ bookingId, sender, input }) => {
  const ctx = await resolveParticipant(bookingId, sender.id);
  assertActive(ctx.booking);

  const result = await BookingChat.createMessage({
    booking_id: ctx.booking.id,
    sender_id: sender.id,
    sender_role: ctx.role,
    ...input
  });
  if (result.duplicate) return result;

  // Replying implies the sender has seen everything the other side sent.
  const readCount = await BookingChat.markRead(ctx.booking.id, otherRole(ctx.role));
  if (readCount > 0) {
    emitToParticipants(ctx, 'chat:read', {
      booking_id: ctx.booking.id,
      reader_role: ctx.role,
      read_at: new Date().toISOString()
    });
  }

  emitToParticipants(ctx, 'chat:message', result.message);
  pushToCounterpart(ctx, result.message);
  return result;
};

const getMessages = async ({ bookingId, userId, query }) => {
  const ctx = await resolveParticipant(bookingId, userId);
  const summary = await chatSummary(ctx);
  if (!summary.is_active) {
    return { messages: [], has_more: false, chat: summary };
  }

  const page = await BookingChat.getMessages(ctx.booking.id, query);
  if (!query.before && summary.unread_count > 0) {
    await markReadForCtx(ctx);
    summary.unread_count = 0;
  }
  return { ...page, chat: summary };
};

const markReadForCtx = async (ctx) => {
  const marked = await BookingChat.markRead(ctx.booking.id, otherRole(ctx.role));
  if (marked > 0) {
    emitToParticipants(ctx, 'chat:read', {
      booking_id: ctx.booking.id,
      reader_role: ctx.role,
      read_at: new Date().toISOString()
    });
  }
  return marked;
};

const markRead = async ({ bookingId, userId }) => {
  const ctx = await resolveParticipant(bookingId, userId);
  if (!isChatActive(ctx.booking)) return { marked: 0 };
  return { marked: await markReadForCtx(ctx) };
};

const sendTyping = async ({ bookingId, userId, isTyping }) => {
  const ctx = await resolveParticipant(bookingId, userId);
  assertActive(ctx.booking);
  if (!ctx.counterpartUserId) return;
  const { getIO } = require('../realtime/socket');
  const io = getIO();
  if (!io) return;
  io.to(userRoom(ctx.counterpartUserId)).emit('chat:typing', {
    booking_id: ctx.booking.id,
    sender_role: ctx.role,
    is_typing: isTyping === true
  });
};

const destroyAttachments = async (attachments) => {
  if (!attachments.length) return;
  const cloudinary = require('../config/cloudinary');
  await Promise.all(attachments.map(({ attachment_public_id: publicId, attachment_mime: mime }) =>
    cloudinary.v2.uploader
      .destroy(publicId, { resource_type: mime === 'application/pdf' ? 'raw' : 'image' })
      .catch((error) => console.error('Booking chat attachment delete failed:', error.message))
  ));
};

/**
 * Deletes the whole thread for a booking whose service has ended and tells both apps to close it.
 * Never throws: callers run this after the booking state change has already been committed.
 */
const purgeBookingChat = async (bookingId, { userId = null, caregiverUserId = null, reason = 'SERVICE_ENDED' } = {}) => {
  try {
    const attachments = await BookingChat.deleteByBookingId(bookingId);
    emitToParticipants({ userId, caregiverUserId }, 'chat:ended', { booking_id: bookingId, reason });
    destroyAttachments(attachments).catch(() => {});
  } catch (error) {
    console.error('Booking chat purge failed:', error.message);
  }
};

const purgeForBooking = async (booking, reason) => {
  const caregiverUserId = await resolveCaregiverUserId(booking).catch(() => null);
  return purgeBookingChat(booking.id, { userId: booking.user_id, caregiverUserId, reason });
};

/** Safety net for threads whose booking left SERVICE_IN_PROGRESS through a path that skipped the purge. */
const purgeStaleChats = async () => {
  const ids = await BookingChat.findStaleBookingIds();
  for (const id of ids) {
    const booking = await findById(id);
    if (booking) await purgeForBooking(booking, 'SERVICE_ENDED');
  }
  return ids.length;
};

module.exports = {
  PUSH_TYPE,
  ROLE_USER,
  ROLE_CAREGIVER,
  userRoom,
  isChatActive,
  parseMessageInput,
  resolveParticipant,
  summaryForBooking,
  getSummary,
  sendMessage,
  getMessages,
  markRead,
  sendTyping,
  purgeForBooking,
  purgeStaleChats
};
