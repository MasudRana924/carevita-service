jest.mock('../../src/models/BookingChat', () => ({
  createMessage: jest.fn(),
  markRead: jest.fn(),
  countUnread: jest.fn(),
  getLastMessage: jest.fn(),
  getMessages: jest.fn(),
  deleteByBookingId: jest.fn(),
  findStaleBookingIds: jest.fn()
}));
jest.mock('../../src/models/Booking', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/CaregiverProfile', () => ({
  getCaregiverProfileByUserId: jest.fn(),
  getCaregiverProfileById: jest.fn()
}));
jest.mock('../../src/services/pushNotificationService', () => ({ notifyUser: jest.fn() }));
jest.mock('../../src/models/Conversation', () => ({}));
jest.mock('../../src/middleware/upload', () => ({ CHAT_IMAGE_TYPES: ['image/jpeg'] }));

const mockEmit = jest.fn();
const mockTo = jest.fn(() => ({ emit: mockEmit }));
jest.mock('../../src/realtime/socket', () => ({ getIO: () => ({ to: mockTo }) }));
const emit = mockEmit;
const to = mockTo;

const BookingChat = require('../../src/models/BookingChat');
const { findById } = require('../../src/models/Booking');
const { getCaregiverProfileById } = require('../../src/models/CaregiverProfile');
const { notifyUser } = require('../../src/services/pushNotificationService');
const chat = require('../../src/services/bookingChatService');

const OWNER = 'user-1';
const CAREGIVER_USER = 'cg-user-1';
const booking = (status = 'SERVICE_IN_PROGRESS') => ({
  id: 'b-1',
  booking_number: 'BK1',
  user_id: OWNER,
  provider_type: 'CAREGIVER',
  provider_id: 'cp-1',
  status
});

beforeEach(() => {
  jest.clearAllMocks();
  getCaregiverProfileById.mockResolvedValue({ id: 'cp-1', user_id: CAREGIVER_USER });
  notifyUser.mockResolvedValue({});
});

describe('bookingChatService.resolveParticipant', () => {
  it('maps the booking owner to USER and the assigned caregiver to CAREGIVER', async () => {
    findById.mockResolvedValue(booking());
    await expect(chat.resolveParticipant('b-1', OWNER)).resolves.toMatchObject({
      role: 'USER', counterpartUserId: CAREGIVER_USER
    });
    await expect(chat.resolveParticipant('b-1', CAREGIVER_USER)).resolves.toMatchObject({
      role: 'CAREGIVER', counterpartUserId: OWNER
    });
  });

  it('rejects anyone else', async () => {
    findById.mockResolvedValue(booking());
    await expect(chat.resolveParticipant('b-1', 'stranger')).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('bookingChatService.sendMessage', () => {
  it('refuses to send when the service is not in progress', async () => {
    findById.mockResolvedValue(booking('PAYMENT_PAID'));
    await expect(chat.sendMessage({
      bookingId: 'b-1',
      sender: { id: OWNER },
      input: { message_type: 'text', message: 'hi' }
    })).rejects.toMatchObject({ statusCode: 409, code: 'CHAT_CLOSED' });
    expect(BookingChat.createMessage).not.toHaveBeenCalled();
  });

  it('stores the message, emits to both participants and pushes the counterpart', async () => {
    findById.mockResolvedValue(booking());
    const message = { id: 'm-1', message_type: 'text', message: 'On my way', sender_name: 'Rahim' };
    BookingChat.createMessage.mockResolvedValue({ message, duplicate: false });
    BookingChat.markRead.mockResolvedValue(0);

    await chat.sendMessage({
      bookingId: 'b-1',
      sender: { id: CAREGIVER_USER },
      input: { message_type: 'text', message: 'On my way' }
    });

    expect(BookingChat.createMessage).toHaveBeenCalledWith(expect.objectContaining({ sender_role: 'CAREGIVER' }));
    expect(to).toHaveBeenCalledWith(`user:${OWNER}`);
    expect(to).toHaveBeenCalledWith(`user:${CAREGIVER_USER}`);
    expect(emit).toHaveBeenCalledWith('chat:message', message);
    expect(notifyUser).toHaveBeenCalledWith(expect.objectContaining({
      userId: OWNER,
      type: 'BOOKING_CHAT_MESSAGE',
      bookingId: 'b-1',
      skipInbox: true
    }));
  });

  it('does not push again for a duplicate client_message_id', async () => {
    findById.mockResolvedValue(booking());
    BookingChat.createMessage.mockResolvedValue({ message: { id: 'm-1' }, duplicate: true });

    await chat.sendMessage({ bookingId: 'b-1', sender: { id: OWNER }, input: { message: 'hi' } });
    expect(notifyUser).not.toHaveBeenCalled();
  });
});

describe('bookingChatService.purgeForBooking', () => {
  it('deletes the thread and notifies both apps', async () => {
    BookingChat.deleteByBookingId.mockResolvedValue([]);
    await chat.purgeForBooking(booking('SERVICE_COMPLETED'), 'SERVICE_COMPLETED');

    expect(BookingChat.deleteByBookingId).toHaveBeenCalledWith('b-1');
    expect(emit).toHaveBeenCalledWith('chat:ended', { booking_id: 'b-1', reason: 'SERVICE_COMPLETED' });
  });

  it('never throws when the delete fails', async () => {
    BookingChat.deleteByBookingId.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(chat.purgeForBooking(booking('SERVICE_COMPLETED'))).resolves.toBeUndefined();
    console.error.mockRestore();
  });
});
