const { getIO } = require('./socket');

/**
 * Emit new message to user (when admin replies)
 */
const emitNewMessage = (conversationId, message) => {
  const io = getIO();
  if (!io) return;

  // Emit to user's personal room
  io.to(`user:${conversationId}`).emit('conversation:message', {
    conversation_id: conversationId,
    message
  });
};

module.exports = {
  emitNewMessage
};
