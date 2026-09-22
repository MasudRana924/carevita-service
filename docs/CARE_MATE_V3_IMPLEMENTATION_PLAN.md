# CareMate v3 — Implementation Plan

**Prerequisites:** `CARE_MATE_V3_CODEBASE_AUDIT.md`, `CARE_MATE_V3_GAP_ANALYSIS.md`  
**Rule:** Incremental work only. No giant rewrite. After each logical area: tests + lint + fix regressions.  
**Constraint:** Do **not** introduce `users.role = NURSE`. Use `caregiver_profiles.provider_type`.

---

## Guiding principles

1. Preserve working USER / CAREGIVER / ADMIN marketplace loops.  
2. Prefer additive API fields over breaking renames.  
3. Financial and booking mutations must be transactional.  
4. If a business rule is underspecified → stop, document decision, choose safest temporary behavior.  
5. Canonical migrations: `npm run migrate` then `npm run migrate:sql` only for new DDL.  
6. Canonical auth: **email + password + email OTP** (harden; do not switch to phone-first without product sign-off).

---

## Workstreams overview

| Wave | Focus | Exit criteria |
|------|--------|----------------|
| **W0** | Foundations (tests harness, env fail-closed, migration hygiene docs) | `npm test` runs; prod config assert |
| **W1** | P0 Security / money / integrity | Critical threats mitigated; tests green |
| **W2** | P1 Marketplace (NURSE, verification, booking/refund/withdraw/safety/location) | Nurse bookable; ops workflows |
| **W3** | P1 Operations (audit, logging, health, CSP, rate limits polish) | Observable + operable |
| **W4** | P2 Quality (docs, perf, Nagad abstraction docs) | Readiness report |

---

## W0 — Foundations (before feature changes)

### W0.1 Test harness
- Add Jest (or Vitest) + `supertest` + test DB strategy.
- Scripts: `test`, `test:unit`, `test:integration`.
- Seed helpers for USER/CAREGIVER/ADMIN.
- **Do not** claim coverage until W1 tests land.

### W0.2 Production config assert
- New `config/validateEnv.js`: in `NODE_ENV=production`, require `JWT_SECRET`, `JWT_REFRESH_SECRET`, DB, `BKASH_CALLBACK_SECRET`, `DIDIT_WEBHOOK_SECRET`; force `ALLOW_STATIC_OTP` off; reject default JWT fallbacks.
- Call from `server.js` before listen.

### W0.3 Migration ownership note
- README: canonical = `migrate` + `migrate:sql`.
- Mark `run-migration.js` deprecated in comments/README (do not delete yet).

**Checks:** boot fails with missing secrets in production mode; test runner executes empty suite.

---

## W1 — P0 Security / Data Integrity

Order is deliberate (dependency order).

### Step 1 — Authentication (AUTH-01)
**Intent:** Close privilege escalation and session weaknesses without abandoning email+password clients.

| Change | Detail |
|--------|--------|
| Register roles | Allow only `USER` or `CAREGIVER`; ignore/forbid `ADMIN` from public register |
| Access TTL | Default `JWT_EXPIRE=15m` (env); document client impact |
| Refresh store | Table `refresh_tokens` (hash, family_id, user_id, expires, revoked) |
| Rotation | Issue new refresh; revoke old; reuse of revoked → revoke family |
| Logout | `POST /auth/logout` revokes family / current token |
| OTP | Attempt counter + lockout; keep static OTP gate |
| Secrets | Remove insecure jwt.js defaults in production path |

**Tests:** OTP expiry/attempts; rotation; reuse; logout; register cannot create ADMIN.  
**Checks:** lint + tests.

### Step 2 — RBAC / IDOR (RBAC-01)
**Intent:** Prove ownership on every mutating/read sensitive route.

- Inventory routes; add shared asserts.
- Fix any discovered IDOR.
- Admin remains role-gated; start auditing sensitive reads.

**Tests:** cross-user booking/family/wallet denied.  
**Checks:** tests.

### Step 3 — Payment integrity (PAY-01)
**Intent:** No spoofed callback / amount mismatch / double complete.

- Require `BKASH_CALLBACK_SECRET` in production.
- Reconcile bKash amount to booking `payableAmount` (tolerance 0.01).
- Wrap mark payment + booking status + wallet in one transaction where feasible.
- Idempotent execute/callback.

