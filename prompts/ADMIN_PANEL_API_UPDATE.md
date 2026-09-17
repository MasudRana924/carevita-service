You are building/updating the CareMate ADMIN web panel against the production CareMate API.

Do not invent endpoints. Use the response envelope and admin APIs below. Keep a clean operations UI (tables, filters, confirm dialogs). Auth is Bearer JWT from `POST /api/v1/auth/login` with an ADMIN user.

## 1. API envelope (all endpoints)

Success:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "path": "/api/v1/...",
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3, "hasNext": true, "hasPrev": false }
  }
}
```

Error: `{ success: false, statusCode, message, code, errors[], data: null, meta }`.

Rules:
- Read everything from `data`. Lists are `data: []`.
- Pagination from `meta.pagination`.
- `code` TOKEN_EXPIRED / UNAUTHORIZED → refresh then logout.
- Base URL: `{API}/api/v1`. All admin routes except login require `Authorization: Bearer <token>` and role ADMIN.

## 2. Screens to implement

### Auth
- Login: `POST /auth/login` `{ email, password }` → `data.token`, `data.user` (must be role ADMIN).
- Profile: `GET /admin/profile`
- Refresh: `POST /auth/refresh-token` `{ refreshToken }`

### Dashboard
`GET /admin/dashboard`

Show: total_bookings, pending_payment, paid, today_bookings, weekly_bookings, total_users, total_caregivers, platform_wallet_balance, total_paid_revenue, charts.bookings_last_7_days, charts.payments_last_7_days.

### Users
- `GET /admin/users?role=&status=&page=&limit=`
- Block `PUT /admin/users/:id/block`
- Unblock `PUT /admin/users/:id/unblock`
- Status `PUT /admin/users/:id/status` `{ status }`  (active | blocked)

### Caregivers
- `GET /admin/caregivers?verification_status=&page=&limit=`
- Block `PUT /admin/caregivers/:id/block`
- Unblock `PUT /admin/caregivers/:id/unblock`

### Hospitals
- `GET /admin/hospitals?district=&page=&limit=`
- Create `POST /admin/hospitals` multipart: name, address, phone, email, city, district, type, details, photo
- Update `PUT /admin/hospitals/:id` multipart
- Status `PUT /admin/hospitals/:id/status` `{ is_active }`

### Bookings (oversight)
- List `GET /admin/bookings?status=&date_from=&date_to=&page=&limit=`
- Detail `GET /admin/bookings/:id` (includes history)
- Cancel `POST /admin/bookings/:id/cancel` `{ reason }`
  - Uses cancellation policy; paid bookings may trigger bKash refund.
  - Response `data.cancellation_policy` + `data.refund`

Statuses: SEARCHING_PROVIDER, PROVIDER_ASSIGNED, PROVIDER_ACCEPTED, PAYMENT_PAID, SERVICE_IN_PROGRESS, SERVICE_COMPLETED, CANCELLED_BY_USER, CANCELLED_BY_PROVIDER, CANCELLED_BY_ADMIN.

### Disputes
- List `GET /admin/disputes?status=&page=&limit=`  (OPEN | IN_REVIEW | RESOLVED | REJECTED)
- Update `PATCH /admin/disputes/:id` `{ status, resolution }`

### Withdrawals (caregiver payout queue)
- List `GET /admin/withdrawals?status=&page=&limit=`  (PENDING | COMPLETED | REJECTED)
- Approve `POST /admin/withdrawals/:id/approve` `{ note? }` — debits caregiver wallet; you then send money to `bkash_number` outside the app (or confirm already sent).
- Reject `POST /admin/withdrawals/:id/reject` `{ note? }`
- Confirm dialogs required. Show amount, caregiver_name, bkash_number, wallet.

### Refund queue (bKash tokenized v2)
Admin can full or partial refund a completed payment **up to 10 times** until original amount is finished.

Refund:
`POST /payments/bkash/refund`
```json
{
  "paymentId": "TR0001...",
  "booking_id": "uuid",
  "refundAmount": "1.00",
  "sku": "BK123",
  "reason": "Customer cancellation"
}
```
- `paymentId` = bKash create-payment id (also accept booking_id).
- `refundAmount` string, max 2 decimals. Omit to refund remaining.
- Success only when bKash `refundTransactionStatus` is `Completed`.
- Response `data`: `{ payment, refund, remaining, bkash: { originalTrxId, refundTrxId, refundTransactionStatus, originalTrxAmount, refundAmount }, wallet }`
- If remaining > 0, payment status is PARTIAL_REFUND; if 0, REFUNDED.
- Errors to show: 2072 invalid amount, 2071 refund window expired, 2074 cannot reverse, 2023 insufficient balance, timeout → tell admin to hit Refund Status.

Refund status:
`POST /payments/bkash/refund/status` `{ "paymentId": "...", "booking_id": "uuid" }`
- `data.bkash.refundTransactions[]`: refundTrxId, refundTransactionStatus, refundAmount, completedTime
- `data.local[]` our stored refund rows.

UI:
- On booking/payment detail: Paid amount, Refunded, Remaining, list of refunds, “Refund” form (amount + reason), “Refresh status” button.
- Disable refund if remaining is 0 or 10 refunds already done.

### Audit log
`GET /admin/audit-logs?entity_type=&entity_id=&page=&limit=`
Show actor_name, action, entity_type, entity_id, meta, created_at.
Actions include USER_BLOCKED, CAREGIVER_BLOCKED, BOOKING_CANCELLED, PAYMENT_REFUND, WITHDRAWAL_APPROVED, DISPUTE_UPDATED.

## 3. What not to build
- eKYC review flow (later)
- Map/distance tools
- User/caregiver mobile screens
- Direct bKash checkout from admin (only refund/status)

## 4. Implementation order
1. Auth + envelope client
2. Dashboard
3. Users / caregivers / hospitals
4. Bookings list + detail + cancel
5. Refund form + refund status on booking detail
6. Disputes
7. Withdrawals queue
8. Audit log

Use the existing visual system of the admin repo. Wire real API calls; no mock data in production mode.
