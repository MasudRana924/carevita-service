You are updating the CareMate CAREGIVER mobile app to match the production CareMate API.

Do not invent endpoints. Adapt the existing caregiver app to the new response envelope and the booking/wallet/availability changes below.

## 1. Universal API response (breaking change)

Every success/error now looks like this. Stop reading `user`, `token`, bookings, or wallet fields from the JSON root.

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
  "statusCode": 401,
  "message": "Invalid token",
  "code": "TOKEN_INVALID",
  "data": null,
  "meta": {}
}
```

Client rules:
- One API helper: read `json.data` only; on `success: false` use `json.code` + `json.message`.
- Lists are `data: []` never null.
- Pagination is `meta.pagination`.
- Auth: `data.token`, `data.refreshToken`, `data.user`. Profile = `data`.
- `TOKEN_EXPIRED` / `UNAUTHORIZED` → refresh then logout.
- `CONFLICT` on accept = overlap or outside weekly slots.

## 2. Booking job (hospital escort only)

Caregiver job is take the family member to hospital and return. Do NOT show:
- `patient_requirements`
- medical history / conditions / allergies / medications
- “why they are going to hospital”

Show only: booking number, date/time, duration, hospital name/address/phone, family member name/photo/address (district, thana, house), notes if operational, pay status, action buttons.

Statuses you care about:
- `PROVIDER_ASSIGNED` → Accept / Reject
- `PROVIDER_ACCEPTED` → waiting for user payment
- `PAYMENT_PAID` → Start (`can_start`)
- `SERVICE_IN_PROGRESS` → Complete (`can_complete`)
- `SERVICE_COMPLETED` → earning settled

**Reject does not cancel the booking.** API reassigns another caregiver or sets `SEARCHING_PROVIDER`. After reject, this booking should leave the caregiver’s active list.

Accept may fail 409 if the time overlaps another booking or is outside weekly availability.

`GET /caregiver/bookings/my` and `GET /bookings/:id` include `can_start`, `can_complete`, `can_cancel`, `can_dispute`. Caregiver cannot cancel after the user has paid.

## 3. New caregiver endpoints

Weekly slots (0=Sunday … 6=Saturday):
- `GET /caregiver/availability`
- `PUT /caregiver/availability` `{ "slots": [{ "day_of_week": 1, "start_time": "09:00", "end_time": "18:00", "is_active": true }] }`
- Empty slots = available all day (backward compatible). Once slots exist, bookings must fit them.

Wallet + withdrawal:
- `GET /caregiver/wallet` still `{ balance, currency, transactions }`
- `POST /caregiver/withdrawals` `{ "amount": 500, "bkash_number": "017..." }` (min 100 BDT, one pending at a time)
- `GET /caregiver/withdrawals` paginated
- Admin pays to that bKash number; status `PENDING` → `COMPLETED` | `REJECTED`
- Push type `WITHDRAWAL_UPDATED`

Reviews: `GET /caregiver/reviews/my` now includes `comment` plus `rating`.

Dispute (after payment):
- `POST /bookings/:id/dispute` `{ reason, details? }`
- `GET /bookings/:id/disputes`

Notifications:
- `GET /notifications/preferences`
- `PUT /notifications/preferences` `{ "types": { "BOOKING_CREATED": true, "PAYMENT_RECEIVED": true } }`
- Invalid FCM tokens are cleaned server-side; still register token on login.

Push types: `BOOKING_CREATED`, `PAYMENT_RECEIVED` (start now), `SERVICE_START_REMINDER`, `EARNING_SETTLED`, `REVIEW_RECEIVED`, `DISPUTE_UPDATED`, `WITHDRAWAL_UPDATED`. Always open via `booking_id` / `screen`.

## 4. What NOT to build now

- eKYC / NID / selfie
- Map/distance matching
- Admin dashboard
- User family medical records
- Direct bKash refund APIs (user/admin only)

## 5. Implementation order

1. Envelope parser for every existing screen (login, profile, bookings, wallet).
2. Hide medical/why-hospital fields on booking cards and details.
3. Accept overlap/slot error toasts; reject → booking disappears / “reassigned”.
4. Weekly availability editor.
5. Withdrawal request + history on wallet screen.
6. Show review comments.
7. Notification mute settings.
8. Dispute button after `PAYMENT_PAID` / completed.

Keep current visual design. Only change API mapping and the new flows.
