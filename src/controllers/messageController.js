const {
  createMessage,
  findMessagesByConversationId,
  findMessageById,
  markMessageAsRead,
  markConversationMessagesAsRead,
  countMessagesByConversationId,
  getUnreadMessagesByConversation,
  deleteMessage
} = require('../models/Message');
const { findConversationById } = require('../models/Conversation');
const { parsePagination } = require('../utils/pagination');
const { notifyUser } = require('../services/pushNotificationService');
const { getIO, emitNewMessage, emitMessageRead, emitAdminNewMessage } = require('../realtime/socket');

// Send a message in a conversation
exports.sendMessage = async (req, res) => {
  try {
    const { conversation_id, message, message_type = 'text' } = req.body;
    const sender_id = req.user.id;
    const sender_role = req.user.role;

    // Validate conversation exists
    const conversation = await findConversationById(conversation_id);
    if (!conversation) {
      return res.notFound('Conversation not found');
    }

    // Check authorization (admin or conversation owner)
    if (req.user.role !== 'ADMIN' && conversation.user_id !== req.user.id) {
      return res.forbidden('You do not have access to this conversation');
    }

    // Create the message
    const newMessage = await createMessage({
      conversation_id,
      sender_id,
      sender_role,
      message,
      message_type
    });

    // Emit real-time event via WebSocket
    emitNewMessage(conversation_id, newMessage);
    
    // Also emit to admin room if sender is not admin
    if (sender_role !== 'ADMIN') {
      emitAdminNewMessage(conversation_id, newMessage);
    }

    // Send push notification to the other party
    let recipientId;
    let notificationTitle;
    let notificationBody;

    if (sender_role === 'ADMIN') {
      // Notify the user
      recipientId = conversation.user_id;
      notificationTitle = 'New message from Admin';
      notificationBody = message;
    } else {
      // Notify the assigned admin or all admins
      if (conversation.admin_id) {
        recipientId = conversation.admin_id;
      } else {
        // If no specific admin assigned, we'd need to notify all admins
        // For now, we'll skip push notification or implement admin group notification
        console.log('No admin assigned to conversation, skipping push notification');
        return res.success(newMessage, 'Message sent successfully');
      }
      notificationTitle = `New message from ${sender_role}`;
      notificationBody = message;
    }

    if (recipientId) {
      await notifyUser({
        userId: recipientId,
        title: notificationTitle,
        body: notificationBody,
        type: 'MESSAGE',
        referenceId: conversation_id,
        referenceType: 'conversation',
        data: {
          conversation_id,
          message_id: newMessage.id,
          sender_role,
          sender_name: req.user.name
        }
      });
    }

    return res.success(newMessage, 'Message sent successfully');
  } catch (error) {
    console.error('Send message error:', error);
    return res.serverError('Failed to send message');
  }
};

// Get all messages in a conversation
exports.getConversationMessages = async (req, res) => {
  try {
    const conversation_id = req.params.conversation_id;
    const { page, limit, offset } = parsePagination(req.query);

    const [messages, total] = await Promise.all([
      findMessagesByConversationId(conversation_id, { limit, offset }),
      countMessagesByConversationId(conversation_id)
    ]);

    return res.paginated(messages, { page, limit, total }, 'Messages fetched successfully');
  } catch (error) {
    console.error('Get conversation messages error:', error);
    return res.serverError('Failed to fetch messages');
  }
};

// Mark a message as read
exports.markAsRead = async (req, res) => {
  try {
    const message_id = req.params.id;
    const user_id = req.user.id;

    const message = await findMessageById(message_id);
    if (!message) {
      return res.notFound('Message not found');
    }

    const updated = await markMessageAsRead(message_id, user_id);

    // Emit real-time event via WebSocket
    emitMessageRead(message.conversation_id, message_id, user_id);

    return res.success(updated, 'Message marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.serverError('Failed to mark message as read');
  }
};

// Mark all messages in a conversation as read
exports.markConversationAsRead = async (req, res) => {
  try {
    const conversation_id = req.params.conversation_id;
    const user_id = req.user.id;

    const updated = await markConversationMessagesAsRead(conversation_id, user_id);

    // Emit real-time event via WebSocket
    const { getIO } = require('../realtime/socket');
    const io = getIO();
    if (io) {
      const roomName = `conversation:${conversation_id}`;
      io.to(roomName).emit('conversation:messages_read', {
        conversation_id,
        read_by: user_id
      });
    }

    return res.success({ count: updated.length }, 'Conversation marked as read');
  } catch (error) {
    console.error('Mark conversation as read error:', error);
    return res.serverError('Failed to mark conversation as read');
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const message_id = req.params.id;
    const user_id = req.user.id;

    const message = await findMessageById(message_id);
    if (!message) {
      return res.notFound('Message not found');
    }

    // Only sender can delete their own message
    if (message.sender_id !== user_id) {
      return res.forbidden('You can only delete your own messages');
    }

    const deleted = await deleteMessage(message_id, user_id);

    // Emit real-time event via WebSocket
    const io = getIO();
    if (io) {
      const roomName = `conversation:${message.conversation_id}`;
      io.to(roomName).emit('message:deleted', { message_id });
    }

    return res.success(deleted, 'Message deleted successfully');
  } catch (error) {
    console.error('Delete message error:', error);
    return res.serverError('Failed to delete message');
  }
};

// Get unread count for a specific conversation
exports.getConversationUnreadCount = async (req, res) => {
  try {
    const conversation_id = req.params.conversation_id;

    const unreadCount = await getUnreadMessagesByConversation(conversation_id, req.user.id);

    return res.success({ unreadCount }, 'Unread count fetched successfully');
  } catch (error) {
    console.error('Get conversation unread count error:', error);
    return res.serverError('Failed to fetch unread count');
  }
};
