# CareMate Backend API

Complete backend API for CareMate - A Family Healthcare Management Platform for Bangladesh.

## Overview

CareMate is a trusted healthcare assistance and management platform that enables customers to remotely arrange, monitor, and manage healthcare services for their parents and loved ones through verified Helping Hands, nurses, doctors, medicine, diagnostics, ambulances, medical records, emergency coordination, and human care management.

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Database
- **Cloudinary** - Cloud storage for files
- **JWT** - Authentication
- **Twilio** - SMS OTP (integration ready)
- **Multer** - File upload handling

## Features

### Core Modules

1. **Authentication & User Management**
   - OTP-based phone verification
   - JWT token authentication
   - Profile management
   - Role-based access control (Customer, Provider, Admin)

2. **Family Management**
   - Create and manage family member profiles
   - Medical history tracking
   - Emergency contacts
   - Preferred hospitals and doctors

3. **Helping Hand (Hero Product)**
   - Verified provider profiles
   - Location-based matching
   - Real-time booking and tracking
   - Service status timeline
   - Rating and review system

4. **Nurse & Caregiver Services**
   - Professional nurse profiles
   - Specialization-based search
   - Shift-based bookings
   - Care notes and updates

5. **Doctor Appointments**
   - Doctor search and profiles
   - Appointment scheduling
   - Prescription management
   - Telemedicine support

6. **Medicine Ordering**
   - Medicine search
   - Prescription upload
   - Order tracking
   - Delivery management

7. **Diagnostics**
   - Test booking
   - Home sample collection
   - Report management
   - Lab center search

8. **Ambulance Services**
   - Emergency booking
   - Multiple ambulance types
   - Real-time tracking
   - Driver assignment

9. **Medical Records**
   - Secure record storage
   - Document upload
   - Family health timeline
   - Confidentiality controls

10. **Medication Management**
    - Medication tracking
    - Reminder system
    - Dosage management
    - Refill reminders

11. **Emergency Services**
    - SOS button
    - Emergency alerts
    - Provider notification
    - Incident reporting

12. **Payments & Wallets**
    - Multiple payment methods (bKash, Nagad, Cards)
    - Customer wallet
    - Provider wallet
    - Transaction history

13. **Reviews & Ratings**
    - Provider ratings
    - Detailed feedback
    - Average rating calculation

14. **Notifications**
    - Push notifications
    - SMS alerts
    - Email notifications
    - In-app notifications

15. **Support System**
    - Ticket creation
    - Status tracking
    - Resolution management

16. **Admin Dashboard**
    - User management
    - Provider verification
    - Booking oversight
    - Analytics and reporting

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd caremet-service
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=caremet_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRE=30d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=CareMate <noreply@caremate.com>

# Payment Gateways
BKASH_MERCHANT_ID=your_bkash_merchant_id
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret

NAGAD_MERCHANT_ID=your_nagad_merchant_id
NAGAD_API_KEY=your_nagad_api_key
NAGAD_API_SECRET=your_nagad_api_secret

FRONTEND_URL=http://localhost:3000
```

4. Create PostgreSQL database
```bash
createdb caremet_db
```

5. Run database migration
```bash
npm run migrate
```

6. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Send OTP
```http
POST /api/auth/send-otp
Content-Type: application/json

