const BookingCreationService = require('../../../../src/services/booking/BookingCreationService');
const { BadRequestError, NotFoundError, ConflictError } = require('../../../../src/utils/errors');

// Mock dependencies
jest.mock('../../../../src/repositories');
jest.mock('../../../../src/models/FamilyMember');
jest.mock('../../../../src/services/bookingAssignment');
jest.mock('../../../../src/services/pricingService');
jest.mock('../../../../src/config/platform');
jest.mock('../../../../src/services/pushNotificationService');

describe('BookingCreationService', () => {
  let bookingCreationService;

  beforeEach(() => {
    bookingCreationService = BookingCreationService;
    jest.clearAllMocks();
  });

  describe('createUserBooking', () => {
    it('should create a booking successfully with valid data', async () => {
      const mockUserId = 'user-uuid';
      const mockBookingData = {
        family_member_id: 'member-uuid',
        booking_date: '2024-12-01',
        start_time: '09:00',
        duration_hours: 4,
        service_type: 'HOME_CARE'
      };

      const mockFamilyMember = {
        id: 'member-uuid',
        user_id: mockUserId,
        district: 'Dhaka',
        thana: 'Dhanmondi'
      };

      const mockBooking = {
        id: 'booking-uuid',
        booking_number: 'BK123456',
        status: 'PROVIDER_ASSIGNED'
      };

      const { findByUserIdAndId } = require('../../../../src/models/FamilyMember');
      findByUserIdAndId.mockResolvedValue(mockFamilyMember);

      const { calculateBookingPrice } = require('../../../../src/services/pricingService');
      calculateBookingPrice.mockReturnValue({ service_charge: 2000, platform_fee: 200, total_amount: 2200 });

      const { BookingRepository } = require('../../../../src/repositories');
      BookingRepository.create.mockResolvedValue(mockBooking);
      BookingRepository.assignProvider.mockResolvedValue(mockBooking);
      BookingRepository.addStatusHistory.mockResolvedValue({});
      BookingRepository.setOfferExpiry.mockResolvedValue(mockBooking);

      const { findNextCaregiver } = require('../../../../src/services/bookingAssignment');
      findNextCaregiver.mockResolvedValue({ id: 'caregiver-uuid', user_id: 'caregiver-user-uuid' });

      const result = await bookingCreationService.createUserBooking(mockUserId, mockBookingData);

      expect(result).toBeDefined();
      expect(result.id).toBe('booking-uuid');
      expect(findByUserIdAndId).toHaveBeenCalledWith(mockUserId, mockBookingData.family_member_id);
    });

    it('should throw BadRequestError when required fields are missing', async () => {
      const mockUserId = 'user-uuid';
      const mockBookingData = {
        family_member_id: 'member-uuid',
        // Missing booking_date, start_time, duration_hours
      };

      await expect(bookingCreationService.createUserBooking(mockUserId, mockBookingData))
        .rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError when family member not found', async () => {
      const mockUserId = 'user-uuid';
      const mockBookingData = {
        family_member_id: 'member-uuid',
        booking_date: '2024-12-01',
        start_time: '09:00',
        duration_hours: 4
      };

      const { findByUserIdAndId } = require('../../../../src/models/FamilyMember');
      findByUserIdAndId.mockResolvedValue(null);

      await expect(bookingCreationService.createUserBooking(mockUserId, mockBookingData))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when selected caregiver is not eligible', async () => {
      const mockUserId = 'user-uuid';
      const mockBookingData = {
        family_member_id: 'member-uuid',
        provider_id: 'caregiver-uuid',
        booking_date: '2024-12-01',
        start_time: '09:00',
        duration_hours: 4
      };

      const mockFamilyMember = { id: 'member-uuid' };
      const { findByUserIdAndId } = require('../../../../src/models/FamilyMember');
      findByUserIdAndId.mockResolvedValue(mockFamilyMember);

      const { CaregiverProfileRepository } = require('../../../../src/repositories');
      CaregiverProfileRepository.findById.mockResolvedValue({ verification_status: 'PENDING' });

      await expect(bookingCreationService.createUserBooking(mockUserId, mockBookingData))
        .rejects.toThrow(ConflictError);
    });
  });
});
