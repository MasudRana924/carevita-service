const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareMate API',
      version: '1.0.0',
      description: `
CareMate Backend API — Family Healthcare Management Platform.

**Base URL:** \`/api/v1\`

**Auth:** Most endpoints need \`Authorization: Bearer <access_token>\`.
Use the **Authorize** button (top-right) after login / verify-otp.
      `,
      contact: {
        name: 'CareMate API Support'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Current server (same host as Swagger)'
      }
    ],
    tags: [
      { name: 'Health', description: 'Health check' },
      { name: 'Auth', description: 'OTP, register, login, profile' },
      { name: 'User', description: 'Current user profile, bookings, payments, notifications' },
      { name: 'Family Members', description: 'Manage family members' },
      { name: 'Caregiver', description: 'Caregiver profile, search, bookings, accept/reject' },
      { name: 'Nurse', description: 'Nurse profile, search, bookings' },
      { name: 'Bookings', description: 'Create and manage service bookings' },
      { name: 'Payments', description: 'bKash and payment operations' },
      { name: 'Admin', description: 'Admin dashboard — users, nurses, bookings, medicines, orders' },
      { name: 'Services', description: 'Services and hospitals catalog' },
      { name: 'Reviews', description: 'Ratings and feedback for caregivers/nurses' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'eKYC', description: 'Identity verification (Didit)' },
      { name: 'Medicines', description: 'Medicine search and user orders' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token from login / verify-otp'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Forward-slash globs so swagger-jsdoc works on Windows too
  apis: [
    path.join(__dirname, '../docs/**/*.js').split(path.sep).join('/'),
    path.join(__dirname, '../routes/**/*.js').split(path.sep).join('/')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
