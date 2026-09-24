const { Server } = require('socket.io');
const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');
const liveTrackingService = require('../services/liveTrackingService');
const { findConversationById } = require('../models/Conversation');

let io = null;

const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    const result = await pool.query(
      'SELECT id, phone, email, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return next(new Error('Invalid token'));
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return next(new Error('Account is not active'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error(error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
  }
};

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} user=${socket.user.id} role=${socket.user.role}`);

    // Join admin room if user is admin
    if (socket.user.role === 'ADMIN') {
      socket.join('admins');
      console.log(`Admin ${socket.user.id} joined admins room`);
    }

    // USER (or caregiver) joins booking room to receive live updates
    socket.on('tracking:subscribe', async (payload = {}, ack) => {
      try {
        const bookingId = payload.booking_id || payload.bookingId;
        if (!bookingId) throw Object.assign(new Error('booking_id is required'), { statusCode: 400 });

        await liveTrackingService.assertCanView(bookingId, socket.user);
        const room = liveTrackingService.roomName(bookingId);
        await socket.join(room);

        const latest = await liveTrackingService.getLiveLocation(bookingId, socket.user);
        socket.emit('tracking:location', latest);

        if (typeof ack === 'function') ack({ ok: true, data: latest });
      } catch (error) {
        const message = error.message || 'Failed to subscribe';
        socket.emit('tracking:error', { message });
        if (typeof ack === 'function') ack({ ok: false, message });
      }
    });

    socket.on('tracking:unsubscribe', async (payload = {}) => {
      const bookingId = payload.booking_id || payload.bookingId;
      if (!bookingId) return;
      await socket.leave(liveTrackingService.roomName(bookingId));
    });

    // CAREGIVER pushes location while service is in progress
    socket.on('tracking:update', async (payload = {}, ack) => {
      try {
        if (socket.user.role !== 'CAREGIVER') {
          throw Object.assign(new Error('Only caregivers can publish location'), { statusCode: 403 });
        }

        const bookingId = payload.booking_id || payload.bookingId;
        if (!bookingId) throw Object.assign(new Error('booking_id is required'), { statusCode: 400 });

        const location = await liveTrackingService.publishLocation(bookingId, socket.user.id, payload);
        const room = liveTrackingService.roomName(bookingId);
        io.to(room).emit('tracking:location', location);

        if (typeof ack === 'function') ack({ ok: true, data: location });
      } catch (error) {
        const message = error.message || 'Failed to update location';
        socket.emit('tracking:error', { message });
        if (typeof ack === 'function') ack({ ok: false, message });
      }
    });

    // Join a conversation room for real-time messaging
    socket.on('conversation:join', async (payload = {}, ack) => {
      try {
        const conversationId = payload.conversation_id || payload.conversationId;
        if (!conversationId) throw Object.assign(new Error('conversation_id is required'), { statusCode: 400 });

        // Verify user has access to this conversation
        const conversation = await findConversationById(conversationId);
        if (!conversation) {
          throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
        }

        // Check authorization
        if (socket.user.role !== 'ADMIN' && conversation.user_id !== socket.user.id) {
          throw Object.assign(new Error('You do not have access to this conversation'), { statusCode: 403 });
        }

        const roomName = `conversation:${conversationId}`;
        await socket.join(roomName);
        console.log(`User ${socket.user.id} joined conversation room: ${roomName}`);

        if (typeof ack === 'function') ack({ ok: true, room: roomName });
      } catch (error) {
        const message = error.message || 'Failed to join conversation';
        socket.emit('conversation:error', { message });
        if (typeof ack === 'function') ack({ ok: false, message });
      }
    });

    // Leave a conversation room
    socket.on('conversation:leave', async (payload = {}) => {
      const conversationId = payload.conversation_id || payload.conversationId;
      if (!conversationId) return;
      
      const roomName = `conversation:${conversationId}`;
      await socket.leave(roomName);
      console.log(`User ${socket.user.id} left conversation room: ${roomName}`);
    });

    // Send a message via WebSocket (real-time)
    socket.on('message:send', async (payload = {}, ack) => {
      try {
        const { conversation_id, message, message_type = 'text' } = payload;
        
        if (!conversation_id) throw Object.assign(new Error('conversation_id is required'), { statusCode: 400 });
        if (!message) throw Object.assign(new Error('message is required'), { statusCode: 400 });

        // Verify user has access to this conversation
        const conversation = await findConversationById(conversation_id);
        if (!conversation) {
          throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
        }

        // Check authorization
        if (socket.user.role !== 'ADMIN' && conversation.user_id !== socket.user.id) {
          throw Object.assign(new Error('You do not have access to this conversation'), { statusCode: 403 });
        }

        // Create message via database (this will also trigger push notifications)
        const { createMessage } = require('../models/Message');
        const newMessage = await createMessage({
          conversation_id,
          sender_id: socket.user.id,
          sender_role: socket.user.role,
          message,
          message_type
        });

        // Emit to conversation room
        const roomName = `conversation:${conversation_id}`;
        io.to(roomName).emit('message:new', newMessage);
        
        // Also emit to admin room if sender is not admin
        if (socket.user.role !== 'ADMIN') {
          io.to('admins').emit('conversation:new_message', {
            conversation_id,
            message: newMessage
          });
        }

        if (typeof ack === 'function') ack({ ok: true, data: newMessage });
      } catch (error) {
        const message = error.message || 'Failed to send message';
        socket.emit('message:error', { message });
        if (typeof ack === 'function') ack({ ok: false, message });
      }
    });

    // Mark messages as read via WebSocket
    socket.on('message:mark_read', async (payload = {}, ack) => {
      try {
        const { conversation_id, message_id } = payload;
        
        if (!conversation_id) throw Object.assign(new Error('conversation_id is required'), { statusCode: 400 });

        // Verify user has access to this conversation
        const conversation = await findConversationById(conversation_id);
        if (!conversation) {
          throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
        }

        // Check authorization
        if (socket.user.role !== 'ADMIN' && conversation.user_id !== socket.user.id) {
          throw Object.assign(new Error('You do not have access to this conversation'), { statusCode: 403 });
        }

        const { markConversationMessagesAsRead } = require('../models/Message');
        const updated = await markConversationMessagesAsRead(conversation_id, socket.user.id);

        // Emit to conversation room
        const roomName = `conversation:${conversation_id}`;
        io.to(roomName).emit('conversation:messages_read', {
          conversation_id,
          read_by: socket.user.id,
          count: updated.length
        });

        if (typeof ack === 'function') ack({ ok: true, count: updated.length });
      } catch (error) {
        const message = error.message || 'Failed to mark messages as read';
        socket.emit('message:error', { message });
        if (typeof ack === 'function') ack({ ok: false, message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.IO live tracking ready at /socket.io');
  return io;
};

const getIO = () => io;

const emitLocation = (bookingId, location) => {
  if (!io) return;
  io.to(liveTrackingService.roomName(bookingId)).emit('tracking:location', location);
};

const emitTrackingEnded = (bookingId) => {
  if (!io) return;
  io.to(liveTrackingService.roomName(bookingId)).emit('tracking:ended', {
    booking_id: bookingId,
    is_active: false
  });
};

// Helper function to emit new message to conversation room
const emitNewMessage = (conversationId, message) => {
  if (!io) return;
  const roomName = `conversation:${conversationId}`;
  io.to(roomName).emit('message:new', message);
};

// Helper function to emit message read status
const emitMessageRead = (conversationId, messageId, readBy) => {
  if (!io) return;
  const roomName = `conversation:${conversationId}`;
  io.to(roomName).emit('message:read', { message_id: messageId, read_by: readBy });
};

// Helper function to notify admins of new conversation message
const emitAdminNewMessage = (conversationId, message) => {
  if (!io) return;
  io.to('admins').emit('conversation:new_message', {
    conversation_id: conversationId,
    message: message
  });
};

module.exports = {
  initSocket,
  getIO,
  emitLocation,
  emitTrackingEnded,
  emitNewMessage,
  emitMessageRead,
  emitAdminNewMessage
};
