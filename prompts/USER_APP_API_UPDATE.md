You are updating the CareMate USER mobile app to match the production CareMate API.

Do not invent endpoints. Adapt the existing user app to the new response envelope and the booking/payment/notification/dispute changes below.

## 1. Universal API response (breaking change)

Every success/error now looks like this. Stop reading `user`, `token`, `profile_photo` from the root.

Success:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO-8601",
    "path": "/api/v1/...",
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

Error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "email", "message": "Email is required" }],
  "data": null,
  "meta": { "requestId": "...", "timestamp": "...", "path": "..." }
}
```

Client rules:
- Create one API helper: `if (!json.success) throw ApiError(json.code, json.message, json.errors)`.
- Read payload from `json.data` only.
- Lists: empty means `data: []`, never null.
- Pagination: use `meta.pagination` (not `meta.page`).
- Inbox unread count is `meta.unread`.
- Map `code`: `UNAUTHORIZED`, `TOKEN_EXPIRED` → logout / refresh; `CONFLICT`; `TOO_MANY_REQUESTS`; `NOT_FOUND`; `PAYMENT_FAILED`; `OTP_INVALID`.
- Auth:
  - login / verify-otp: `data.token`, `data.refreshToken`, `data.user`
  - refresh: `data.token`, `data.refreshToken`
  - profile get/update: `data` is the user object
- Keep `Authorization: Bearer <accessToken>`.
- Optional: send `Idempotency-Key` (uuid) on `POST /payments/bkash/create`.

## 2. Booking journey (user app)

Statuses: `SEARCHING_PROVIDER` → `PROVIDER_ASSIGNED` → `PROVIDER_ACCEPTED` → `PAYMENT_PAID` → `SERVICE_IN_PROGRESS` → `SERVICE_COMPLETED`. Cancelled: `CANCELLED_BY_USER` | `CANCELLED_BY_ADMIN`.

After create, caregiver may reject. The booking is NOT cancelled. It is reassigned (`BOOKING_REASSIGNED`) or goes to `SEARCHING_PROVIDER`. Show “Finding another caregiver”.

Booking detail flags in `data`:
- `can_pay`, `pay_amount`, `can_review`, `can_cancel`, `can_dispute`
- `cancellation_policy`: `{ canCancel, refundPercent, refundAmount, policy, hoursUntilStart }`
- Review: `{ rating, comment }`

Cancel policy: unpaid = free cancel. Paid: 100% if ≥24h before start, 50% if ≥6h, 0% after that. Cancel response includes `data.refund`.

Create booking still `POST /api/v1/bookings`. Do not send medical “why hospital” copy into caregiver-facing UI; `patient_requirements` is user-only.

Overlap: if caregiver is busy, API returns 409 `CONFLICT` “Caregiver already has a booking in this time slot” or outside weekly slots.

## 3. New / changed user endpoints

- `POST /bookings/:id/review` body `{ rating: 1-5, comment?: string }`
- `POST /bookings/:id/dispute` body `{ reason, details? }` after payment
- `GET /bookings/:id/disputes`
- `POST /payments/bkash/query` `{ paymentID }` — poll if execute is slow
- Execute twice is safe: `data.already_paid: true`
- `GET /notifications/preferences`
- `PUT /notifications/preferences` `{ "types": { "BOOKING_ACCEPTED": true, "SERVICE_START_REMINDER": false } }`
- Public caregiver slots: `GET /caregiver/:id/availability` (`day_of_week` 0=Sunday … 6=Saturday)

Push types to handle: `BOOKING_ACCEPTED`, `BOOKING_REASSIGNED`, `BOOKING_REJECTED` (searching), `BOOKING_SEARCHING`, `BOOKING_CANCELLED`, `SERVICE_STARTED`, `SERVICE_COMPLETED`, `DISPUTE_UPDATED`. Deep link with `booking_id`.

## 3b. Auto-match + offer timeout (NEW — update booking UI)

Create booking (`POST /bookings`):
- `provider_id` is **optional**. Omit it (or send `auto_assign: true`) to let the server pick a caregiver by **weekly availability + hospital/family district/thana**.
- Still may send a preferred `provider_id`; server checks overlap + availability slots.
- Response / detail now includes:
  - `offer_expires_at` — when the current caregiver must accept
  - `accept_timeout_minutes` — configured timeout (default 15)
- While `status === SEARCHING_PROVIDER` or after reassignment: show **“Finding another caregiver…”** (same as reject flow).
- Push `BOOKING_REASSIGNED` / `BOOKING_SEARCHING` when offer times out (caregiver did not accept in time).
- Caregiver accept/reject/start/complete are **only** on `/caregiver/bookings/:id/...` — do not call `/bookings/:id/accept` from the user app.

OTP: production uses real emailed OTP (no hardcoded `5852`). Dev may still use static OTP only if backend has `ALLOW_STATIC_OTP=true`.

## 4. What NOT to build in user app now

- eKYC
- Map/distance search
- Medical document upload / health timeline
- Caregiver withdrawal / admin screens

## 5. Implementation order

1. Central API client + envelope parser (all existing screens).
2. Auth screens (`data.token` / `data.user`).
3. Booking list/detail status UI + reassign/searching + **offer countdown** (`offer_expires_at`).
4. Optional: book without picking caregiver (auto-match).
5. Cancel sheet showing refund policy.
6. Review comment field.
7. Dispute screen after paid/completed.
8. Notification mute settings.
9. Show caregiver weekly slots before booking.
10. Payment: idempotency header + query fallback.

Keep current visual design. Only change API mapping and the new booking/payment/notification flows.
