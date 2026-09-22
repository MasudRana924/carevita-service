# CareMate Admin Panel — Master API Prompt (copy-paste)

You are updating / integrating the **CareMate ADMIN web panel** against the live CareMate backend.

## Context

- Many admin APIs are **already integrated**. Do **not** rebuild the panel from scratch.
- Wire any **missing** endpoints; keep working screens; fix broken calls only.
- **Do not invent** routes, fields, or statuses. Use exactly what is documented below.
- Base URL: `{API_BASE}/api/v1`
- Auth: `Authorization: Bearer <access_token>` on every `/admin/*` and refund route.
- Admin-only: caller `user.role` must be `ADMIN` (enforced by backend).

---

## 0. Response envelope (ALL endpoints)

### Success
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success message",
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-03-22T12:00:00.000Z",
    "path": "/api/v1/admin/...",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human readable error",
  "code": "BAD_REQUEST",
  "errors": [{ "field": "status", "message": "..." }],
  "data": null,
  "meta": { "requestId": "...", "timestamp": "...", "path": "..." }
}
```

### Client rules
- Always read payload from `data`.
- Lists: `data` is an **array**; pagination is in `meta.pagination`.
- Created resources may return `statusCode: 201`.
- On `code` = `TOKEN_EXPIRED` / `TOKEN_INVALID` / `UNAUTHORIZED` → try refresh, then logout.
- Default list query: `page=1&limit=20` (limit max 100).

---

## 1. Auth (not under /admin, but required)

### 1.1 Login
`POST /auth/login`  
Headers: `Content-Type: application/json`  
Body:
```json
{ "email": "admin@caremate.com", "password": "********" }
```
Response `data`:
```json
{
  "token": "<access_jwt>",
  "refreshToken": "<refresh_jwt>",
  "user": {
    "id": "uuid",
    "name": "Admin",
    "email": "admin@caremate.com",
    "phone": null,
    "profile_photo": null,
    "role": "ADMIN",
    "status": "active",
    "is_verified": true,
    "ekyc_status": false,
    "ekyc_session_status": null
  }
}
```
**Gate:** if `user.role !== "ADMIN"` → reject login in UI.

### 1.2 Refresh
`POST /auth/refresh-token`  
Body: `{ "refreshToken": "..." }`  
Response `data`: `{ "token", "refreshToken", "user" }` (same shape as login).

### 1.3 Logout
`POST /auth/logout`  
Body: `{ "refreshToken": "..." }` (if your client stores it).

---

## 2. Admin profile & dashboard

### 2.1 Profile
`GET /admin/profile`  
Response `data` (public user):
```json
{
  "id": "uuid",
  "name": "Admin",
  "email": "admin@caremate.com",
  "phone": null,
  "profile_photo": null,
  "role": "ADMIN",
  "status": "active",
  "is_verified": true,
  "ekyc_status": false,
  "ekyc_session_status": null,
  "ekyc_verified_at": null,
  "language_preference": null,
  "emergency_contact": null,
  "address": null,
  "date_of_birth": null,
  "created_at": "...",
  "updated_at": "..."
}
```

### 2.2 Dashboard
`GET /admin/dashboard`  
Response `data`:
```json
{
  "total_bookings": 120,
  "pending_payment": 8,
  "paid": 90,
  "today_bookings": 3,
  "weekly_bookings": 22,
  "total_users": 500,
  "total_caregivers": 80,
  "caregiver_payment_done": 70,
  "platform_wallet_balance": 12500.5,
  "total_paid_revenue": 250000,
  "totalUsers": 500,
  "totalBookings": 120,
  "todayBookings": 3,
  "totalCaregivers": 80,
  "charts": {
    "bookings_last_7_days": [{ "date": "2026-03-16", "count": 5 }],
    "payments_last_7_days": [{ "date": "2026-03-16", "paid": 3, "pending": 2 }]
  }
}
```
Prefer snake_case keys; camelCase duplicates exist for older UI.

---

## 3. Users

### 3.1 List users
`GET /admin/users?role=&status=&page=&limit=`  
Query:
| param | notes |
|-------|--------|
| `role` | `USER` \| `CAREGIVER` \| `ADMIN` (optional) |
| `status` | `active` \| `blocked` (optional) |
| `page`, `limit` | pagination |

Response `data`: array of user rows (password stripped by sanitize). Typical fields: `id, name, email, phone, role, status, is_verified, profile_photo, created_at, ...`

### 3.2 Block user
`PUT /admin/users/:id/block`  
Body: none  
Response `data`: updated user (`status: "blocked"`)

### 3.3 Unblock user
`PUT /admin/users/:id/unblock`  
Body: none  
Response `data`: updated user (`status: "active"`)

### 3.4 Update user status
`PUT /admin/users/:id/status`  
Body:
```json
{ "status": "active" }
```
Allowed: `active` | `blocked`  
Response `data`: updated user

---

## 4. Caregivers

`:id` = **caregiver profile UUID** OR **user UUID** (both accepted on block/unblock/ekyc/credentials).

### 4.1 List caregivers
`GET /admin/caregivers?verification_status=&ekyc_session_status=&page=&limit=`  
Query:
| param | example |
|-------|---------|
| `verification_status` | `PENDING` \| `APPROVED` \| `SUSPENDED` |
| `ekyc_session_status` | `In Review` \| `Approved` \| `Declined` \| `In Progress` \| ... |
| `page`, `limit` | pagination |

Response `data[]` fields (joined):
```json
{
  "id": "profile-uuid",
  "user_id": "user-uuid",
  "bio": "...",
  "experience_years": 2,
  "hourly_rate": 200,
  "district": "Dhaka",
  "thana": "Mirpur",
  "gender": "Male",
  "verification_status": "PENDING",
  "is_available": true,
  "rating": 4.5,
  "completed_bookings": 10,
  "ekyc_status": false,
  "ekyc_session_status": "In Review",
  "name": "Caregiver Name",
  "email": "c@example.com",
  "phone": "017...",
  "user_profile_photo": "...",
  "user_ekyc_status": false,
  "user_ekyc_session_status": "In Review",
  "user_ekyc_verified_at": null,
  "user_ekyc_reference_id": "didit-session-id"
}
```

### 4.2 Get caregiver eKYC detail
`GET /admin/caregivers/:id/ekyc`  
Response `data`:
```json
{
  "caregiver_id": "uuid",
  "user_id": "uuid",
  "name": "...",
  "email": "...",
  "ekyc_status": false,
  "ekyc_verified_at": null,
  "ekyc_reference_id": "session-id",
  "ekyc_session_status": "In Review",
  "session_id": "session-id",
  "verification_url": "https://...",
  "session_token": "...",
  "can_approve": true,
  "can_decline": true,
  "decision": {
    "status": "In Review",
    "session_id": "...",
    "features": null,
    "id_verifications": [],
    "liveness_checks": [],
    "face_matches": [],
    "reviews": []
  }
}
```
UI: enable Approve only if `can_approve === true`; Decline if `can_decline === true`.

### 4.3 Approve eKYC (Didit)
`POST /admin/caregivers/:id/ekyc/approve`  
Body (optional):
```json
{ "comment": "Face match reviewed and accepted" }
```
Also accepts `note` as alias for `comment`.  
Response `data`:
```json
{
  "caregiver_id": "uuid",
  "user_id": "uuid",
  "session_id": "...",
  "previous_status": "In Review",
  "status": "Approved",
  "ekyc_status": true,
  "ekyc_verified_at": "ISO",
  "comment": "..."
}
```

### 4.4 Decline eKYC (Didit)
`POST /admin/caregivers/:id/ekyc/decline`  
Body (optional):
```json
{ "comment": "Document mismatch" }
```
Aliases: `note`, `reason`.  
Response `data`: same shape as approve with `status: "Declined"`, `ekyc_status: false`.

### 4.5 Review professional credentials (manual)
`POST /admin/caregivers/:id/credentials`  
Body:
```json
{
  "credential_status": "VERIFIED",
  "note": "BNMC card checked",
  "credential_expires_at": "2027-12-31"
}
```
| field | required | values |
|-------|----------|--------|
| `credential_status` | yes | `VERIFIED` \| `REJECTED` \| `PENDING` \| `SUSPENDED` \| `REVERIFY_REQUIRED` |
| `note` | no | string (alias `credential_note`) |
| `credential_expires_at` | no | date `YYYY-MM-DD` |

Response `data`: updated caregiver profile row.

### 4.6 Block caregiver
`PUT /admin/caregivers/:id/block`  
Body: none  
Effects: profile `verification_status=SUSPENDED`, `is_available=false`, user `status=blocked`.  
Response `data`: `{ "caregiver_id", "user_id" }`

### 4.7 Unblock caregiver
`PUT /admin/caregivers/:id/unblock`  
Body: none  
Effects: profile `verification_status=APPROVED`, `is_available=true`, user `status=active`.  
Response `data`: `{ "caregiver_id", "user_id" }`

---

## 5. Hospitals

### 5.1 List
`GET /admin/hospitals?district=&page=&limit=`  
Response `data[]`: hospital rows (`id, name, address, phone, email, city, district, type, photo, details, is_active, location_lat, location_long, ...`)

### 5.2 Create
`POST /admin/hospitals`  
`Content-Type: multipart/form-data`  
Fields:
| field | required |
|-------|----------|
| `name` | yes |
| `address`, `phone`, `email`, `city`, `district`, `type`, `details` | no |
| `location_lat`, `location_long` | no |
| `photo` | no (file: jpg/png/pdf) |

Response `data`: created hospital (`201`).

### 5.3 Update
`PUT /admin/hospitals/:id`  
`multipart/form-data` — same fields as create (partial OK). Omit fields you don’t change.  
Optional `photo` file replaces image.  
Also accepts `is_active` in body.  
Response `data`: updated hospital.

### 5.4 Status
`PUT /admin/hospitals/:id/status`  
Body:
```json
{ "is_active": true }
```
Response `data`: updated hospital.

---

## 6. Bookings

### Booking statuses
`SEARCHING_PROVIDER` | `PROVIDER_ASSIGNED` | `PROVIDER_ACCEPTED` | `PAYMENT_PAID` | `SERVICE_IN_PROGRESS` | `SERVICE_COMPLETED` | `CANCELLED_BY_USER` | `CANCELLED_BY_PROVIDER` | `CANCELLED_BY_ADMIN`

### 6.1 List
`GET /admin/bookings?status=&date_from=&date_to=&page=&limit=`  
Response `data[]` (list shape):
```json
{
  "id": "uuid",
  "booking_number": "BK...",
  "status": "PROVIDER_ASSIGNED",
  "payment_status": "PENDING",
  "booking_date": "2026-03-22",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "total_amount": 1500,
  "customer_name": "...",
  "customer_phone": "...",
  "family_member_name": "...",
  "hospital_name": "...",
  "offer_expires_at": "2026-03-22T10:15:00.000Z",
  "payout_frozen": false
}
```
UI tips:
- `PROVIDER_ASSIGNED` + `offer_expires_at` → show “Offer expires …” / countdown
- `SEARCHING_PROVIDER` → badge “Searching caregiver”

### 6.2 Detail
`GET /admin/bookings/:id`  
Response `data`: full booking + joins + `history[]`  
Important fields:
- Customer: `customer_name`, `customer_phone`
- Patient/family: `family_member_*`, PHI fields (`medical_history`, `allergies`, …) — accessing these is audit-logged as `ADMIN_PHI_ACCESS`
- Caregiver: `caregiver_name`, `caregiver_phone`, `caregiver_email`, `caregiver_photo`, `caregiver_rating`, …
- Hospital: `hospital_name`, `hospital_address`, …
- Money: `service_charge`, `platform_fee`, `discount`, `total_amount`, `advance_amount`, `remaining_amount`, `payment_status`, `payment_method`
- Ops: `status`, `offer_expires_at`, `payout_frozen`, `cancellation_reason`, `cancelled_by`, `cancelled_at`
- `history`: `[{ from_status, to_status, changed_by, notes, created_at, ... }]`

Also expose conceptually: `accept_timeout_minutes` default **15** (server config); may not always be in payload — use 15 if absent.

### 6.3 Cancel (admin)
`POST /admin/bookings/:id/cancel`  
Body:
```json
{ "reason": "Admin cancelled — safety concern" }
```
Response `data`:
```json
{
  "...booking fields...": "...",
  "status": "CANCELLED_BY_ADMIN",
  "cancellation_policy": { },
  "refund": { }
}
```
Paid bookings may auto-trigger refund logic; show `cancellation_policy` + `refund` to admin.

---

## 7. Disputes

### 7.1 List
`GET /admin/disputes?status=&page=&limit=`  
`status`: `OPEN` | `IN_REVIEW` | `RESOLVED` | `REJECTED`  
Response `data[]`:
```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "booking_number": "BK...",
  "raised_by": "user-uuid",
  "raised_by_name": "...",
  "reason": "...",
  "details": "...",
  "status": "OPEN",
  "resolution": null,
  "created_at": "..."
}
```

### 7.2 Update
`PATCH /admin/disputes/:id`  
Body:
```json
{
  "status": "RESOLVED",
  "resolution": "Partial refund issued; case closed"
}
```
`status` required.  
Response `data`: updated dispute row.

---

## 8. Withdrawals (caregiver payout queue)

Statuses: `PENDING` | `PROCESSING` | `COMPLETED` | `REJECTED` (and historical `APPROVED` if any)

### 8.1 List
`GET /admin/withdrawals?status=&page=&limit=`  
Response `data[]`:
```json
{
  "id": "uuid",
  "caregiver_user_id": "uuid",
  "caregiver_name": "...",
  "caregiver_phone": "...",
  "wallet_id": "uuid",
  "amount": 500,
  "method": "BKASH",
  "bkash_number": "017...",
  "delivery_details": {},
  "status": "PENDING",
  "admin_note": null,
  "created_at": "..."
}
```

### 8.2 Approve
`POST /admin/withdrawals/:id/approve`  
Body (optional):
```json
{ "note": "Paid via bKash to 017..." }
```
Effects: wallet debit + status `COMPLETED`.  
Fails with **409** if caregiver payout is frozen due to safety incident.  
Response `data`: updated withdrawal.

### 8.3 Reject
`POST /admin/withdrawals/:id/reject`  
Body (optional):
```json
{ "note": "Invalid bKash number" }
```
Allowed when status is `PENDING` or `PROCESSING`.  
Response `data`: updated withdrawal (`REJECTED`).

**UI:** confirm dialogs; show amount, caregiver, destination (`bkash_number` / `delivery_details`).

---

## 9. Safety incidents

Statuses: `OPEN` | `IN_REVIEW` | `RESOLVED` | `DISMISSED`

### 9.1 List
`GET /admin/safety-incidents?status=&page=&limit=`  
Response `data[]`:
```json
{
  "id": "uuid",
  "booking_id": "uuid",
  "booking_number": "BK...",
  "reported_by": "uuid",
  "reporter_name": "...",
  "status": "OPEN",
  "note": "...",
  "admin_note": null,
  "payout_frozen": true,
  "created_at": "..."
}
```

### 9.2 Update
`PATCH /admin/safety-incidents/:id`  
Body:
```json
{
  "status": "RESOLVED",
  "note": "Investigated; no further action",
  "unfreeze_payout": true
}
```
| field | required | notes |
|-------|----------|--------|
| `status` | yes | enum above |
| `note` | no | alias `admin_note` |
| `unfreeze_payout` | no | if `true` and status is `RESOLVED`/`DISMISSED`, clears `bookings.payout_frozen` |

Response `data`: updated incident.

---

## 10. Privacy policies

### 10.1 List (admin — includes unpublished)
`GET /admin/privacy-policies`  
Response `data`: array (usually 2 rows: USER + CAREGIVER)
```json
{
  "id": "uuid",
  "audience": "USER",
  "title": "Privacy Policy",
  "content": "markdown/html/text...",
  "version": "1.0",
  "is_published": true,
  "updated_at": "..."
}
```

### 10.2 Upsert
`PUT /admin/privacy-policies`  
Body:
```json
{
  "audience": "USER",
  "title": "Privacy Policy for Families",
  "content": "Full policy text...",
  "version": "1.1",
  "is_published": true
}
```
| field | required | notes |
|-------|----------|--------|
| `audience` | yes | `USER` \| `CAREGIVER` (`NURSE` maps to CAREGIVER) |
| `title` | yes | |
| `content` | yes | max ~200000 chars |
| `version` | no | default `"1.0"` |
| `is_published` | no | default `true` |

Response `data`: policy row (`200` update or `201` create).

---

## 11. Audit logs

`GET /admin/audit-logs?entity_type=&entity_id=&page=&limit=`  
Response `data[]` typical:
```json
{
  "id": "uuid",
  "actor_id": "uuid",
  "actor_name": "Admin",
  "action": "USER_BLOCKED",
  "entity_type": "user",
  "entity_id": "uuid",
  "meta": {},
  "created_at": "..."
}
```
Known actions include: `USER_BLOCKED`, `USER_UNBLOCKED`, `CAREGIVER_BLOCKED`, `CAREGIVER_UNBLOCKED`, `CREDENTIAL_*`, `DISPUTE_UPDATED`, `WITHDRAWAL_APPROVED`, `WITHDRAWAL_REJECTED`, `PAYMENT_REFUND`, `SAFETY_INCIDENT_UPDATED`, `ADMIN_PHI_ACCESS`, `PRIVACY_POLICY_*`.

---

## 12. Refunds (admin; under /payments, not /admin)

Admin JWT required (`role === ADMIN`).

### 12.1 Refund
`POST /payments/bkash/refund`  
Body:
```json
{
  "paymentId": "TR0001...",
  "booking_id": "uuid",
  "refundAmount": "100.00",
  "sku": "BK123",
  "reason": "Customer cancellation"
}
```
- Provide `paymentId` **or** `booking_id` (at least one).
- `refundAmount` optional string/number — omit to refund remaining balance.
- Up to **10** refunds until original amount exhausted.

Response `data` (shape may include):
```json
{
  "payment": {},
  "refund": {},
  "remaining": 0,
  "bkash": {
    "originalTrxId": "...",
    "refundTrxId": "...",
    "refundTransactionStatus": "Completed",
    "originalTrxAmount": "...",
    "refundAmount": "..."
  },
  "wallet": {}
}
```

### 12.2 Refund status
`POST /payments/bkash/refund/status`  
Body:
```json
{ "paymentId": "TR0001...", "booking_id": "uuid" }
```
Response `data`: bKash refund transactions + local refund rows.

**UI:** on booking detail show Paid / Refunded / Remaining, refund history, Refund form, Refresh status. Disable when remaining is 0 or 10 refunds done.

---

## 13. Screens checklist (map UI ↔ API)

| Screen | APIs |
|--------|------|
| Login | `POST /auth/login`, `POST /auth/refresh-token` |
| Dashboard | `GET /admin/dashboard` |
| Users | `GET/PUT .../users*` |
| Caregivers list | `GET /admin/caregivers` (+ filters) |
| Caregiver eKYC review | `GET .../ekyc`, `POST .../approve`, `POST .../decline` |
| Credentials review | `POST .../credentials` |
| Hospitals | CRUD + status |
| Bookings | list, detail, cancel |
| Refunds | `/payments/bkash/refund*` on booking detail |
| Disputes | list + patch |
| Withdrawals | list + approve/reject |
| Safety incidents | list + patch |
| Privacy policies | list + upsert |
| Audit logs | list |

---

## 14. Rules for the implementer

1. Do **not** invent endpoints or rename paths.
2. Keep existing working integrations; only add what’s missing / broken.
3. Confirm dialogs for: block/unblock, cancel booking, approve/reject withdrawal, eKYC approve/decline, refund.
4. Never send `password` or secrets to UI tables.
5. Treat PHI on booking detail as sensitive; don’t dump into public logs.
6. No mock data in production mode.
7. Prefer tables + filters + detail drawers over overbuilt dashboards.

## 15. Done when

- All routes in this prompt are callable from the admin UI (or explicitly skipped with a note).
- Auth + token refresh works for ADMIN only.
- eKYC In Review queue works end-to-end.
- Withdrawals respect payout freeze (show error on 409).
- Booking detail shows `offer_expires_at` / searching state.
- Envelope handling is consistent (`data` + `meta.pagination`).