**Tests:** replay callback; wrong amount; double execute.  
**Checks:** tests.

### Step 4 — Money rule snapshot (MONEY-01)
**Intent:** Historical bookings keep original economics.

- Prefer settle using `booking.platform_fee` / stored amounts already on booking.
- Optionally add `money_rules_snapshot JSONB` on create.
- Stop using live `PLATFORM_FEE_RATE` at wallet distribute.

**Tests:** change env fee mid-flight; old booking fee unchanged.  
**Checks:** tests.

### Step 5 — Wallet / withdrawal concurrency (WALLET-01)
**Intent:** No double credit/debit under concurrency.

- Lock wallet row on debit/credit/approve.
- Conditional withdrawal status transition PENDING→COMPLETED once.
- Keep unique `(payment_id, category)`.

**Tests:** concurrent withdraw; double credit attempt.  
**Checks:** tests.

### Step 6 — Booking accept/assign races (BOOK-02)
**Intent:** One winner under concurrent accept/timeout.

- `BEGIN` + `SELECT … FOR UPDATE` on booking for accept/reassign/timeout claim.
- Conditional `UPDATE … WHERE status = …`.

**Tests:** two accepts; accept vs timeout.  
**Checks:** tests.

### Step 7 — PHI access policy (PHI-02) + leakage hygiene (PHI-01 partial)
**Intent:** Assignment/acceptance-aware visibility; no PHI in logs/notifications.

- Redaction matrix by role + status (before accept: no medical fields; after accept: defined minimum fields only).
- Admin PHI requires audit event (permission optional stub: `phi:read` flag later).
- Encryption: if `PHI_KEK` present, implement AES-256-GCM envelope; else document temporary plaintext + access controls as residual risk.

**Decision gate:** Exact post-accept field list must match product; propose: allergies + current_medications + existing_conditions only; withhold full medical_history until approved.

**Tests:** provider before/after accept; user; admin audit.  
**Checks:** tests.

### Step 8 — Webhook security polish (EKYC-01)
- Audit log failed Didit signature with request_id (no body secrets).
- Confirm production never skips verify.

**Tests:** bad signature; replay event_id.  
**Checks:** tests.

### Step 9 — Admin authorization minimum (RBAC-02 / ADMIN-01)
- Gate withdrawal approve + eKYC force actions (already ADMIN).
- Audit PHI booking access + withdrawal + eKYC decisions comprehensively.
- Defer full permission matrix to W2 if needed; at minimum prevent public role escalation (done in Step 1).

**Tests:** non-admin denied; audit rows written.  
**Checks:** tests.

### Step 10 — Rate limits + Socket (SEC-02, SOCKET-01)
- Stricter OTP/login limiters; booking create; payment create; withdraw; review.
- Socket unauthorized room tests.

**Checks:** tests.

### Step 11 — Config fail-closed (CFG-01)
- Complete W0.2; add startup tests.

---

## W2 — P1 Marketplace correctness

### Step 12 — NURSE subtype (NURSE-01)
- Migration: `caregiver_profiles.provider_type` CHECK (`CAREGIVER`,`NURSE`) default `CAREGIVER`.
- Credential fields: license/credential number, type, verification_status, expiry, specialization, experience, service eligibility.
- Admin: review / verify / reject / suspend / reactivate / request re-verify (**manual**, no fake BNMC).
- `eligible_for_booking = false` if NURSE credential expired or not verified.
- Booking create: optional `requested_provider_type`; assignment filters accordingly.
- **Never** add `users.role = NURSE`.

**Tests:** subtype, expiry blocks match, admin verify.  
**Checks:** migrations + tests.

### Step 13 — Verified trust model (TRUST-01)
- Compute presentation: `verification_badge` / `eligible_for_booking` from eKYC + profile + nurse credentials.
- Assignment requires eligibility.

**Tests:** unverified excluded.

### Step 14 — Booking state machine docs + tests (BOOK-01)
- Publish transition matrix in docs.
- Add only necessary states; prefer payment/refund tables for money states.
- `PAYMENT_PENDING`: **decision** — either add status after accept before pay, or keep `PROVIDER_ACCEPTED` + `payment_status=PENDING` (current). Recommend **keep current** to avoid client break; document equivalence.

