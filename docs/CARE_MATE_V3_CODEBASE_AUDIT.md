# CareMate v3 — Codebase Audit (Phase 0)

**Project:** CareMate / carevita-service (`package.json` name: `caremet-service`)  
**Audit date:** 2026-09-22  
**Scope:** Read-only inspection of the brownfield backend. No application code was modified for this document.  
**Classification key:**

| Tag | Meaning |
|-----|---------|
| **EXISTING AND CORRECT** | Present and aligned with v3 intent |
| **EXISTING BUT NEEDS HARDENING** | Present but incomplete/unsafe for production |
| **MISSING** | Required by v3 PRD, not found |
| **CONFLICTS WITH PRD** | Implementation contradicts stated v3 requirements |
| **UNKNOWN / NEEDS DECISION** | Ambiguous; product or architecture decision required |

---

## 1. Current architecture

**Stack (verified):** Node.js + Express 4, PostgreSQL (`pg`), JWT (`jsonwebtoken`), bKash Checkout, Didit eKYC, Firebase Admin (FCM), Cloudinary + Multer, Socket.IO, Helmet, express-rate-limit, express-validator, nodemailer, swagger-jsdoc / swagger-ui-express.

**Entry:** `src/server.js` → HTTP server + Socket.IO; routes under `/api/v1` via `src/routes/index.js`.

**Layering:** routes → controllers → services/models; shared middleware (`auth`, `rateLimiter`, `requestId`, `upload`, `errorHandler`); config under `src/config/`; background jobs started at boot (`acceptOfferTimeoutJob`, `startReminderJob`).

**Roles in DB:** `users.role CHECK (role IN ('USER', 'CAREGIVER', 'ADMIN'))` — **EXISTING AND CORRECT** relative to “no `users.role = NURSE`”.

**Provider typing today:** `bookings.provider_type` defaults to `'CAREGIVER'` and is always set to `'CAREGIVER'` in booking creation. There is **no** `caregiver_profiles.provider_type` column. `API_DOCUMENTATION.md` mentions `CAREGIVER`/`NURSE` in places, but that doc is stale (title “CareBridge”) and does not match runtime schema. — **MISSING** (NURSE subtype) / **CONFLICTS WITH PRD** (docs vs code).

**Classification:** Architecture skeleton **EXISTING AND CORRECT**; NURSE subtype **MISSING**.

---

## 2. Existing database entities

**Bootstrap:** `src/database/migrate.js` creates core tables (idempotent `CREATE IF NOT EXISTS` + ALTER patches).

**Versioned SQL:** `/migrations/*.sql` applied by `src/database/migrateRunner.js` (`npm run migrate:sql`), tracked in `schema_migrations`.

**Legacy runner:** `src/database/run-migration.js` (`migrate:patch` / `migrate:clean`) re-applies a fixed file list **without** `schema_migrations` tracking — competing path.

**Boot:** `ensureFamilyMembersSchema()` in `ensureSchema.js` also patches family_members + live locations at startup.

**Observed entities (from migrate + migrations):**

| Entity | Notes |
|--------|--------|
| `users` | role USER/CAREGIVER/ADMIN; eKYC flags; password optional |
| `otp_verifications` | email/phone OTP rows |
| `family_members` | PHI plaintext TEXT fields |
| `hospitals` | admin CRUD |
| `caregiver_profiles` | verification_status, rating, eKYC mirrors; **no provider_type** |
| `bookings` | journey status, fees, offer_expires_at |
| `booking_status_history` | transition audit |
| `booking_provider_rejections` | reassignment exclusions |
| `booking_live_locations` | last known coords |
| `payments` / `payment_refunds` / `bkash_tokens` | bKash |
| `wallets` / `wallet_transactions` | mutable balance + ledger |
| `withdrawals` | PENDING → COMPLETED/REJECTED |
| `reviews` / `disputes` | post-service |
| `ekyc_sessions` / `ekyc_webhook_events` | Didit |
| `inbox` / `notification_tokens` / `notifications` | FCM + inbox |
| `audit_logs` | actor/action/entity/meta |
| `availability` (weekly slots) | caregiver availability |
| `schema_migrations` | SQL patch tracker |

**Classification:** Core marketplace schema **EXISTING AND CORRECT**; money-rule snapshot tables **MISSING**; nurse credential tables **MISSING**; dual migration ownership **EXISTING BUT NEEDS HARDENING**.

---

## 3. Current authentication flow

**Canonical implementation (code):**

