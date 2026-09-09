# CareBridge API Documentation

## Admin APIs

### 1. Get All Withdrawals
**Endpoint**: `GET /api/v1/admin/withdrawals`
**Authentication**: Required (Admin role)
**Query Params**:
- `status` (optional): PENDING, APPROVED, REJECTED, PROCESSING, COMPLETED, FAILED
- `provider_type` (optional): CAREGIVER, NURSE
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Request**:
```http
GET /api/v1/admin/withdrawals?status=PENDING&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "withdrawal_number": "WD1725891234567",
      "provider_id": "uuid",
      "provider_type": "CAREGIVER",
      "amount": 5000.00,
      "status": "PENDING",
      "payment_account_id": "uuid",
      "created_at": "2024-09-09T10:00:00Z",
      "account_type": "BKASH",
      "account_number": "01******789",
      "account_holder_name": "John Doe"
    }
  ],
  "message": null
}
```

---

### 2. Approve Withdrawal
**Endpoint**: `PATCH /api/v1/admin/withdrawals/:id/approve`
**Authentication**: Required (Admin role)

**Request**:
```http
PATCH /api/v1/admin/withdrawals/uuid/approve
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "transaction_id": "TXN123456789"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "withdrawal_number": "WD1725891234567",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "amount": 5000.00,
    "status": "APPROVED",
    "transaction_id": "TXN123456789",
    "processed_by": "uuid",
    "processed_at": "2024-09-09T10:30:00Z"
  },
  "message": "Withdrawal approved successfully"
}
```

---

### 3. Reject Withdrawal
**Endpoint**: `PATCH /api/v1/admin/withdrawals/:id/reject`
**Authentication**: Required (Admin role)

**Request**:
```http
PATCH /api/v1/admin/withdrawals/uuid/reject
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "rejection_reason": "Insufficient documentation provided"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "withdrawal_number": "WD1725891234567",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "amount": 5000.00,
    "status": "REJECTED",
    "rejection_reason": "Insufficient documentation provided",
    "processed_by": "uuid",
    "processed_at": "2024-09-09T10:30:00Z"
  },
  "message": "Withdrawal rejected successfully"
}
```

---

### 4. Complete Withdrawal
**Endpoint**: `PATCH /api/v1/admin/withdrawals/:id/complete`
**Authentication**: Required (Admin role)

**Request**:
```http
PATCH /api/v1/admin/withdrawals/uuid/complete
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "withdrawal_number": "WD1725891234567",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "amount": 5000.00,
    "status": "COMPLETED",
    "processed_by": "uuid",
    "processed_at": "2024-09-09T10:35:00Z"
  },
  "message": "Withdrawal completed successfully"
}
```

---

### 5. Get All Disputes
**Endpoint**: `GET /api/v1/admin/disputes`
**Authentication**: Required (Admin role)
**Query Params**:
- `status` (optional): OPEN, UNDER_REVIEW, RESOLVED, REJECTED
- `dispute_type` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Request**:
```http
GET /api/v1/admin/disputes?status=OPEN&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "dispute_number": "DP1725891234567",
      "booking_id": "uuid",
      "booking_number": "BK1725891234567",
      "raised_by": "uuid",
      "raised_by_name": "John Doe",
      "dispute_type": "SERVICE_QUALITY",
      "description": "Service was not as described",
      "status": "OPEN",
      "created_at": "2024-09-09T10:00:00Z"
    }
  ],
  "message": null
}
```

---

### 6. Update Dispute (Resolve/Reject)
**Endpoint**: `PATCH /api/v1/admin/disputes/:id`
**Authentication**: Required (Admin role)

**Request**:
```http
PATCH /api/v1/admin/disputes/uuid
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "RESOLVED",
  "resolution": "Partial refund approved due to service delay",
  "resolution_type": "PARTIAL_REFUND",
  "refund_amount": 2500.00
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dispute_number": "DP1725891234567",
    "booking_id": "uuid",
    "raised_by": "uuid",
    "dispute_type": "SERVICE_QUALITY",
    "description": "Service was not as described",
    "status": "RESOLVED",
    "resolution": "Partial refund approved due to service delay",
    "resolution_type": "PARTIAL_REFUND",
    "refund_amount": 2500.00,
    "resolved_by": "uuid",
    "resolved_at": "2024-09-09T11:00:00Z"
  },
  "message": "Dispute updated successfully"
}
```

---

