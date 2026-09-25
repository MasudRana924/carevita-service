const BookingRepository = require('../../../src/repositories/BookingRepository');

// Mock database pool
jest.mock('../../../src/config/database');

describe('BookingRepository', () => {
  let bookingRepository;
  let mockPool;

  beforeEach(() => {
    bookingRepository = BookingRepository;
    mockPool = require('../../../src/config/database');
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should return bookings for a user', async () => {
      const mockUserId = 'user-uuid';
      const mockBookings = [
        { id: 'booking-1', user_id: mockUserId, status: 'SERVICE_COMPLETED' },
        { id: 'booking-2', user_id: mockUserId, status: 'PROVIDER_ASSIGNED' }
      ];

      mockPool.query.mockResolvedValue({ rows: mockBookings });

      const result = await bookingRepository.findByUserId(mockUserId);

      expect(result).toEqual(mockBookings);
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should filter by status when provided', async () => {
      const mockUserId = 'user-uuid';
      const mockBookings = [
        { id: 'booking-1', user_id: mockUserId, status: 'SERVICE_COMPLETED' }
      ];

      mockPool.query.mockResolvedValue({ rows: mockBookings });

      const result = await bookingRepository.findByUserId(mockUserId, { status: 'SERVICE_COMPLETED' });

      expect(result).toEqual(mockBookings);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $'),
        expect.arrayContaining([mockUserId, 'SERVICE_COMPLETED'])
      );
    });

    it('should apply pagination', async () => {
      const mockUserId = 'user-uuid';
      const mockBookings = [{ id: 'booking-1', user_id: mockUserId }];

      mockPool.query.mockResolvedValue({ rows: mockBookings });

      const result = await bookingRepository.findByUserId(mockUserId, { limit: 10, offset: 0 });

      expect(result).toEqual(mockBookings);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([mockUserId, 10, 0])
      );
    });
  });

  describe('updateStatus', () => {
    it('should update booking status', async () => {
      const mockBookingId = 'booking-uuid';
      const newStatus = 'SERVICE_COMPLETED';
      const mockUpdatedBooking = { id: mockBookingId, status: newStatus };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedBooking] });

      const result = await bookingRepository.updateStatus(mockBookingId, newStatus);

      expect(result).toEqual(mockUpdatedBooking);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bookings'),
        [newStatus, mockBookingId]
      );
    });
  });

  describe('addStatusHistory', () => {
    it('should add status history entry', async () => {
      const mockBookingId = 'booking-uuid';
      const mockHistory = { id: 'history-1', booking_id: mockBookingId };

      mockPool.query.mockResolvedValue({ rows: [mockHistory] });

      const result = await bookingRepository.addStatusHistory(
        mockBookingId,
        'PROVIDER_ASSIGNED',
        'PROVIDER_ACCEPTED',
        'user-uuid',
        'Provider accepted'
      );

      expect(result).toEqual(mockHistory);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('setOfferExpiry', () => {
    it('should set offer expiry time', async () => {
      const mockBookingId = 'booking-uuid';
      const mockBooking = { id: mockBookingId, offer_expires_at: new Date() };

      mockPool.query.mockResolvedValue({ rows: [mockBooking] });

      const result = await bookingRepository.setOfferExpiry(mockBookingId, 15);

      expect(result).toEqual(mockBooking);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('offer_expires_at'),
        [expect.any(Date), mockBookingId]
      );
    });
  });

  describe('assignProvider', () => {
    it('should assign provider to booking', async () => {
      const mockBookingId = 'booking-uuid';
      const mockProviderId = 'provider-uuid';
      const mockBooking = { id: mockBookingId, provider_id: mockProviderId };

      mockPool.query.mockResolvedValue({ rows: [mockBooking] });

      const result = await bookingRepository.assignProvider(mockBookingId, mockProviderId);

      expect(result).toEqual(mockBooking);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('provider_id = $'),
        [mockProviderId, 'PROVIDER_ASSIGNED', mockBookingId]
      );
    });
  });
});