1. `POST /auth/register` — email + password (+ optional `role` from client) → create user → email OTP  
2. `POST /auth/verify-otp` — mark `is_verified`, issue access + refresh JWT  
3. `POST /auth/login` — email + password (requires verified + active)  
4. `POST /auth/send-otp` / `resend-otp` — registration OTP helpers  
5. `POST /auth/refresh-token` — verifies refresh JWT, issues new pair (stateless)  
6. Profile/password/photo under authenticated routes  

**README claim:** “JWT auth (email OTP)” — matches **email + password + OTP verification**, not phone-only OTP login.

**Contradiction check:** Register does **not** require phone; phone is optional on `users`. The PRD note about “phone + password” is **not** the current register contract. — **EXISTING AND CORRECT** relative to README; phone-first auth **MISSING** if product later requires it.

**OTP:**

- TTL 30 minutes; resend cooldown 60s  
- `ALLOW_STATIC_OTP=true` only when `NODE_ENV !== 'production'` — **EXISTING AND CORRECT** gating  
- No per-OTP attempt counter / lockout beyond `authLimiter` — **EXISTING BUT NEEDS HARDENING**  
- OTP stored plaintext in DB — **EXISTING BUT NEEDS HARDENING**

**Tokens:**

- Access: `JWT_EXPIRE` default **`7d`** (not ~15m) — **CONFLICTS WITH PRD**  
- Refresh: default `30d` — **EXISTING AND CORRECT** duration  
- Refresh is **not** persisted; no rotation store, no reuse detection, no session-family revoke — **MISSING**  
- Hardcoded JWT secret fallbacks in `jwt.js` — **EXISTING BUT NEEDS HARDENING** (critical)  
- No logout / token revoke endpoint — **MISSING** (FCM token deactivate exists separately)

**Privilege:** `register` accepts client-supplied `role` including `ADMIN`/`CAREGIVER` — **CONFLICTS WITH PRD** / security defect.

---

## 4. Current authorization / RBAC flow

**Mechanism:** `authenticate` loads user from DB by JWT `userId` (role from DB, not client body). `authorize(...roles)` checks `req.user.role`. `authorizeOwnerOrAdmin` helper exists.

**Pattern:** Coarse role gates on caregiver/admin routes; booking/payment/family endpoints do ownership checks in controllers/services.

**Admin:** All `/admin/*` routes use `authorize('ADMIN')` only — flat admin, no permission strings (`withdrawals:approve`, `phi:read`, etc.) — **EXISTING BUT NEEDS HARDENING** / fine-grained RBAC **MISSING**.

**IDOR:**

- Family members: ownership via `findByUserIdAndId` — generally **EXISTING AND CORRECT**  
- Bookings: owner / assigned caregiver / ADMIN — present in `bookingService` / live tracking  
- Wallet: caregiver self wallet only — **EXISTING AND CORRECT** for happy path  
- Admin booking detail returns full booking join without PHI permission audit — **EXISTING BUT NEEDS HARDENING**  
- Exhaustive endpoint IDOR matrix not proven by tests — **UNKNOWN / NEEDS DECISION** (needs systematic review + tests in implementation)

---

## 5. Current booking lifecycle

**State machine:** `src/services/bookingJourney.js`

```
SEARCHING_PROVIDER → PROVIDER_ASSIGNED → PROVIDER_ACCEPTED → PAYMENT_PAID
  → SERVICE_IN_PROGRESS → SERVICE_COMPLETED
+ CANCELLED_BY_USER | CANCELLED_BY_PROVIDER | CANCELLED_BY_ADMIN
```

`assertTransition` / `TRANSITIONS` enforced in service paths. History written to `booking_status_history`.

**Payment gate:** `paymentEligibility.canUserPayBooking` requires `status === PROVIDER_ACCEPTED` and unpaid `payment_status`. Start service requires `PAYMENT_PAID`. — **EXISTING AND CORRECT** for “pay after accept”.

**Gaps vs PRD logical lifecycle:**

| PRD concept | Code |
|-------------|------|
| `PAYMENT_PENDING` | **MISSING** (payment_status PENDING exists separately) |
| payment failure / expired offer as booking status | offer timeout reassigns; no dedicated payment-fail status — **MISSING** / partial |
| provider no-show / user unavailable | **MISSING** |
| refund pending / refund failed booking states | refund on payment_refunds; booking not always mirrored — **EXISTING BUT NEEDS HARDENING** |

**Classification:** Core happy-path machine **EXISTING AND CORRECT**; extended failure states **MISSING**; casual new states should not be added without matrix + tests.

