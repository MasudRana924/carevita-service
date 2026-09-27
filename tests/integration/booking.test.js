const request = require('supertest');
const app = require('../../src/server');

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/config/firebase');
jest.mock('../../src/queues');

describe('Booking API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test database and get auth token
    // This would typically involve creating a test user and getting a JWT token
    authToken = 'test-jwt-token';
  });

  afterAll(async () => {
    // Cleanup test database
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a new booking with valid data', async () => {
      const bookingData = {
        family_member_id: 'member-uuid',
        service_type: 'HOME_CARE',
        booking_date: '2024-12-01',
        start_time: '09:00',
        duration_hours: 4,
        patient_requirements: 'Need assistance with mobility'
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('booking_number');
    });

    it('should return 400 when required fields are missing', async () => {
      const bookingData = {
        family_member_id: 'member-uuid'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when no auth token provided', async () => {
      const bookingData = {
        family_member_id: 'member-uuid',
        booking_date: '2024-12-01',
        start_time: '09:00',
        duration_hours: 4
      };

      await request(app)
        .post('/api/v1/bookings')
        .send(bookingData)
        .expect(401);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('should return user bookings', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/api/v1/bookings?status=SERVICE_COMPLETED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('should return booking details', async () => {
      const bookingId = 'booking-uuid';

      const response = await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(bookingId);
    });

    it('should return 404 for non-existent booking', async () => {
      const bookingId = 'non-existent-uuid';

      await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    it('should cancel a booking', async () => {
      const bookingId = 'booking-uuid';
      const cancelData = {
        cancellation_reason: 'Patient condition improved'
      };

      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toContain('CANCELLED');
    });
  });
});
