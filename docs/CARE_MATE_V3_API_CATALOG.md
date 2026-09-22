# CareMate API Catalog (v3)

**Base URL:** `/api/v1`  
**Auth:** `Authorization: Bearer <access_token>` unless marked Public  
**Docs UI:** `/api-docs`

---

## Legend

| Tag | Meaning |
|-----|---------|
| **NEW** | Added/hardened in v3 pass |
| **Public** | No JWT |
| **USER / CAREGIVER / ADMIN** | Role required |

---

## 1. Health (Public)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Compat liveness |
| GET | `/health/live` | **NEW** process up |
| GET | `/health/ready` | **NEW** DB ping → 503 if down |

---

## 2. Auth — `/auth`

| Method | Path | Auth | Body / notes |
|--------|------|------|----------------|
| POST | `/send-otp` | Public | `{ email, type? }` — OTP email |
| POST | `/verify-otp` | Public | `{ email, otp }` → tokens + user |
| POST | `/resend-otp` | Public | `{ email }` — 60s cooldown |
| POST | `/register` | Public | `{ name, email, password, role? }` role = `USER`\|`CAREGIVER` only (**ADMIN rejected**) |
| POST | `/login` | Public | `{ email, password }` → tokens |
| POST | `/refresh-token` | Public | `{ refreshToken }` — **rotated**; reuse → kill family |
| POST | `/logout` | Public* | `{ refreshToken }` — **NEW** revoke session family |
| GET | `/profile` | Any | Current user |
| PUT | `/profile` | Any | Profile fields |
| PUT | `/password` | Any | `{ currentPassword, newPassword }` |
| POST | `/profile/photo` | Any | multipart `photo` |

\*Logout works without access token if refreshToken provided.

**Tokens:** access ~15m (`JWT_EXPIRE`), refresh ~30d with DB rotation.

---

## 3. User — `/user`

| Method | Path | Role |
|--------|------|------|
| GET | `/profile` | USER+ |
| PUT | `/profile` | USER+ (+ optional photo) |
| POST | `/avatar` | USER+ |
| GET | `/bookings` | USER |

---

## 4. Family members — `/family-members`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/` | multipart + PHI fields; **own** user only |
| GET | `/` | List own |
| GET | `/:id` | Own only (IDOR-safe) |
| PUT | `/:id` | Own only |
| DELETE | `/:id` | Own only |

PHI: `medical_history`, `allergies`, `existing_conditions`, `current_medications`

---

## 5. Caregiver — `/caregiver`

| Method | Path | Role | Notes |
|--------|------|------|--------|
| POST | `/profile` | CAREGIVER | **NEW** `provider_type` CAREGIVER\|NURSE; nurse needs `credential_number` |
| GET/PUT | `/profile` | CAREGIVER | Update may include credentials fields |
| GET | `/search` | Public | Search providers |
| GET/PUT | `/availability` | CAREGIVER | Weekly slots |
| GET | `/bookings/my` | CAREGIVER | PHI redacted by status |
| GET | `/wallet` | CAREGIVER | Balance + ledger |
| GET | `/reviews/my` | CAREGIVER | |
| GET | `/withdrawals/delivery-methods` | CAREGIVER | MFS/BANK (+ Nagad as **payout label** only) |
| GET | `/withdrawals/delivery-methods/:method` | CAREGIVER | Field schema |
| POST | `/withdrawals` | CAREGIVER | Min amount; one pending/processing |
| GET | `/withdrawals` | CAREGIVER | History |
| POST | `/ekyc/initiate` | CAREGIVER | Didit session |
| GET | `/ekyc/status` | CAREGIVER | |
| POST | `/bookings/:id/accept` | CAREGIVER | Race-safe |
| POST | `/bookings/:id/reject` | CAREGIVER | Reassign |
| POST | `/bookings/:id/start` | CAREGIVER | After `PAYMENT_PAID` |
| POST | `/bookings/:id/complete` | CAREGIVER | Ends tracking |
| POST | `/bookings/:id/location` | CAREGIVER | **NEW** requires `consent: true` |
| GET | `/:id/availability` | Public | |
| GET | `/:id` | Public | Profile view |

**Also mirrored:** `/ekyc/*` under `/api/v1/ekyc`

