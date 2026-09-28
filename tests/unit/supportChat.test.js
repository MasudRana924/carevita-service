jest.mock('../../src/services/pushNotificationService', () => ({ notifyUser: jest.fn() }));
jest.mock('../../src/models/Conversation', () => ({}));

const { parseMessageInput } = require('../../src/services/supportChatService');

describe('supportChatService.parseMessageInput', () => {
  it('builds a text message', () => {
    const input = parseMessageInput({ body: { message: '  hello  ', client_message_id: 'abc' } });
    expect(input).toEqual({ message_type: 'text', message: 'hello', attachment: null, client_message_id: 'abc' });
  });

  it('rejects an empty message without a file', () => {
    expect(() => parseMessageInput({ body: { message: '   ' } })).toThrow('Message text or a file is required');
  });

  it('rejects overly long text', () => {
    expect(() => parseMessageInput({ body: { message: 'a'.repeat(4001) } })).toThrow(/cannot exceed/);
  });

  it('treats uploaded images as image messages with optional caption', () => {
    const input = parseMessageInput({
      body: { message: 'my report' },
      file: { path: 'https://cdn/x.jpg', originalname: 'x.jpg', mimetype: 'image/jpeg', size: 1200, filename: 'caremate/chat/x' }
    });
    expect(input.message_type).toBe('image');
    expect(input.message).toBe('my report');
    expect(input.attachment).toEqual({
      url: 'https://cdn/x.jpg', name: 'x.jpg', mime: 'image/jpeg', size: 1200, public_id: 'caremate/chat/x'
    });
  });

  it('treats PDFs as document messages', () => {
    const input = parseMessageInput({
      body: {},
      file: { path: 'https://cdn/r.pdf', originalname: 'r.pdf', mimetype: 'application/pdf', size: 5000 }
    });
    expect(input.message_type).toBe('document');
    expect(input.message).toBeNull();
  });
});