---

## 6. Current caregiver / provider lifecycle

1. Register as `CAREGIVER` (or register USER then create profile — profile created via caregiver routes)  
2. Profile fields: bio, rates, district/thana, availability slots  
3. Didit eKYC → on Approved, profile `verification_status` may become `APPROVED` (unless `SUSPENDED`)  
4. Admin block/unblock + eKYC approve/decline  
5. Matching requires `is_available`, not suspended, active user  

**“Verified” presentation:** Boolean `ekyc_status` + `verification_status` — not a single aggregated trust badge API. Assignment does **not** require `ekyc_status === true` or `APPROVED` strictly (uses `COALESCE(verification_status,'APPROVED') <> 'SUSPENDED'`). — **EXISTING BUT NEEDS HARDENING** / **CONFLICTS WITH PRD** (verified-only marketplace).

**NURSE credentials / expiry / eligibility:** **MISSING**.

---

## 7. Current eKYC flow

**Files:** `diditService.js`, `ekycService.js`, `ekycController.js`, `EkycSession` model.

**Flow:** Caregiver initiates → Didit session → webhook / poll decision → update user + profile → notify.

**Webhook security:**

- Raw body captured for `/ekyc/webhook`  
- HMAC v2 / raw / simple signatures + timestamp window  
- Production refuses missing secret; non-prod may skip with warning  
- `claimWebhookEvent` idempotency — **EXISTING AND CORRECT** foundation  
- Failed signature returns 401; no dedicated security audit write on failure observed — **EXISTING BUT NEEDS HARDENING**  
- Untrusted simple signature triggers live Didit decision fetch — good  

**Liveness/NID cross-check beyond Didit workflow:** **MISSING** (do not fake). Document what Didit workflow actually verifies in ops notes — **UNKNOWN / NEEDS DECISION** (depends on Didit dashboard config).

---

## 8. Current payment flow

**Provider:** bKash only (`bkashService`, `paymentController`, orchestration).

**Create:** Auth user → owned booking in `PROVIDER_ACCEPTED` → server computes `payableAmount` (advance or total) → optional idempotency key → create payment row + bKash create.

**Execute / query / callback:** Mark payment COMPLETED → booking `PAYMENT_PAID` → wallet distribute → notify caregiver.

**Callback auth:** Optional `BKASH_CALLBACK_SECRET` via header/query; if secret unset, callback may proceed without auth — **EXISTING BUT NEEDS HARDENING**.

**Client amount trust:** Amount taken from booking, not client — **EXISTING AND CORRECT**.

**bKash token returned to client** on `/bkash/token` — **EXISTING BUT NEEDS HARDENING** (exposure risk).

**Nagad payment provider:** No `nagadService.js`; `.env.example` has Nagad vars; withdrawal MFS list includes Nagad as **payout destination label only** — **MISSING** as payment rail; do not pretend it exists.

---

## 9. Current refund flow

**Policy:** `cancellationPolicy.js` uses env hours/percent; unpaid → no refund; paid → full/partial/none by hours until start; admin can full refund.

**Execution:** `refundService.processBookingRefund` → PaymentRefund PENDING → bKash refund → COMPLETED → wallet reverse. Timeout path queries refund status. Max refund attempts enforced.

**Gaps:** Cancel may succeed while refund fails (logged; booking still cancelled) — **EXISTING BUT NEEDS HARDENING**. Duplicate protection via remaining amount / status — partially **EXISTING AND CORRECT**. No explicit user-facing `REFUND_PENDING` booking state — **MISSING**.

---

## 10. Current wallet / withdrawal flow

**Wallet:** Mutable `wallets.balance` + append-only-ish `wallet_transactions`. Unique index `(payment_id, category)` reduces double credit. Debit refuses if balance insufficient. Categories include `PLATFORM_FEE`, `CAREGIVER_EARNING`, `PAYMENT_REFUND`, `WITHDRAWAL`.

**Settlement timing:** Credits happen on **payment success**, not on service completion — product implication: caregiver can withdraw before service completes unless business process blocks it. — **UNKNOWN / NEEDS DECISION** / potential **CONFLICTS WITH PRD** if PRD expects post-completion settlement only.

**Fee rate at settle:** Uses **current** `PLATFORM_FEE_RATE` env, not booking snapshot — **CONFLICTS WITH PRD** (historical determinism).