### Step 15 — Assignment ranking (BOOK-03)
- Reorder SQL to PRD: rating, completed, district, thana; then availability loop.
- Filter by provider_type + eligibility.
- **No** rejection cooldown unless product approves (track as deferred).

### Step 16 — Refund robustness (CANCEL-01)
- Surface refund status on cancel response/booking.
- Retry path for failed refunds; never double refund.

### Step 17 — Withdrawal states (WITHDRAW-01)
- States: PENDING → APPROVED → PROCESSING → COMPLETED | FAILED | REJECTED (map carefully for backward compat: treat old COMPLETED as paid).
- Admin two-step optional: approve (hold funds) vs mark paid.

### Step 18 — Notifications coverage (NOTIF-01)
- Checklist vs PRD events; ensure inbox durability; strip PHI.

### Step 19 — Location privacy (LOC-01)
- Consent at service start / first publish.
- Retention purge job (e.g. 24–72h after complete — **confirm retention days with product**; default propose 48h).

### Step 20 — Safety incident (SAFETY-01)
- `POST /bookings/:id/safety-incident` for USER.
- Freeze caregiver withdrawal / mark booking flag.
- Admin list + notify.
- Response copy: support contact only — **no emergency dispatch claims**.

### Step 21 — Reviews / no-show (REVIEW-01, NOSHOW-01)
- UNIQUE review per booking; ownership checks.
- Minimal no-show job after grace past scheduled start while PAYMENT_PAID.

### Step 22 — Offer job multi-instance (JOB-01)
- Advisory lock or DB claim already present; document cancelOfferTimeout N/A.

---

## W3 — P1 Operations

### Step 23 — Audit logging completeness
- WHO/WHAT/WHEN/RESOURCE/RESULT/request_id/reason; never secrets/PHI.

### Step 24 — Structured JSON logging
- Middleware: method, route, status, duration, request_id, user id.
- Replace noisy console in hot paths gradually.

### Step 25 — Health checks
- `GET /health/live` — process up.
- `GET /health/ready` — DB ping (internal).
- Keep `/api/v1/health` for compatibility.

### Step 26 — Helmet CSP strategy
- Strict CSP for API JSON routes; separate Swagger middleware with relaxed CSP only under `/api-docs`.
- HSTS when `NODE_ENV=production` and HTTPS.

### Step 27 — Upload hardening
- Magic-byte / stricter filters; document public vs private assets.

### Step 28 — Validation pass
- express-validator on remaining public endpoints.

### Step 29 — Migration cleanup
- Deprecate `run-migration.js` in package scripts notes; ensureSchema limited.

---

## W4 — P2 Quality & closeout

### Step 30 — Performance pass
- Measure N+1 in booking list/assignment; add indexes only with evidence.
- Targets: GET p95 &lt; 400ms; POST &lt; 700ms internal; booking create &lt; 2.5s.

### Step 31 — Nagad
- PaymentProvider interface + bKash adapter.
- Document missing Nagad merchant API requirements; **do not invent**.
- Keep Nagad as MFS withdrawal destination label only until payment specs exist.

### Step 32 — Documentation
- Update README, API_DOCUMENTATION (or replace stale CareBridge content), client prompts if needed.
- Produce:
  - `CARE_MATE_V3_THREAT_MODEL.md`
  - `CARE_MATE_V3_SECURITY_CHECKLIST.md`
  - `CARE_MATE_V3_IMPLEMENTATION_NOTES.md`
  - `CARE_MATE_V3_FINAL_READINESS_REPORT.md`

### Step 33 — Final validation
- Full test suite, lint, migrate dry-run, dependency audit (`npm audit`), manual review.

---

## Database migrations expected (summary)

| Migration | Wave | Purpose |
|-----------|------|---------|
| `refresh_tokens` / sessions | W1 | Refresh rotation |
| OTP attempt columns or table | W1 | Brute-force |
| `money_rules_snapshot` (optional) | W1 | Deterministic fees |
| PHI ciphertext columns / KEK meta | W1–W2 | Encryption when ready |
| `caregiver_profiles.provider_type` + credentials | W2 | NURSE |
| `location_consent` / retention | W2 | Privacy |
| `safety_incidents` | W2 | Safety |
| Withdrawal status expansion | W2 | Payout clarity |
| Admin permissions (optional) | W2 | Fine-grained RBAC |
| `reviews` unique booking constraint | W2 | Integrity |