---

## 6. Bookings — `/bookings` (USER side)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/` | Create; optional `requested_provider_type` NURSE\|CAREGIVER; money snapshot |
| GET | `/` | Own bookings |
| GET | `/:id` | Own / assigned / admin |
| GET | `/:id/live-location` | Participants only |
| POST | `/:id/review` | After complete; 1 per booking |
| POST | `/:id/cancel` | Policy + refund |
| POST | `/:id/dispute` | |
| GET | `/:id/disputes` | |
| POST | `/:id/safety-incident` | **NEW** `{ description }` → freeze payout |

---

## 7. Payments — `/payments`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/bkash/token` | User | Grant token |
| POST | `/bkash/create` | User | `{ booking_id }` — amount server-side |
| POST | `/bkash/execute` | User | Complete + wallet |
| POST | `/bkash/query` | User | |
| POST | `/bkash/refund` | **ADMIN** | |
| POST | `/bkash/refund/status` | Owner/Admin | |
| POST | `/bkash/callback` | Secret | **NEW** reconciles amount + completes payment |

Header: `Idempotency-Key` on create; callback `X-Callback-Secret` or `?secret=`

---

## 8. Hospitals — `/hospitals`

| Method | Path | Auth |
|--------|------|------|
| GET | `/` | Public list/search |
| GET | `/:id` | Public |

---

## 9. Inbox — `/inbox`

| Method | Path |
|--------|------|
| GET | `/` |
| GET | `/unread-count` |
| PUT | `/read-all` |
| GET | `/:id` |
| PUT | `/:id/read` |

---

## 10. Notifications — `/notifications`

| Method | Path |
|--------|------|
| POST | `/tokens` |
| GET | `/tokens` |
| DELETE | `/tokens/:id` |
| DELETE | `/tokens/device/:device_id` |
| POST | `/tokens/deactivate-all` |
| GET/PUT | `/preferences` |

---

## 11. eKYC — `/ekyc`

| Method | Path | Auth |
|--------|------|------|
| POST | `/initiate` | CAREGIVER |
| GET | `/status` | CAREGIVER |
| POST | `/webhook` | Didit HMAC (**NEW** audit on reject) |

---

## 12. Admin — `/admin` (ADMIN only)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/profile` | |
| GET | `/dashboard` | |
| GET | `/users` | |
| PUT | `/users/:id/block\|unblock` | |
| PUT | `/users/:id/status` | |
| GET | `/caregivers` | |
| GET | `/caregivers/:id/ekyc` | |
| POST | `/caregivers/:id/ekyc/approve\|decline` | |
| POST | `/caregivers/:id/credentials` | **NEW** `{ credential_status, note?, credential_expires_at? }` |
| PUT | `/caregivers/:id/block\|unblock` | |
| CRUD | `/hospitals` | |
| GET | `/bookings` | |
| GET | `/bookings/:id` | **PHI access audited** |
| POST | `/bookings/:id/cancel` | |
| GET/PATCH | `/disputes` | |
| GET | `/withdrawals` | |
| POST | `/withdrawals/:id/approve\|reject` | Claim lock |
| GET | `/audit-logs` | |
| GET | `/safety-incidents` | **NEW** list |
| PATCH | `/safety-incidents/:id` | **NEW** resolve |

---

## 13. Socket.IO `/socket.io`

| Event | Who | Notes |
|-------|-----|--------|
| `tracking:subscribe` | Owner/provider/admin | JWT required |
| `tracking:update` | CAREGIVER | Same consent rules as REST |
| `tracking:unsubscribe` | | |
| `tracking:location` / `tracking:ended` | Server → room | |

---

## Typical flows

1. **USER:** register → OTP → login → family member → create booking → pay bKash → track → review  
2. **CAREGIVER/NURSE:** register(CAREGIVER) → profile(+nurse credentials) → eKYC → accept → start → location(consent) → complete → withdraw  
3. **ADMIN:** credentials/eKYC → withdrawals → safety incidents → disputes  

---

## Error shape

```json
{
  "success": false,
  "statusCode": 400,
  "message": "...",
  "code": "BAD_REQUEST",
  "meta": { "requestId": "..." }
}
```