**Withdrawal:** Caregiver requests PENDING; one pending at a time; min amount; admin approve **debits wallet and marks COMPLETED** without external payout confirmation API — **EXISTING BUT NEEDS HARDENING** (manual payout assumed). Reject leaves balance. No payout state machine beyond PENDING/COMPLETED/REJECTED. No idempotency key on request.

---

## 11. Current notification flow

**Inbox** durable records + **FCM** via `pushNotificationService` / tokens.

**Events observed:** booking offer, accept, reassign, cancel, payment, eKYC, withdrawal, dispute, start reminder.

**Gaps:** No exhaustive guarantee for every PRD event; safety incident notifications **MISSING**. Payload review needed to ensure no PHI — generally booking numbers / screens only in sampled paths — **EXISTING BUT NEEDS HARDENING**.

---

## 12. Current live-location flow

**Table:** `booking_live_locations`.

**Write:** Assigned caregiver only while `SERVICE_IN_PROGRESS` (REST + Socket `tracking:update`).

**Read:** Booking owner, assigned caregiver, or ADMIN; Socket subscribe after `assertCanView`.

**Stop:** Deactivate on complete path (service); `is_active` false after service ends in presenter.

**Missing:** Explicit consent flag, retention/purge job, geo enumeration rate limits — **MISSING**. Continuous background tracking not implemented — **EXISTING AND CORRECT** (in-scope limited).

---

## 13. Current admin capabilities

Users block/status; caregivers list/eKYC approve-decline/block; hospitals CRUD; bookings list/detail/cancel; disputes; withdrawals approve/reject; audit-logs list; dashboard stats.

**No:** money-rule admin UI/API, permission-scoped admins, PHI access audit on booking view, safety incident queue — **MISSING**.

---

## 14. Current security controls

| Control | Status |
|---------|--------|
| Helmet | On; **CSP disabled** globally for Swagger — **EXISTING BUT NEEDS HARDENING** |
| CORS | `origin: true` reflects any Origin — **EXISTING BUT NEEDS HARDENING** |
| Parameterized SQL | Generally used — **EXISTING AND CORRECT** |
| bcrypt passwords | Yes — **EXISTING AND CORRECT** |
| JWT from DB role | Yes — **EXISTING AND CORRECT** |
| requestId middleware | Sets `X-Request-Id` — **EXISTING AND CORRECT**; rarely logged structurally — **EXISTING BUT NEEDS HARDENING** |
| Secrets in `.env.example` | Contains sample SMTP/bKash-looking values — **EXISTING BUT NEEDS HARDENING** |
| Production fail-closed JWT secrets | Fallbacks present — **CONFLICTS WITH PRD** / unsafe |

---

## 15. Existing rate limits

`authLimiter`: 50 / 15 min (send-otp, verify, register, login, resend).  
`apiLimiter`: 100 / 15 min on `/api/`; **skips** Didit webhook path.

**Missing dedicated limiters:** OTP verify stricter, booking create, offer accept, payment initiate, withdrawal, review, safety incident; bKash callback not specially shaped — **EXISTING BUT NEEDS HARDENING**.

---

## 16. Existing audit / logging

**Audit:** `writeAudit` → `audit_logs` used for eKYC, cancel, disputes, withdrawals, some admin caregiver actions, some payment paths. Not comprehensive (login failures, webhook signature failures, PHI access, money rules). Meta is free-form JSON; no immutability enforcement beyond “no delete API”. — **EXISTING BUT NEEDS HARDENING**.

**Logging:** `console.log` / `console.error`; no structured JSON logger; request_id not consistently included — **MISSING** structured observability.

---

## 17. Existing migration ownership

| Script | Role |
|--------|------|
| `npm run migrate` → `migrate.js` | Canonical **base schema bootstrap** |
| `npm run migrate:sql` → `migrateRunner.js` | Canonical **versioned patches** (preferred for new DDL) |
| `migrate:patch` / `migrate:clean` → `run-migration.js` | Legacy re-runner; can re-apply SQL without tracking — **EXISTING BUT NEEDS HARDENING** |
| `ensureSchema.js` at boot | Partial auto-patch — **EXISTING BUT NEEDS HARDENING** |

**Recommendation for later phases:** Document single process: migrate → migrate:sql; deprecate or guard `run-migration.js`.

---

## 18. Existing tests

**No** `test/`, `tests/`, Jest/Mocha/Vitest config, or npm `test` script found.

**Classification:** Automated tests **MISSING** (critical for P0 financial/auth work).

---

## 19. Existing production configuration