{
  "phone": "+8801XXXXXXXXX",
  "type": "registration"
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+8801XXXXXXXXX",
  "otp": "123456",
  "type": "registration"
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+8801XXXXXXXXX",
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "language_preference": "en",
  "emergency_contact": "+8801XXXXXXXXX",
  "address": "Dhaka, Bangladesh"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+8801XXXXXXXXX",
  "password": "securepassword"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "user@example.com",
  "language_preference": "en",
  "emergency_contact": "+8801XXXXXXXXX",
  "address": "Dhaka, Bangladesh"
}
```

### Family Management Endpoints

#### Create Family Member
```http
POST /api/family
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "age": 65,
  "gender": "female",
  "relationship": "mother",
  "blood_group": "A+",
  "medical_history": "Diabetes",
  "allergies": "Penicillin"
}
```

#### Get Family Members
```http
GET /api/family
Authorization: Bearer <token>
```

#### Get Family Member
```http
GET /api/family/:id
Authorization: Bearer <token>
```

#### Update Family Member
```http
PUT /api/family/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "age": 66,
  "medical_history": "Diabetes, Hypertension"
}
```

#### Delete Family Member
```http
DELETE /api/family/:id
Authorization: Bearer <token>
```

### Helping Hand Endpoints

#### Create Helping Hand Profile
```http
POST /api/helping-hand/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Rahim Ahmed",
  "nid_number": "1234567890123",
  "experience": 3,
  "languages": "Bengali, English",
  "skills": "Hospital assistance, Patient care",
  "location_lat": 23.8103,
  "location_long": 90.4125
}
```

#### Search Helping Hands
```http
GET /api/helping-hand/search?location_lat=23.8103&location_long=90.4125&radius=10&min_rating=4
```

#### Get Helping Hand Profile
```http
GET /api/helping-hand/profile
Authorization: Bearer <token>
```

#### Get Provider Bookings
```http
GET /api/helping-hand/bookings?status=confirmed
Authorization: Bearer <token>
```

### Booking Endpoints

#### Create Booking
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "service_id": "uuid",
  "provider_type": "helping_hand",
  "hospital_id": "uuid",
  "scheduled_date": "2024-01-15T10:00:00Z",
  "pickup_location": "Dhaka",
  "patient_requirements": "Wheelchair assistance needed",
  "payment_method": "bkash"
}
```

#### Get Bookings
```http
GET /api/bookings?status=confirmed
Authorization: Bearer <token>
```

#### Get Booking
```http
GET /api/bookings/:id
Authorization: Bearer <token>
```

#### Cancel Booking
```http
DELETE /api/bookings/:id
Authorization: Bearer <token>
```

### Appointment Endpoints

#### Create Appointment
```http
POST /api/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "doctor_id": "uuid",
  "hospital_id": "uuid",
  "scheduled_date": "2024-01-15T14:00:00Z",
  "appointment_type": "in_person",
  "symptoms": "Fever, headache"
}
```

#### Get Appointments
```http
GET /api/appointments?status=scheduled
Authorization: Bearer <token>
```

#### Cancel Appointment
```http
DELETE /api/appouncements/:id
Authorization: Bearer <token>
```

### Medicine Endpoints

#### Search Medicines
```http
GET /api/medicines/search?query=paracetamol
```

#### Create Medicine Order
```http
POST /api/medicines/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "items": [
    {
      "medicine_id": "uuid",
      "quantity": 2,
      "price": 50
    }
  ],
  "delivery_address": "Dhaka",
  "payment_method": "bkash"
}
```

#### Get Medicine Orders
```http
GET /api/medicines/orders
Authorization: Bearer <token>
```

### Diagnostic Endpoints

#### Search Diagnostic Tests
```http
GET /api/diagnostics/tests/search?query=blood
```

#### Create Diagnostic Booking
```http
POST /api/diagnostics/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "test_id": "uuid",
  "diagnostic_center_id": "uuid",
  "scheduled_date": "2024-01-15T09:00:00Z",
  "is_home_collection": true
}
```

### Ambulance Endpoints

#### Create Ambulance Booking
```http
POST /api/ambulance
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "ambulance_type": "ac",
  "pickup_location": "Dhaka",
  "pickup_lat": 23.8103,
  "pickup_long": 90.4125,
  "destination_location": "Apollo Hospital",
  "patient_condition": "Critical",
  "emergency_contact": "+8801XXXXXXXXX",
  "scheduled_date": "2024-01-15T12:00:00Z"
}
```

### Medical Record Endpoints

#### Create Medical Record
```http
POST /api/medical-records
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "record_type": "prescription",
  "title": "Diabetes Prescription",
  "description": "Monthly prescription",
  "file_url": "cloudinary_url",
  "record_date": "2024-01-10"
}
```

