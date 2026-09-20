# USER APP — DELTA ONLY (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app**.

## Context (important)

- Envelope API (`success` / `data` / `meta`), booking journey, payment, review, dispute, inbox, and push notifications are **ALREADY implemented**.
- Do **NOT** rebuild those from scratch.
- Do **NOT** invent endpoints.
- Keep current UI design; only patch what is listed below.
- Product rule: **user always picks a caregiver and books directly** (`provider_id` required). Do not build “book without caregiver / auto-match” UI.

## Only implement these NEW backend changes

### 1. Booking detail — offer waiting UI

`GET /bookings/:id` (and list items if present) now may include:

- `offer_expires_at` (ISO timestamp or null)
- `accept_timeout_minutes` (number, default 15)

When `status === "PROVIDER_ASSIGNED"`:

- Show copy like: **“Waiting for caregiver to accept”**
- Optional countdown from `offer_expires_at` (informational for the user)

When caregiver does not accept in time, backend reassigns or sets searching. Handle existing push + status refresh:

- Push: `BOOKING_REASSIGNED` → refresh booking; show new caregiver
- Push: `BOOKING_SEARCHING` or status `SEARCHING_PROVIDER` → show **“Finding another caregiver…”**
- Push: `BOOKING_REJECTED` (already had) → same searching UI

Do not call accept/reject/start/complete from user app.

### 2. Routes — do not use removed endpoints

These are **caregiver-only** now (removed from `/bookings`):

- ~~`POST /bookings/:id/accept`~~
- ~~`POST /bookings/:id/reject`~~
- ~~`POST /bookings/:id/start`~~
- ~~`POST /bookings/:id/complete`~~

User app keeps:

- `POST /bookings` (with `provider_id`)
- `GET /bookings`, `GET /bookings/:id`
- `POST /bookings/:id/cancel`
- `POST /bookings/:id/review`
- `POST /bookings/:id/dispute`
- `GET /bookings/:id/disputes`
- payments + inbox as already implemented

### 3. Create booking

Keep requiring `provider_id` (user selected caregiver).

On `409 CONFLICT` (busy slot / outside weekly availability): show the API message toast.

### 4. OTP

- Stop hardcoding / always showing OTP `5852` in production builds.
- Use the OTP user receives by email.
- Still handle `OTP_INVALID` and `email_sent: false` gracefully.

### 5. Push types to add (if missing)

If not already handled, add:

- `BOOKING_SEARCHING` → open booking detail, show searching state

Existing ones should already work: `BOOKING_ACCEPTED`, `BOOKING_REASSIGNED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `SERVICE_STARTED`, `SERVICE_COMPLETED`, `DISPUTE_UPDATED`.

## Do NOT do

- Auto-match / book without caregiver
- eKYC, maps, medical vault
- Caregiver accept/reject screens
- Redesign the whole app

## Done when

1. Direct book with selected caregiver still works.
2. `PROVIDER_ASSIGNED` shows waiting (+ optional countdown).
3. Reassign / searching UI works after reject or offer timeout.
4. No calls to removed `/bookings/:id/accept|reject|start|complete`.
5. OTP no longer assumes `5852` in production.