**Key env (from `.env.example` + `platform.js`):** DB, JWT, Cloudinary, SMTP, bKash, Didit, Firebase, `PLATFORM_FEE_RATE`, cancel refund hours/percent, `MIN_WITHDRAWAL_AMOUNT`, `ACCEPT_OFFER_TIMEOUT_MINUTES`, `ALLOW_STATIC_OTP` (commented), Nagad stubs (unused).

**Health:** `GET /api/v1/health` returns ok — no `/health/live` or `/health/ready` dependency checks — **EXISTING BUT NEEDS HARDENING**.

**PORT default mismatch:** README 8000 vs `.env.example` 3000 — documentation drift — **EXISTING BUT NEEDS HARDENING**.

---

## 20. Existing technical debt

1. Stale `API_DOCUMENTATION.md` (CareBridge / NURSE shapes not matching code)  
2. Dual/triple migration paths  
3. Client-selectable registration role  
4. Stateless refresh tokens  
5. CSP off globally  
6. Money rules not snapshotted; settle uses live fee rate  
7. Wallet credit at payment time vs completion  
8. Withdrawal COMPLETED without payout provider confirmation  
9. `presentBooking` always strips PHI for providers (no post-accept reveal) while family PHI stored plaintext  
10. Assignment without row locking on accept  
11. No test suite  
12. `cancelOfferTimeoutJob` name from PRD — **does not exist** (only `acceptOfferTimeoutJob`)  
13. Package name `caremet-service` vs CareMate branding  

---

## Finding index (high signal)

| Area | Classification |
|------|----------------|
| USER/CAREGIVER/ADMIN roles | EXISTING AND CORRECT |
| NURSE as `caregiver_profiles.provider_type` | MISSING |
| Email+password+OTP auth | EXISTING AND CORRECT (canonical) |
| 15m access / refresh rotation / reuse detection | CONFLICTS WITH PRD / MISSING |
| Static OTP production gate | EXISTING AND CORRECT |
| Fine-grained admin permissions | MISSING |
| Booking happy-path + payment gate | EXISTING AND CORRECT |
| PAYMENT_PENDING / no-show states | MISSING |
| Money rule snapshot | CONFLICTS WITH PRD / MISSING |
| Wallet ledger + unique payment credits | EXISTING BUT NEEDS HARDENING |
| bKash path | EXISTING BUT NEEDS HARDENING |
| Nagad payment | MISSING |
| Didit webhook HMAC + idempotency | EXISTING AND CORRECT (harden audit) |
| PHI encryption | MISSING |
| PHI after acceptance for provider | MISSING / CONFLICTS WITH PRD |
| Live location scoped to service | EXISTING AND CORRECT |
| Location consent/retention | MISSING |
| Offer timeout job | EXISTING AND CORRECT |
| Safety incident | MISSING |
| Structured logging / live-ready health | MISSING |
| Automated tests | MISSING |
| Helmet CSP strategy | EXISTING BUT NEEDS HARDENING |

---

## Appendix A — Key file map

| Concern | Primary files |
|---------|----------------|
| Auth | `controllers/authController.js`, `middleware/auth.js`, `config/jwt.js` |
| Booking journey | `services/bookingJourney.js`, `services/bookingService.js`, `models/booking/*` |
| Assignment | `services/bookingAssignment.js` |
| Offer timeout | `services/acceptOfferTimeoutJob.js` |
| Pricing | `services/pricingService.js`, `config/platform.js` |
| Payments | `controllers/paymentController.js`, `services/bkashService.js`, `paymentOrchestrationService.js` |
| Refunds | `services/refundService.js`, `cancellationPolicy.js` |
| Wallet | `services/walletService.js`, `models/Wallet.js` |
| Withdrawal | `controllers/withdrawalController.js` |
| eKYC | `services/ekycService.js`, `diditService.js` |
| Location | `services/liveTrackingService.js`, `realtime/socket.js` |
| Admin | `routes/adminRoutes.js`, `controllers/admin*.js` |
| Audit | `utils/audit.js` |
| Migrations | `database/migrate.js`, `migrateRunner.js`, `/migrations` |

---

## Appendix B — Auth contradiction resolution (Phase 0 decision input)

| Source | Claim |
|--------|--------|
| README | Email OTP + JWT |
| Code | Email + password register/login + email OTP verification |
| PRD speculation | Phone + password |

**Recommended canonical launch flow (aligned with code + clients):** keep **email + password + OTP verification** as authoritative; harden tokens/OTP/role; treat phone OTP as optional future unless product explicitly pivots. Confirm with product before phone-first rewrite.