#### Get Medical Records
```http
GET /api/medical-records?family_member_id=uuid
Authorization: Bearer <token>
```

### Medication Endpoints

#### Create Medication
```http
POST /api/medications
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "medicine_name": "Metformin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "start_date": "2024-01-10",
  "end_date": "2024-04-10",
  "reminder_enabled": true
}
```

#### Get Medications
```http
GET /api/medications?family_member_id=uuid
Authorization: Bearer <token>
```

### Emergency Endpoints

#### Create Emergency
```http
POST /api/emergency
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_member_id": "uuid",
  "emergency_type": "medical",
  "location": "Dhaka",
  "location_lat": 23.8103,
  "location_long": 90.4125,
  "description": "Chest pain",
  "emergency_contact": "+8801XXXXXXXXX"
}
```

### Review Endpoints

#### Create Review
```http
POST /api/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking_id": "uuid",
  "provider_id": "uuid",
  "provider_type": "helping_hand",
  "overall_rating": 5,
  "punctuality_rating": 5,
  "politeness_rating": 5,
  "professionalism_rating": 5,
  "helpfulness_rating": 5,
  "trustworthiness_rating": 5,
  "review": "Excellent service"
}
```

#### Get Provider Reviews
```http
GET /api/reviews/provider?provider_id=uuid&provider_type=helping_hand
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/notifications?is_read=false
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### Support Endpoints

#### Create Support Ticket
```http
POST /api/support
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Booking issue",
  "description": "Provider did not arrive",
  "category": "booking",
  "priority": "high"
}
```

#### Get Support Tickets
```http
GET /api/support?status=open
Authorization: Bearer <token>
```

### Payment Endpoints

#### Create Payment
```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "booking_id": "uuid",
  "amount": 500,
  "payment_method": "bkash",
  "transaction_id": "txn_123456"
}
```

#### Get Payments
```http
GET /api/payments?status=completed
Authorization: Bearer <token>
```

### Wallet Endpoints

#### Get Wallet
```http
GET /api/wallet
Authorization: Bearer <token>
```

#### Add Funds
```http
POST /api/wallet/add-funds
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000,
  "payment_method": "bkash"
}
```

### Admin Endpoints

#### Get Dashboard Stats
```http
GET /api/admin/dashboard
Authorization: Bearer <token>
```

#### Get All Users
```http
GET /api/admin/users?role=customer
Authorization: Bearer <token>
```

#### Update User Status
```http
PUT /api/admin/users/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "active"
}
```

#### Get All Bookings
```http
GET /api/admin/bookings?status=confirmed
Authorization: Bearer <token>
```

#### Verify Provider
```http
PUT /api/admin/providers/:id/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "provider_type": "helping_hand",
  "verification_data": {
    "nid_verified": true,
    "background_verified": true
  }
}
```

### Hospital Endpoints

#### Search Hospitals
```http
GET /api/hospitals/search?query=apollo
```

#### Get Nearby Hospitals
```http
GET /api/hospitals/nearby?lat=23.8103&long=90.4125&radius=10
```

## Database Schema

The database includes the following main tables:

- **users** - User accounts and authentication
- **family_members** - Family member profiles
- **helping_hands** - Helping Hand provider profiles
- **nurses** - Nurse provider profiles
- **doctors** - Doctor profiles
- **hospitals** - Hospital information
- **services** - Service definitions
- **bookings** - Service bookings
- **booking_status_timeline** - Booking status tracking
- **availability** - Provider availability
- **payments** - Payment transactions
- **customer_wallets** - Customer wallet balances
- **provider_wallets** - Provider earnings
- **wallet_transactions** - Wallet transaction history
- **reviews** - Provider reviews and ratings
- **appointments** - Doctor appointments
- **prescriptions** - Medical prescriptions
- **medicines** - Medicine catalog
- **medicine_orders** - Medicine orders
- **diagnostic_tests** - Diagnostic test catalog
- **diagnostic_centers** - Diagnostic center information
- **diagnostic_bookings** - Diagnostic test bookings
- **ambulance_bookings** - Ambulance bookings
- **medical_records** - Medical record storage
- **medications** - Medication tracking
- **emergencies** - Emergency requests
- **notifications** - User notifications
- **support_tickets** - Support ticket system
- **subscriptions** - Subscription plans
- **corporate_accounts** - Corporate/B2B accounts
- **corporate_employees** - Corporate employee mappings
- **care_managers** - Care manager profiles
- **care_manager_assignments** - Care manager assignments

## Project Structure

```
caremet-service/
├── src/
│   ├── config/
│   │   ├── database.js       # PostgreSQL connection
│   │   ├── cloudinary.js     # Cloudinary configuration
│   │   └── jwt.js            # JWT configuration
│   ├── middleware/
│   │   ├── auth.js           # Authentication middleware
│   │   ├── upload.js         # File upload middleware
│   │   ├── errorHandler.js   # Error handling
│   │   ├── validator.js      # Request validation
│   │   └── rateLimiter.js    # Rate limiting
│   ├── models/
│   │   ├── User.js
│   │   ├── FamilyMember.js
│   │   ├── HelpingHand.js
│   │   ├── Nurse.js
│   │   ├── Doctor.js
│   │   ├── Hospital.js
│   │   ├── Booking.js
│   │   ├── Service.js
│   │   ├── Payment.js
│   │   ├── Wallet.js
│   │   ├── Review.js
│   │   ├── Appointment.js
│   │   ├── Medicine.js
│   │   ├── MedicineOrder.js
│   │   ├── Diagnostic.js
│   │   ├── Ambulance.js
│   │   ├── MedicalRecord.js
│   │   ├── Medication.js
│   │   ├── Emergency.js
│   │   ├── Notification.js
│   │   ├── SupportTicket.js
│   │   ├── Subscription.js
│   │   ├── Corporate.js
│   │   └── CareManager.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── familyController.js
│   │   ├── helpingHandController.js
│   │   ├── nurseController.js
│   │   ├── doctorController.js
│   │   ├── appointmentController.js
│   │   ├── bookingController.js
│   │   ├── medicineController.js
│   │   ├── diagnosticController.js
│   │   ├── ambulanceController.js
│   │   ├── medicalRecordController.js
│   │   ├── medicationController.js
│   │   ├── emergencyController.js
│   │   ├── reviewController.js
│   │   ├── notificationController.js
│   │   ├── supportController.js
│   │   ├── paymentController.js
│   │   ├── walletController.js
│   │   └── adminController.js
│   ├── routes/
│   │   ├── index.js           # Main routes file
│   │   ├── authRoutes.js
│   │   ├── familyRoutes.js
│   │   ├── helpingHandRoutes.js
│   │   ├── nurseRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── appointmentRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── medicineRoutes.js
│   │   ├── diagnosticRoutes.js
│   │   ├── ambulanceRoutes.js
│   │   ├── medicalRecordRoutes.js
│   │   ├── medicationRoutes.js
│   │   ├── emergencyRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── supportRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── adminRoutes.js
│   │   └── hospitalRoutes.js
│   ├── database/
│   │   └── migrate.js         # Database migration script
│   └── server.js              # Server entry point
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Scripts

```bash
# Start development server
npm run dev

# Start production server
npm start

# Run database migration
npm run migrate

# Run database seed (if implemented)
npm run seed
```

## Security Features

- JWT-based authentication
- Rate limiting for API endpoints
- Helmet for HTTP security headers
- CORS configuration
- Password hashing with bcrypt
- Role-based access control
- Input validation
- SQL injection prevention (parameterized queries)

## Deployment

### Prerequisites

- PostgreSQL database
- Cloudinary account
- Twilio account (for SMS)
- Payment gateway accounts (bKash, Nagad)

### Environment Setup

Ensure all environment variables are set in production:

```env
NODE_ENV=production
PORT=3000
# ... other variables
```

### Database Migration

Run migration in production:

```bash
npm run migrate
```

### Start Server

```bash
npm start
```

## Testing

To be implemented with testing framework (Jest/Mocha).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Support

For support, email support@caremate.com or create a support ticket through the platform.
