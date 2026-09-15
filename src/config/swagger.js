const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CareMate API',
      version: '2.0.0',
      description: `
CareMate core API — USER / CAREGIVER / ADMIN.

**Auth:** Bearer JWT after login / verify-otp.

**Push:** Register FCM token at \`POST /notifications/tokens\`.
Booking create → caregiver push + inbox.
Booking accept → user push + inbox (\`booking_id\` in payload).
Payment success → caregiver push (\`PAYMENT_RECEIVED\` / start booking) + wallet credit (5% platform / 95% caregiver).
Caregiver start → user push (\`SERVICE_STARTED\`).
1 hour before start → caregiver push (\`SERVICE_START_REMINDER\`).
Caregiver end → user push (\`SERVICE_COMPLETED\` / open booking details; review modal if \`can_review\`) + caregiver wallet settle (\`EARNING_SETTLED\`).
User star review → \`POST /bookings/{id}/review\` \`{ rating: 1-5 }\` (no message).
      `
    },
    servers: [{ url: '/api/v1', description: 'Current server' }],
    tags: [
      { name: 'Health', description: 'Health check' },
      { name: 'Auth', description: 'Register, login, OTP, profile' },
      { name: 'User', description: 'User profile & bookings' },
      { name: 'Family Members', description: 'Family member CRUD' },
      { name: 'Caregiver', description: 'Caregiver profile, search, accept/reject' },
      { name: 'Bookings', description: 'Book caregiver, list, details' },
      { name: 'Payments', description: 'bKash Pay Now (create / execute)' },
      { name: 'Hospitals', description: 'Hospital list' },
      { name: 'Inbox', description: 'Push notification inbox' },
      { name: 'Notifications', description: 'FCM device tokens' },
      { name: 'Admin', description: 'Users, caregivers, hospitals management' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
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
