const Conversation = require('../models/Conversation');
const { notifyUser } = require('./pushNotificationService');
const { CHAT_IMAGE_TYPES } = require('../middleware/upload');

const MAX_MESSAGE_LENGTH = 4000;
const PUSH_TYPE = 'SUPPORT_MESSAGE';

const badRequest = (message) => Object.assign(new Error(message), { statusCode: 400 });

/**
 * Build a message payload from a request that is either JSON ({ message }) or
 * multipart/form-data (file + optional `message` caption).
 */
const parseMessageInput = (req) => {
  const text = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const clientMessageId = req.body?.client_message_id ? String(req.body.client_message_id).slice(0, 100) : null;

  if (text.length > MAX_MESSAGE_LENGTH) {
    throw badRequest(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }

  if (req.file) {
    return {
      message_type: CHAT_IMAGE_TYPES.includes(req.file.mimetype) ? 'image' : 'document',
      message: text || null,
      attachment: {
        url: req.file.path,
        name: req.file.originalname ? String(req.file.originalname).slice(0, 255) : null,
        mime: req.file.mimetype,
        size: req.file.size || null,
        public_id: req.file.filename || null
      },
      client_message_id: clientMessageId
    };
  }

  if (!text) {
    throw badRequest('Message text or a file is required');
  }

  return { message_type: 'text', message: text, attachment: null, client_message_id: clientMessageId };
};

const pushBodyFor = (message) => {
  if (message.message) {
    return message.message.length > 100 ? `${message.message.slice(0, 100)}...` : message.message;
  }
  return message.message_type === 'image' ? 'Sent you a photo' : 'Sent you a document';
};

const sendMessage = async ({ conversation, sender, senderRole, input }) => {
  const result = await Conversation.createMessage({
    conversation_id: conversation.id,
    sender_id: sender.id,
    sender_role: senderRole,
    ...input
  });

  if (result.duplicate) return result;

  if (senderRole === 'admin') {
    notifyUser({
      userId: conversation.user_id,
      title: 'CareMate Support',
      body: pushBodyFor(result.message),
      type: PUSH_TYPE,
      referenceId: conversation.id,
      referenceType: 'conversation',
      skipInbox: true,
      data: {
        screen: 'support_chat',
        conversation_id: conversation.id,
        message_id: result.message.id
      }
    }).catch((error) => console.error('Support chat push failed:', error.message));
  }

  return result;
};

const markRead = async ({ conversation, readerRole }) => {
  const senderRole = readerRole === 'admin' ? 'user' : 'admin';
  return Conversation.markMessagesAsRead(conversation.id, senderRole);
};

module.exports = {
  PUSH_TYPE,
  parseMessageInput,
  sendMessage,
  markRead
};