### 7. Get All Bookings (Admin)
**Endpoint**: `GET /api/v1/admin/bookings`
**Authentication**: Required (Admin role)
**Query Params**:
- `status` (optional)
- `provider_type` (optional)
- `date_from` (optional)
- `date_to` (optional)
- `page` (optional)
- `limit` (optional)

**Request**:
```http
GET /api/v1/admin/bookings?status=SERVICE_COMPLETED&page=1&limit=20
Authorization: Bearer <admin_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_number": "BK1725891234567",
      "user_id": "uuid",
      "customer_name": "John Doe",
      "customer_phone": "+8801700000000",
      "service_type": "HOME_CARE",
      "provider_type": "CAREGIVER",
      "provider_id": "uuid",
      "booking_date": "2024-09-10",
      "start_time": "09:00",
      "end_time": "13:00",
      "duration_hours": 4,
      "total_amount": 2200.00,
      "status": "SERVICE_COMPLETED",
      "created_at": "2024-09-09T10:00:00Z"
    }
  ],
  "message": null
}
```

---

### 8. Verify Provider (Caregiver/Nurse)
**Endpoint**: `PATCH /api/v1/admin/caregiver/:id/verify`
**Authentication**: Required (Admin role)

**Request**:
```http
PATCH /api/v1/admin/caregiver/uuid/verify
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "verification_status": "APPROVED",
  "verification_note": "All documents verified successfully"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "verification_status": "APPROVED",
    "verification_note": "All documents verified successfully",
    "is_available": true
  },
  "message": "Caregiver verification updated successfully"
}
```

---

## User App APIs

### 1. Register (Send OTP)
**Endpoint**: `POST /api/v1/auth/register`
**Authentication**: Not required

**Request**:
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "phone": "+8801700000000",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "USER"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent to your phone number",
  "data": {
    "phone": "+8801700000000",
    "temp_token": "temp_token_here"
  }
}
```

---

### 2. Verify OTP
**Endpoint**: `POST /api/v1/auth/verify-otp`
**Authentication**: Not required

**Request**:
```http
POST /api/v1/auth/verify-otp
Content-Type: application/json

{
  "phone": "+8801700000000",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+8801700000000",
      "email": "john@example.com",
      "role": "USER"
    }
  }
}
```

---

### 3. Login
**Endpoint**: `POST /api/v1/auth/login`
**Authentication**: Not required

**Request**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "phone": "+8801700000000",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+8801700000000",
      "email": "john@example.com",
      "role": "USER",
      "ekyc_status": false
    }
  },
  "message": "Login successful"
}
```

---

### 4. Create Family Member
**Endpoint**: `POST /api/v1/family-members`
**Authentication**: Required

**Request**:
```http
POST /api/v1/family-members
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "name": "Jane Doe",
  "date_of_birth": "1980-05-15",
  "gender": "FEMALE",
  "relationship": "SPOUSE",
  "blood_group": "O+",
  "emergency_contact_name": "John Doe",
  "emergency_contact_phone": "+8801700000000",
  "medical_history": "Diabetes type 2",
  "allergies": "Penicillin"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Jane Doe",
    "date_of_birth": "1980-05-15",
    "gender": "FEMALE",
    "relationship": "SPOUSE",
    "blood_group": "O+",
    "emergency_contact_name": "John Doe",
    "emergency_contact_phone": "+8801700000000",
    "medical_history": "Diabetes type 2",
    "allergies": "Penicillin",
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Family member created successfully"
}
```

---

### 5. Get Family Members
**Endpoint**: `GET /api/v1/family-members`
**Authentication**: Required

**Request**:
```http
GET /api/v1/family-members
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "date_of_birth": "1980-05-15",
      "gender": "FEMALE",
      "relationship": "SPOUSE",
      "blood_group": "O+",
      "created_at": "2024-09-09T10:00:00Z"
    }
  ],
  "message": null
}
```

---

### 6. Create Booking
**Endpoint**: `POST /api/v1/bookings`
**Authentication**: Required

**Request**:
```http
POST /api/v1/bookings
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "service_type": "HOME_CARE",
  "family_member_id": "uuid",
  "provider_type": "CAREGIVER",
  "provider_id": "uuid",
  "booking_date": "2024-09-10",
  "start_time": "09:00",
  "duration_hours": 4,
  "pickup_location": {
    "address": "House 123, Road 10, Dhanmondi",
    "city": "Dhaka",
    "district": "Dhaka",
    "division": "Dhaka",
    "latitude": 23.7465,
    "longitude": 90.3765
  },
  "patient_requirements": "Need assistance with mobility",
  "notes": "Patient prefers female caregiver"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_number": "BK1725891234567",
    "user_id": "uuid",
    "family_member_id": "uuid",
    "service_type": "HOME_CARE",
    "provider_type": "CAREGIVER",
    "provider_id": "uuid",
    "booking_date": "2024-09-10",
    "start_time": "09:00",
    "end_time": "13:00",
    "duration_hours": 4,
    "service_charge": 2000.00,
    "platform_fee": 200.00,
    "total_amount": 2200.00,
    "advance_amount": 1100.00,
    "remaining_amount": 1100.00,
    "status": "PENDING_PAYMENT",
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Booking created successfully"
}
```

