const { getIO } = require('./socket');

/**
 * Emit new message to relevant parties
 */
const emitNewMessage = (conversationId, message) => {
  const io = getIO();
  if (!io) return;

  // Emit to admin room (when user sends message)
  io.to('admin').emit('conversation:message', {
    conversation_id: conversationId,
    message
  });

  // Emit to user's personal room (when admin replies)
  io.to(`user:${conversationId}`).emit('conversation:message', {
    conversation_id: conversationId,
    message
  });
};

module.exports = {
  emitNewMessage
};
