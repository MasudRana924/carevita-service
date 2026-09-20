# ADMIN PANEL — DELTA ONLY (copy-paste this prompt)

You are updating the **existing CareMate ADMIN web panel**.

## Context (important)

- Admin APIs (dashboard, users, caregivers, hospitals, bookings, disputes, withdrawals, refunds, eKYC, audit) are **ALREADY implemented**.
- This backend release did **NOT** add/remove/rename admin endpoints.
- Do **NOT** rebuild the admin panel from scratch.
- Do **NOT** invent endpoints.
- Keep current UI; only apply the small deltas below (optional but recommended).

## Verdict

| Area | API change? | Admin panel action |
|------|-------------|-------------------|
| `/admin/dashboard` | No | None |
| `/admin/users/*` | No | None |
| `/admin/caregivers/*` + eKYC | No | None (existing Didit review stays) |
| `/admin/hospitals/*` | No | None |
| `/admin/disputes/*` | No | None |
| `/admin/withdrawals/*` | No | None |
| `/admin/audit-logs` | No | None |
| Refund `/payments/bkash/refund*` | No | None |
| `/admin/bookings` list/detail/cancel | **Additive fields only** | Show new booking fields (below) |
| Auth OTP (if admin uses email OTP) | Behavior change | Stop assuming OTP `5852` |

## Only optional UI updates

### 1. Booking detail — new fields (recommended)

`GET /admin/bookings/:id` may now include:

- `offer_expires_at` — when the current caregiver must accept (`PROVIDER_ASSIGNED`)
- `accept_timeout_minutes` — timeout config (default 15)

In booking detail / list (if easy):

- When `status === "PROVIDER_ASSIGNED"` and `offer_expires_at` is set → show **“Offer expires at …”** or a small countdown
- When `status === "SEARCHING_PROVIDER"` → badge/label **“Searching caregiver”** (user booked; waiting for assignment / reassignment after reject or timeout)

Cancel stays the same:

- `POST /admin/bookings/:id/cancel` `{ reason }`
- Response still has `cancellation_policy` + `refund`

Statuses unchanged:

`SEARCHING_PROVIDER`, `PROVIDER_ASSIGNED`, `PROVIDER_ACCEPTED`, `PAYMENT_PAID`, `SERVICE_IN_PROGRESS`, `SERVICE_COMPLETED`, `CANCELLED_BY_USER`, `CANCELLED_BY_PROVIDER`, `CANCELLED_BY_ADMIN`

### 2. OTP (only if admin login/register uses email OTP)

- Production: use OTP from email — do **not** hardcode `5852`
- Dev may still work with static OTP only if backend has `ALLOW_STATIC_OTP=true`

Password login (`POST /auth/login`) is unchanged.

### 3. Product note (ops copy only — no new API)

- Users **directly select** a caregiver when booking (`provider_id`).
- If caregiver rejects or does not accept before `offer_expires_at`, backend reassigns or sets `SEARCHING_PROVIDER`.
- Admin does not need a new “match agent” screen.

## Do NOT do

- Change any admin route paths
- Re-wire dashboard / users / caregivers / hospitals / withdrawals / disputes / eKYC if already working
- Build auto-match admin tools
- Call removed user routes like `/bookings/:id/accept` (those were never admin routes)

## Done when

1. Existing admin flows still work with no broken calls.
2. Booking detail shows `offer_expires_at` / searching state (if you choose to show them).
3. OTP no longer assumes `5852` in production (if OTP is used).

If the admin panel already works against current `/admin/*` APIs and you skip the booking display tweaks, **no mandatory update is required**.