---

### 7. Get Bookings
**Endpoint**: `GET /api/v1/bookings`
**Authentication**: Required
**Query Params**:
- `status` (optional)
- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Request**:
```http
GET /api/v1/bookings?status=SERVICE_COMPLETED&page=1&limit=20
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_number": "BK1725891234567",
      "service_type": "HOME_CARE",
      "provider_type": "CAREGIVER",
      "booking_date": "2024-09-10",
      "start_time": "09:00",
      "end_time": "13:00",
      "total_amount": 2200.00,
      "status": "SERVICE_COMPLETED",
      "family_member_name": "Jane Doe",
      "caregiver_name": "Sarah Ahmed",
      "caregiver_phone": "+8801800000000",
      "caregiver_rating": 4.5
    }
  ],
  "message": null,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

### 8. Get Booking Details
**Endpoint**: `GET /api/v1/bookings/:id`
**Authentication**: Required

**Request**:
```http
GET /api/v1/bookings/uuid
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_number": "BK1725891234567",
    "user_id": "uuid",
    "customer_name": "John Doe",
    "customer_phone": "+8801700000000",
    "family_member_id": "uuid",
    "family_member_name": "Jane Doe",
    "family_member_relationship": "SPOUSE",
    "family_member_blood_group": "O+",
    "service_type": "HOME_CARE",
    "provider_type": "CAREGIVER",
    "provider_id": "uuid",
    "caregiver_name": "Sarah Ahmed",
    "caregiver_phone": "+8801800000000",
    "caregiver_email": "sarah@example.com",
    "caregiver_bio": "Experienced caregiver with 5 years of experience",
    "caregiver_education": "BSc in Nursing",
    "caregiver_experience": 5,
    "caregiver_rating": 4.5,
    "caregiver_gender": "FEMALE",
    "booking_date": "2024-09-10",
    "start_time": "09:00",
    "end_time": "13:00",
    "duration_hours": 4,
    "total_amount": 2200.00,
    "status": "SERVICE_COMPLETED",
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": null
}
```

---

### 9. Cancel Booking
**Endpoint**: `PATCH /api/v1/bookings/:id/cancel`
**Authentication**: Required

**Request**:
```http
PATCH /api/v1/bookings/uuid/cancel
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "cancellation_reason": "Patient condition improved"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_number": "BK1725891234567",
    "status": "CANCELLED_BY_USER",
    "cancellation_reason": "Patient condition improved",
    "cancelled_by": "uuid",
    "cancelled_at": "2024-09-09T11:00:00Z"
  },
  "message": "Booking cancelled successfully"
}
```

---

### 10. Create Dispute
**Endpoint**: `POST /api/v1/bookings/:booking_id/dispute`
**Authentication**: Required

**Request**:
```http
POST /api/v1/bookings/uuid/dispute
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "dispute_type": "SERVICE_QUALITY",
  "description": "Caregiver arrived 2 hours late and service was not satisfactory"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "dispute_number": "DP1725891234567",
    "booking_id": "uuid",
    "raised_by": "uuid",
    "dispute_type": "SERVICE_QUALITY",
    "description": "Caregiver arrived 2 hours late and service was not satisfactory",
    "status": "OPEN",
    "created_at": "2024-09-09T11:00:00Z"
  },
  "message": "Dispute created successfully"
}
```

---

### 11. Get Notifications
**Endpoint**: `GET /api/v1/notifications`
**Authentication**: Required
**Query Params**:
- `is_read` (optional): true/false

**Request**:
```http
GET /api/v1/notifications?is_read=false
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Booking Created",
      "message": "Your booking BK1725891234567 has been created. Please complete payment.",
      "type": "BOOKING",
      "reference_id": "uuid",
      "reference_type": "booking",
      "is_read": false,
      "created_at": "2024-09-09T10:00:00Z"
    }
  ],
  "message": null
}
```

---

### 12. Register Notification Token
**Endpoint**: `POST /api/v1/notifications/tokens`
**Authentication**: Required

**Request**:
```http
POST /api/v1/notifications/tokens
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "device_id": "device_unique_id",
  "platform": "ANDROID",
  "token": "fcm_token_here"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "device_id": "device_unique_id",
    "platform": "ANDROID",
    "token": "fcm_token_here",
    "is_active": true,
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Notification token registered successfully"
}
```

---

### 13. Get User Profile
**Endpoint**: `GET /api/v1/user/profile`
**Authentication**: Required

**Request**:
```http
GET /api/v1/user/profile
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+8801700000000",
    "email": "john@example.com",
    "role": "USER",
    "profile_photo": "https://example.com/photo.jpg",
    "ekyc_status": false,
    "created_at": "2024-09-01T10:00:00Z"
  },
  "message": null
}
```

---

### 14. Update User Profile
**Endpoint**: `PATCH /api/v1/user/profile`
**Authentication**: Required

**Request**:
```http
PATCH /api/v1/user/profile
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "profile_photo": "https://example.com/new-photo.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Updated",
    "phone": "+8801700000000",
    "email": "john.updated@example.com",
    "profile_photo": "https://example.com/new-photo.jpg",
    "role": "USER",
    "updated_at": "2024-09-09T11:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