---

## API changes expected

| Change | Breaking? | Notes |
|--------|-----------|-------|
| Access token ~15m | **Possibly** for clients caching long tokens | Document; env-configurable |
| `POST /auth/logout` | No | Additive |
| Register rejects ADMIN role | Soft break for misbehaving clients | Correctness |
| Caregiver `provider_type` + credentials | No | Additive |
| Booking `requested_provider_type` | No | Optional |
| PHI fields appear for provider after accept | Behavior change | Document |
| Safety incident endpoints | No | New |
| Health `/health/live|ready` | No | Additive |
| Withdrawal status enum expansion | Soft | Map old COMPLETED |

---

## Environment changes expected

| Variable | Action |
|----------|--------|
| `JWT_EXPIRE` | Prefer `15m` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Required prod; no defaults |
| `ALLOW_STATIC_OTP` | Forced off in production |
| `BKASH_CALLBACK_SECRET` | Required prod |
| `DIDIT_WEBHOOK_SECRET` | Required prod |
| `PHI_KEK` / encryption keys | New when encryption lands |
| Platform fee / cancel / min withdraw / offer timeout | Keep env; snapshot at booking |
| Nagad payment vars | Keep unused until provider built |

---

## Explicit non-goals (do not implement)

Doctors, labs, medicine, ambulance, emergency dispatch, diaspora payment, insurance, corporate care, continuous background location, auto small withdrawal approval, HSM/SOC2, multi-region, unrelated redesigns.

---

## Decision log (must resolve during implementation)

| ID | Question | Safe temporary default |
|----|----------|------------------------|
| D1 | Phone-first OTP vs keep email+password? | **Keep email+password+OTP** |
| D2 | Add `PAYMENT_PENDING` booking status? | **No** — use `PROVIDER_ACCEPTED` + `payment_status` |
| D3 | Wallet credit at pay vs at completion? | Keep pay-time credit; freeze on safety incident / optional hold flag if product requires |
| D4 | Post-accept PHI field set | Allergies + meds + conditions; not full history until approved |
| D5 | Location retention days | 48h purge unless product says otherwise |
| D6 | Rejection cooldown | **Off** |
| D7 | Nagad checkout for v3 | Abstraction only until API specs |

---

## Phase 0 exit report (for stakeholders)

### Already working
- USER / CAREGIVER / ADMIN marketplace loop  
- Email OTP + password auth (functional)  
- Booking journey + offer timeout reassignment  
- bKash pay after accept + payment→wallet ledger  
- Didit eKYC with HMAC + idempotency  
- Inbox + FCM  
- Live location scoped to in-progress service  
- Cancellation policy + refund attempt path  
- Admin ops surface  

### Unsafe / needs hardening
- Client-selectable register `role` (ADMIN possible)  
- Long-lived access JWT (7d) + stateless refresh  
- JWT secret fallbacks; optional bKash callback secret  
- CSP disabled globally; open CORS reflect  
- Wallet settle uses live fee rate  
- Withdrawal marked COMPLETED without external payout proof  
- Accept/assign races without row locks  
- No automated tests  
- Flat admin + incomplete audit  

### Missing
- NURSE `provider_type` + credentials  
- Refresh rotation / reuse / logout  
- Safety incidents  
- Structured logging; live/ready health  
- PHI encryption; assignment-based PHI reveal  
- Location consent/retention  
- Permission-based admin  
- Nagad as payment provider  
- No-show automation  

### Conflicts with PRD
- Access token lifetime  
- Money rule historical determinism at settlement  
- NURSE model (docs vs schema)  
- “Verified” matching without eKYC  
- Provider PHI always redacted (stricter than post-accept PRD)  

### P0 blockers
Auth session security + role injection; payment/callback integrity; money snapshot at settle; wallet/withdraw races; booking accept races; PHI policy; OTP/rate limits; production config fail-closed; test harness for financial paths.

### P1 / P2
See gap analysis summary (NURSE, trust, refund UX, withdrawal states, safety, location, observability, Nagad deferral, docs/perf).

### Migrations / API / env
See tables above — **implementation begins only after this plan is accepted**.
