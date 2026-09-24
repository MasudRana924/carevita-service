const { getIO } = require('./socket');

/**
 * Emit new conversation to admin
 */
const emitNewConversation = (conversation, firstMessage) => {
  const io = getIO();
  if (!io) return;

  io.to('admin').emit('conversation:new', {
    conversation,
    first_message: firstMessage
  });
};

/**
 * Emit new message to relevant parties
 */
const emitNewMessage = (conversationId, message) => {
  const io = getIO();
  if (!io) return;

  // Emit to admin room
  io.to('admin').emit('conversation:message', {
    conversation_id: conversationId,
    message
  });

  // Emit to user's personal room
  io.to(`user:${message.conversation_id}`).emit('conversation:message', {
    conversation_id: conversationId,
    message
  });
};

/**
 * Emit conversation status update
 */
const emitConversationStatusUpdate = (conversationId, status) => {
  const io = getIO();
  if (!io) return;

  io.to('admin').emit('conversation:status', {
    conversation_id: conversationId,
    status
  });

  io.to(`user:${conversationId}`).emit('conversation:status', {
    conversation_id: conversationId,
    status
  });
};

module.exports = {
  emitNewConversation,
  emitNewMessage,
  emitConversationStatusUpdate
};