---

## Caregiver/Nurse Provider APIs

### 1. Create Caregiver Profile
**Endpoint**: `POST /api/v1/caregiver/profile`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
POST /api/v1/caregiver/profile
Authorization: Bearer <caregiver_token>
Content-Type: application/json

{
  "bio": "Experienced caregiver with 5 years of experience",
  "experience_years": 5,
  "service_areas": ["Dhaka", "Gazipur"],
  "hourly_rate": 500,
  "education": "BSc in Nursing",
  "blood_group": "O+",
  "date_of_birth": "1990-05-15",
  "district": "Dhaka",
  "thana": "Dhanmondi",
  "gender": "FEMALE"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "bio": "Experienced caregiver with 5 years of experience",
    "experience_years": 5,
    "service_areas": ["Dhaka", "Gazipur"],
    "hourly_rate": 500,
    "education": "BSc in Nursing",
    "blood_group": "O+",
    "date_of_birth": "1990-05-15",
    "district": "Dhaka",
    "thana": "Dhanmondi",
    "gender": "FEMALE",
    "verification_status": "PENDING",
    "rating": 0,
    "is_available": true,
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Caregiver profile created successfully"
}
```

---

### 2. Add Service to Profile
**Endpoint**: `POST /api/v1/caregiver/services`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
POST /api/v1/caregiver/services
Authorization: Bearer <caregiver_token>
Content-Type: application/json

{
  "service_id": "uuid",
  "custom_price": 600
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "service_id": "uuid",
    "service_name": "Elderly Care",
    "category": "HOME_CARE",
    "custom_price": 600,
    "base_price": 500,
    "is_active": true
  },
  "message": "Service added successfully"
}
```

---

### 3. Get Provider Services
**Endpoint**: `GET /api/v1/caregiver/services`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
GET /api/v1/caregiver/services
Authorization: Bearer <caregiver_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "service_id": "uuid",
      "service_name": "Elderly Care",
      "category": "HOME_CARE",
      "custom_price": 600,
      "base_price": 500,
      "is_active": true
    }
  ],
  "message": null
}
```

---

### 4. Add Payment Account
**Endpoint**: `POST /api/v1/caregiver/payment-accounts`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
POST /api/v1/caregiver/payment-accounts
Authorization: Bearer <caregiver_token>
Content-Type: application/json

{
  "account_type": "BKASH",
  "account_number": "01700000000",
  "account_holder_name": "Sarah Ahmed",
  "bank_name": null,
  "routing_number": null
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "account_type": "BKASH",
    "account_number": "01******00",
    "account_holder_name": "Sarah Ahmed",
    "is_default": false,
    "is_verified": false,
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Payment account added successfully"
}
```

---

### 5. Get Payment Accounts
**Endpoint**: `GET /api/v1/caregiver/payment-accounts`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
GET /api/v1/caregiver/payment-accounts
Authorization: Bearer <caregiver_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_type": "BKASH",
      "account_number": "01******00",
      "account_holder_name": "Sarah Ahmed",
      "is_default": true,
      "is_verified": true
    }
  ],
  "message": null
}
```

---

### 6. Create Withdrawal Request
**Endpoint**: `POST /api/v1/caregiver/withdrawals`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
POST /api/v1/caregiver/withdrawals
Authorization: Bearer <caregiver_token>
Content-Type: application/json

{
  "amount": 5000,
  "payment_account_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "withdrawal_number": "WD1725891234567",
    "provider_id": "uuid",
    "provider_type": "CAREGIVER",
    "amount": 5000.00,
    "payment_account_id": "uuid",
    "status": "PENDING",
    "created_at": "2024-09-09T10:00:00Z"
  },
  "message": "Withdrawal request created successfully"
}
```

