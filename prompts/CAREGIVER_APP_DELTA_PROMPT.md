# CAREGIVER APP — DELTA ONLY (copy-paste this prompt)

You are updating the **existing CareMate CAREGIVER mobile app**.

## Context (important)

- Envelope API (`success` / `data` / `meta`), bookings, wallet, availability, withdrawals, disputes, inbox, and push notifications are **ALREADY implemented**.
- Do **NOT** rebuild those from scratch.
- Do **NOT** invent endpoints.
- Keep current UI design; only patch what is listed below.
- Product rule: users book a caregiver **directly**. Your job UI is accept/reject the assigned offer in time.

## Only implement these NEW backend changes

### 1. Offer countdown on `PROVIDER_ASSIGNED` (main change)

Booking detail / job card now includes:

- `offer_expires_at`
- `accept_timeout_minutes` (default 15)

When `status === "PROVIDER_ASSIGNED"`:

- Show Accept / Reject as today
- Show a **countdown**: “Accept within Xm” using `offer_expires_at`
- If timer hits 0 and user has not accepted:
  - Remove this booking from active list (or refresh list)
  - Show toast: offer expired / reassigned
  - Do not keep Accept enabled on an expired offer

Push `BOOKING_CREATED` may include `extraData.offer_expires_at` — use it to start the timer when opening from notification.

### 2. Action routes — caregiver paths only

Use **only**:

- `POST /caregiver/bookings/:id/accept`
- `POST /caregiver/bookings/:id/reject`
- `POST /caregiver/bookings/:id/start`
- `POST /caregiver/bookings/:id/complete`

If the app still calls `/bookings/:id/accept` (etc.), **migrate those calls** to `/caregiver/bookings/:id/...`.

`GET /caregiver/bookings/my` and `GET /bookings/:id` remain for listing/detail.

### 3. Accept errors (already partly done — verify)

On accept `409 CONFLICT`:

- Overlap: “Caregiver already has a booking in this time slot”
- Outside weekly slots: “Requested time is outside caregiver weekly availability”

Show API `message` toast.

### 4. Reject behavior (verify)

Reject does **not** cancel the booking for the user. After reject:

- This job leaves **your** active list
- No need to show searching UI on caregiver side

### 5. OTP

- Stop hardcoding OTP `5852` in production builds.
- Use emailed OTP.
- Handle `OTP_INVALID`.

### 6. Push (add only if missing)

Verify handlers still work:

- `BOOKING_CREATED` (+ optional `offer_expires_at`) → job detail with countdown
- `PAYMENT_RECEIVED` → start enabled
- `SERVICE_START_REMINDER`
- `EARNING_SETTLED`
- `REVIEW_RECEIVED`
- `DISPUTE_UPDATED`
- `WITHDRAWAL_UPDATED`

## Do NOT do

- Auto-match UI
- Map/distance matching screens
- Admin screens / user medical records
- Full app redesign
- Re-implement wallet/availability/withdrawals if already working

## Done when

1. `PROVIDER_ASSIGNED` shows Accept/Reject + live countdown from `offer_expires_at`.
2. Expired offers disappear from active jobs after refresh / push.
3. All accept/reject/start/complete use `/caregiver/bookings/:id/...`.
4. OTP no longer assumes `5852` in production.
5. Existing payment → start → complete → wallet flow still works.
