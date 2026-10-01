const { Server } = require('socket.io');
const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');
const liveTrackingService = require('../services/liveTrackingService');
const bookingChatService = require('../services/bookingChatService');

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

    // Personal room: booking chat events are delivered here on every connected device.
    socket.join(bookingChatService.userRoom(socket.user.id));

    const failChat = (ack, error) => {
      const message = error.message || 'Request failed';
      const code = error.code || null;
      socket.emit('chat:error', { message, code });
      if (typeof ack === 'function') ack({ ok: false, message, code });
    };

    socket.on('chat:send', async (payload = {}, ack) => {
      try {
        const bookingId = payload.booking_id || payload.bookingId;
        if (!bookingId) throw Object.assign(new Error('booking_id is required'), { statusCode: 400 });
        const input = bookingChatService.parseMessageInput({ body: payload });
        const result = await bookingChatService.sendMessage({ bookingId, sender: socket.user, input });
        if (typeof ack === 'function') ack({ ok: true, data: result.message, duplicate: result.duplicate });
      } catch (error) {
        failChat(ack, error);
      }
    });

    socket.on('chat:typing', async (payload = {}) => {
      try {
        const bookingId = payload.booking_id || payload.bookingId;
        if (!bookingId) return;
        await bookingChatService.sendTyping({
          bookingId,
          userId: socket.user.id,
          isTyping: payload.is_typing === true
        });
      } catch (error) {
        // Typing indicators are best-effort.
      }
    });

    socket.on('chat:read', async (payload = {}, ack) => {
      try {
        const bookingId = payload.booking_id || payload.bookingId;
        if (!bookingId) throw Object.assign(new Error('booking_id is required'), { statusCode: 400 });
        const result = await bookingChatService.markRead({ bookingId, userId: socket.user.id });
        if (typeof ack === 'function') ack({ ok: true, data: result });
      } catch (error) {
        failChat(ack, error);
      }
    });

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

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.IO live tracking + booking chat ready at /socket.io');
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

module.exports = {
  initSocket,
  getIO,
  emitLocation,
  emitTrackingEnded
};