---

### 7. Get Withdrawals
**Endpoint**: `GET /api/v1/caregiver/withdrawals`
**Authentication**: Required (CAREGIVER role)
**Query Params**:
- `status` (optional)
- `page` (optional)
- `limit` (optional)

**Request**:
```http
GET /api/v1/caregiver/withdrawals?status=PENDING&page=1&limit=20
Authorization: Bearer <caregiver_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "withdrawal_number": "WD1725891234567",
      "amount": 5000.00,
      "status": "PENDING",
      "account_type": "BKASH",
      "account_number": "01******00",
      "created_at": "2024-09-09T10:00:00Z"
    }
  ],
  "message": null
}
```

---

### 8. Get Provider Bookings
**Endpoint**: `GET /api/v1/caregiver/bookings`
**Authentication**: Required (CAREGIVER role)
**Query Params**:
- `status` (optional)
- `page` (optional)
- `limit` (optional)

**Request**:
```http
GET /api/v1/caregiver/bookings?status=PROVIDER_ASSIGNED&page=1&limit=20
Authorization: Bearer <caregiver_token>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_number": "BK1725891234567",
      "customer_name": "John Doe",
      "customer_phone": "+8801700000000",
      "family_member_name": "Jane Doe",
      "service_type": "HOME_CARE",
      "booking_date": "2024-09-10",
      "start_time": "09:00",
      "end_time": "13:00",
      "total_amount": 2200.00,
      "status": "PROVIDER_ASSIGNED"
    }
  ],
  "message": null
}
```

---

### 9. Accept Booking
**Endpoint**: `PATCH /api/v1/caregiver/bookings/:id/accept`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
PATCH /api/v1/caregiver/bookings/uuid/accept
Authorization: Bearer <caregiver_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_number": "BK1725891234567",
    "status": "PROVIDER_ACCEPTED",
    "updated_at": "2024-09-09T11:00:00Z"
  },
  "message": "Booking accepted successfully"
}
```

---

### 10. Update Booking Status
**Endpoint**: `PATCH /api/v1/caregiver/bookings/:id/status`
**Authentication**: Required (CAREGIVER role)

**Request**:
```http
PATCH /api/v1/caregiver/bookings/uuid/status
Authorization: Bearer <caregiver_token>
Content-Type: application/json

{
  "status": "SERVICE_IN_PROGRESS",
  "location_lat": 23.7465,
  "location_long": 90.3765
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "booking_number": "BK1725891234567",
    "status": "SERVICE_IN_PROGRESS",
    "updated_at": "2024-09-09T11:30:00Z"
  },
  "message": "Booking status updated successfully"
}
```

---

## eKYC APIs

### 1. Initiate eKYC
**Endpoint**: `POST /api/v1/ekyc/initiate`
**Authentication**: Required

**Request**:
```http
POST /api/v1/ekyc/initiate
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "redirect_url": "https://your-app.com/ekyc/callback"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "verification_url": "https://didit.me/verify/session_id",
    "session_id": "session_id_here",
    "reference_id": "reference_id_here"
  },
  "message": "eKYC verification initiated"
}
```

---

### 2. Get eKYC Status
**Endpoint**: `GET /api/v1/ekyc/status`
**Authentication**: Required

**Request**:
```http
GET /api/v1/ekyc/status
Authorization: Bearer <user_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "ekyc_status": false,
    "ekyc_verified_at": null,
    "ekyc_reference_id": null
  },
  "message": null
}
```

---

### 3. Didit Webhook
**Endpoint**: `POST /api/v1/ekyc/webhook`
**Authentication**: Not required (webhook)

**Request**:
```http
POST /api/v1/ekyc/webhook
Content-Type: application/json

{
  "reference_id": "reference_id_here",
  "status": "VERIFIED",
  "verified_at": "2024-09-09T10:00:00Z",
  "signature": "webhook_signature"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## Common Response Codes

- **200 OK**: Successful GET, PATCH, DELETE
- **201 Created**: Successful POST
- **400 Bad Request**: Invalid request body or parameters
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: User not authorized for this action
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

## Error Response Format

```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error information"
}
```
