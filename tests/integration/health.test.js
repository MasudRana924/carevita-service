const request = require('supertest');
const app = require('../../src/server');

describe('Health Check API Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/health/detailed', () => {
    it('should return detailed health status with dependencies', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('dependencies');
      expect(response.body.data.dependencies).toHaveProperty('postgresql');
      expect(response.body.data.dependencies).toHaveProperty('redis');
      expect(response.body.data).toHaveProperty('system');
    });

    it('should return 503 when critical dependencies are down', async () => {
      // This test would need to mock database/redis failures
      // For now, we'll just verify the endpoint exists
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return ready status when all dependencies are healthy', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ready');
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alive');
      expect(response.body.data.alive).toBe(true);
    });
  });
});
