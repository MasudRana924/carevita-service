const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareMate API',
      version: '3.0.0',
      description: `
CareMate v3 API — USER / CAREGIVER (incl. NURSE subtype) / ADMIN.

**Auth:** Bearer JWT after login / verify-otp. Access ~15m; refresh ~30d with rotation.
Public register roles: \`USER\` | \`CAREGIVER\` only (ADMIN rejected).
Logout: \`POST /auth/logout\` with \`refreshToken\`.

**NURSE:** \`users.role\` stays \`CAREGIVER\`; set \`caregiver_profiles.provider_type=NURSE\` + credentials.
Admin reviews via \`POST /admin/caregivers/{id}/credentials\`.

**Booking journey:** SEARCHING_PROVIDER → PROVIDER_ASSIGNED → PROVIDER_ACCEPTED → PAYMENT_PAID → SERVICE_IN_PROGRESS → SERVICE_COMPLETED.

**Push:** Register FCM at \`POST /notifications/tokens\`. Inbox is durable backup.
**Safety:** \`POST /bookings/{id}/safety-incident\` freezes payout (not emergency dispatch).
**Live location:** Requires \`consent: true\` while SERVICE_IN_PROGRESS.
**Health:** \`/health/live\` and \`/health/ready\` for deploy probes.
      `
    },
    servers: [{ url: '/api/v1', description: 'Current server' }],
    tags: [
      { name: 'Health', description: 'Liveness / readiness' },
      { name: 'Auth', description: 'Register, OTP, login, refresh, logout, profile' },
      { name: 'User', description: 'User profile & bookings' },
      { name: 'Family Members', description: 'Family member CRUD + PHI' },
      { name: 'Caregiver', description: 'Profile (CAREGIVER/NURSE), eKYC, wallet, accept/start/location' },
      { name: 'eKYC', description: 'Didit identity verification' },
      { name: 'Bookings', description: 'Create, pay gate, review, cancel, safety' },
      { name: 'Payments', description: 'bKash create / execute / callback / refund' },
      { name: 'Hospitals', description: 'Hospital list' },
      { name: 'Inbox', description: 'In-app notification inbox' },
      { name: 'Notifications', description: 'FCM device tokens & preferences' },
      { name: 'Privacy Policy', description: 'Public product privacy policy (USER / CAREGIVER registration)' },
      { name: 'Admin', description: 'Users, caregivers, credentials, safety, privacy policy, withdrawals, audit' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: {},
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                path: { type: 'string' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            statusCode: { type: 'integer', example: 400 },
            message: { type: 'string' },
            code: { type: 'string', example: 'BAD_REQUEST' },
            errors: { type: 'array', items: { type: 'object' } },
            data: { nullable: true },
            meta: { type: 'object' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    path.join(__dirname, '../docs/**/*.js').split(path.sep).join('/'),
    path.join(__dirname, '../routes/**/*.js').split(path.sep).join('/')
  ]
};

module.exports = swaggerJsdoc(options);
