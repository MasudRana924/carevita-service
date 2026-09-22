# CareMate v3 — PRD Gap Analysis (Phase 1)

**Based on:** `docs/CARE_MATE_V3_CODEBASE_AUDIT.md`  
**Date:** 2026-09-22  
**Method:** Compare inspected implementation to CareMate v3 requirements. No code changes in this phase.

**Priority legend:**  
- **P0** — Security / money / integrity blockers before production  
- **P1** — Marketplace correctness / NURSE / ops  
- **P2** — Quality, docs, non-blocking hardening  

---

## AUTH-01 — Canonical authentication model

| Field | Content |
|-------|---------|
| **Requirement** | Single canonical auth: register/verify/login with OTP expiry, attempt limits, ~15m access, ~30d refresh rotation + reuse detection, secure logout, static OTP never in production |
| **Current implementation** | Email + password + email OTP; static OTP env-gated; access JWT default **7d**; refresh JWT 30d **stateless**; no logout; register accepts client `role` |
| **Gap** | Token lifetime/rotation/reuse; OTP brute-force; logout; role injection; optional phone not implemented |
| **Risk** | Account takeover, long-lived stolen tokens, privilege escalation to ADMIN |
| **Required change** | Whitelist roles on register; persist refresh sessions; rotate + detect reuse; access ~15m; OTP attempt limits; logout revoke; fail closed if JWT secrets missing in production |
| **Files affected** | `authController.js`, `authRoutes.js`, `config/jwt.js`, `models/User.js`, new `refresh_tokens`/`sessions` migration, middleware |
| **Database change?** | YES |
| **API change?** | YES (additive logout; possibly shorter access TTL — document for clients) |
| **Test required?** | YES |
| **Priority** | P0 |

---

## AUTH-02 — README vs code auth contradiction

| Field | Content |
|-------|---------|
| **Requirement** | Resolve email OTP vs phone+password contradiction |
| **Current implementation** | Code = email+password+OTP; README ≈ accurate; phone optional column unused for primary auth |
| **Gap** | Docs/PRD may still mention phone-first; `API_DOCUMENTATION.md` stale |
| **Risk** | Client teams implement wrong flow |
| **Required change** | Document canonical flow in README + API docs; no phone rewrite unless product decides |
| **Files affected** | `README.md`, `API_DOCUMENTATION.md`, `docs/*` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | NO |
| **Priority** | P1 |

---

## RBAC-01 — Ownership / IDOR on protected resources

| Field | Content |
|-------|---------|
| **Requirement** | USER/PROVIDER/ADMIN server-side ownership; no client-trusted role; prevent horizontal/vertical bypass |
| **Current implementation** | DB role in authenticate; many ownership checks; flat ADMIN |
| **Gap** | No systematic IDOR test suite; admin unrestricted; register role spoofing |
| **Risk** | Cross-user booking/PHI/wallet access |
| **Required change** | Audit each route; shared `assertOwnership` helpers; fix gaps; add IDOR tests |
| **Files affected** | All route controllers, `middleware/auth.js`, booking/family/payment/wallet |
| **Database change?** | NO (unless permissions table) |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## RBAC-02 — Admin permission model

| Field | Content |
|-------|---------|
| **Requirement** | Prefer permission-based admin (`withdrawals:approve`, `phi:read`, …) without over-engineering |
| **Current implementation** | Binary `ADMIN` |
| **Gap** | All admins equal; PHI/booking unrestricted |
| **Risk** | Admin abuse, unaudited PHI |
| **Required change** | Minimal permission flags or scoped roles table; gate sensitive actions; audit PHI reads |
| **Files affected** | `adminRoutes.js`, admin controllers, migration, auth middleware |
| **Database change?** | YES (recommended) |
| **API change?** | MAYBE (admin profile returns permissions) |
| **Test required?** | YES |
| **Priority** | P0 (minimum: PHI + money actions gated/audited); full matrix P1 |

---

## NURSE-01 — Provider subtype

| Field | Content |
|-------|---------|
| **Requirement** | `users.role` stays CAREGIVER; `caregiver_profiles.provider_type` ∈ {CAREGIVER, NURSE}; credentials + eligibility |
| **Current implementation** | No profile `provider_type`; `bookings.provider_type` always CAREGIVER; no nurse credentials |
| **Gap** | Entire NURSE subtype + gating |
| **Risk** | Cannot launch nurse marketplace; wrong matching |
| **Required change** | Migration + model fields + registration/profile APIs + assignment filter by requested type + admin credential review |
| **Files affected** | `CaregiverProfile`, caregiver controllers, `bookingService`, `bookingAssignment`, admin, migrations, docs |
| **Database change?** | YES |
| **API change?** | YES (additive fields; booking may accept requested provider subtype) |
| **Test required?** | YES |
| **Priority** | P1 |

---

## TRUST-01 — Verified provider model

| Field | Content |
|-------|---------|
| **Requirement** | “Verified” only when phone/eKYC/profile/credentials/eligibility pass |
| **Current implementation** | Separate flags; matching allows non-eKYC if not SUSPENDED |
| **Gap** | Aggregated verification; booking eligibility rules |
| **Risk** | Unverified providers receive offers |
| **Required change** | Define `eligible_for_booking` / API trust fields; filter assignment; document what “verified” means |
| **Files affected** | `bookingAssignment.js`, caregiver serializers, ekyc flows |
| **Database change?** | MAYBE |
| **API change?** | YES (response fields) |
| **Test required?** | YES |
| **Priority** | P1 |

---

## EKYC-01 — Didit webhook security

| Field | Content |
|-------|---------|
| **Requirement** | HMAC, replay protection, idempotency, audit failed verification, never trust client status |
| **Current implementation** | Signature + timestamp + event claim; client cannot set status; failed verify → 401 |
| **Gap** | Audit on failed signature; production secret enforcement already mostly there |
| **Risk** | Undetected spoof attempts |
| **Required change** | Security audit events; metrics; never skip verify in production (already) |
| **Files affected** | `ekycController.js`, `diditService.js`, `audit.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## BOOK-01 — State machine completeness

| Field | Content |
|-------|---------|
| **Requirement** | Support SEARCHING→…→COMPLETED plus cancel/reject/expire/payment fail/refund/no-show/reassignment; preserve names where possible |
| **Current implementation** | Strong happy path + cancels; no PAYMENT_PENDING booking status; no no-show |
| **Gap** | Failure/refund/no-show modeling; transition matrix tests |
| **Risk** | Ambiguous payment/service start races |
| **Required change** | Document matrix; add only justified states (prefer `payment_status` + refund rows over new status spam); tests for `assertTransition` |
| **Files affected** | `bookingJourney.js`, consumers, tests |
| **Database change?** | MAYBE |
| **API change?** | MAYBE |
| **Test required?** | YES |
| **Priority** | P1 (matrix/tests P0-adjacent for races) |

---

## BOOK-02 — Assignment races / accept races

| Field | Content |
|-------|---------|
| **Requirement** | No double assignment/accept; locking; expired offer reject |
| **Current implementation** | Timeout job claims offer with conditional UPDATE; accept uses status check without `FOR UPDATE` |
| **Gap** | Concurrent accept/reassign races |
| **Risk** | Double accept / wrong provider |
| **Required change** | Transaction + row lock on accept/assign; conditional status updates |
| **Files affected** | `bookingService.acceptBooking`, `bookingAssignment`, models |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## BOOK-03 — Auto-match ranking

| Field | Content |
|-------|---------|
| **Requirement** | Rating → completed → district → thana → service → availability; cooldown only if approved |
| **Current implementation** | District/thana ordering then rating/completed; LIMIT 20; availability checked in loop; **no cooldown** |
| **Gap** | Ranking order differs slightly (area before rating); no service-category filter for NURSE |
| **Risk** | Suboptimal matches; nurses unmatched |
| **Required change** | Align ORDER BY with PRD; add provider_type + eligibility; **do not** add cooldown unless approved |
| **Files affected** | `bookingAssignment.js` |
| **Database change?** | NO (indexes MAYBE) |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## PAY-01 — Payment gating & integrity

| Field | Content |
|-------|---------|
| **Requirement** | Impossible to start paid service without gate; no double charge; webhook replay; server amounts |
| **Current implementation** | Pay only after accept; start only PAYMENT_PAID; create idempotency; wallet unique payment+category |
| **Gap** | Callback secret optional; execute race; amount from bKash response used for wallet (should reconcile to booking) |
| **Risk** | Spoofed callback; amount mismatch credit |
| **Required change** | Require callback secret in production; reconcile paid amount to booking payable; transactional complete |
| **Files affected** | `paymentController.js`, `paymentOrchestrationService.js`, `walletService.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## PAY-02 — Nagad

| Field | Content |
|-------|---------|
| **Requirement** | If required, new abstraction; do not break bKash; do not invent APIs |
| **Current implementation** | Absent as payment provider |
| **Gap** | Full Nagad checkout |
| **Risk** | Fake integration bugs |
| **Required change** | Introduce `PaymentProvider` interface + bKash adapter; document Nagad gaps; implement Nagad only when specs exist |
| **Files affected** | New payment abstraction; docs |
| **Database change?** | MAYBE |
| **API change?** | MAYBE |
| **Test required?** | YES when implemented |
| **Priority** | P2 (abstraction P1 if time); **defer Nagad API** until specs — document as decision |

---

## MONEY-01 — Money rule snapshot

| Field | Content |
|-------|---------|
| **Requirement** | Snapshot fee/cancel rules on booking create; later env changes must not alter historical bookings |
| **Current implementation** | Fees computed at create into booking columns; **wallet settle recalculates with live `PLATFORM_FEE_RATE`** |
| **Gap** | Settlement ignores booking.platform_fee; no rule version id |
| **Risk** | Wrong historical fees; disputes |
| **Required change** | Settle using booking snapshotted fee/amount; optionally store rule metadata JSON |
| **Files affected** | `walletService.js`, `pricingService.js`, booking create, migrations |
| **Database change?** | MAYBE (rule_version column) |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## WALLET-01 — Ledger integrity

| Field | Content |
|-------|---------|
| **Requirement** | Reconstruct balance from ledger; prevent double credit/debit, concurrent withdrawal, negative balance |
| **Current implementation** | Ledger + balance; unique payment credits; debit guard; withdrawal not locked against concurrent approve |
| **Gap** | Concurrent withdrawal race; settlement timing; optional reconciliation job |
| **Risk** | Double payout / negative balance under concurrency |
| **Required change** | `SELECT … FOR UPDATE` on wallet/withdrawal; idempotent approve |
| **Files affected** | `Wallet.js`, `withdrawalController.js` |
| **Database change?** | MAYBE |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## WITHDRAW-01 — Payout states

| Field | Content |
|-------|---------|
| **Requirement** | Ownership, min amount, idempotency, audit, never mark success only because API sent |
| **Current implementation** | Manual admin complete = COMPLETED + debit; no external payout API |
| **Gap** | Explicit APPROVED/PROCESSING/FAILED/PAID states; idempotency keys |
| **Risk** | False “paid” if admin errs before real transfer |
| **Required change** | Expand states for ops clarity; require note; optional two-step approve→confirm-paid |
| **Files affected** | Withdrawal model/controller, migrations |
| **Database change?** | YES |
| **API change?** | YES (status enum) |
| **Test required?** | YES |
| **Priority** | P1 |

---

## PHI-01 — Storage & leakage

| Field | Content |
|-------|---------|
| **Requirement** | Protect medical_history/allergies/conditions/medications; AES-GCM envelope preferred; no plaintext in logs |
| **Current implementation** | Plaintext TEXT; returned to owning USER; booking join does not select medical fields; `presentBooking` strips PHI for providers always |
| **Gap** | Encryption; provider post-accept minimal PHI; admin PHI audit; log hygiene review |
| **Risk** | PHI breach / oversharing |
| **Required change** | Encryption at rest (env KEK); assignment-aware reveal policy; audit admin access; scrub logs |
| **Files affected** | FamilyMember, booking presentation, admin ops, config |
| **Database change?** | YES (ciphertext + DEK columns or encrypted blobs) |
| **API change?** | MAYBE |
| **Test required?** | YES |
| **Priority** | P0 (access policy + no log leak); encryption P0 if keys available else document temporary plaintext with compensating controls |

---

## PHI-02 — presentBooking / assignment-based visibility

| Field | Content |
|-------|---------|
| **Requirement** | Before accept: minimal decision info; after accept: minimum necessary PHI; admin with permission + audit |
| **Current implementation** | Providers always redacted via `asProvider: true`; users see full booking row (limited PHI columns) |
| **Gap** | No post-accept PHI reveal path |
| **Risk** | Care quality vs privacy — product decision on exact fields |
| **Required change** | Trace callers (done: `withJourney`, caregiver list); implement state-based redaction map; avoid new endpoint unless necessary |
| **Files affected** | `bookingJourney.js`, `bookingService.js`, caregiver controllers |
| **Database change?** | NO |
| **API change?** | YES (fields appear after accept) |
| **Test required?** | YES |
| **Priority** | P0 |

---

## LOC-01 — Live location privacy

| Field | Content |
|-------|---------|
| **Requirement** | Opt-in, active service only, authorized participants, stop after service, retention purge |
| **Current implementation** | Auth + service-in-progress; no consent column; no purge |
| **Gap** | Consent + retention |
| **Risk** | Location leakage / retention compliance |
| **Required change** | Consent flag on start/track; purge job; deny completed history if policy requires |
| **Files affected** | live tracking models/services, booking start, jobs |
| **Database change?** | YES |
| **API change?** | YES |
| **Test required?** | YES |
| **Priority** | P1 |

---

## JOB-01 — Offer timeout idempotency

| Field | Content |
|-------|---------|
| **Requirement** | Timeout/reassign idempotent; cancelOfferTimeoutJob if required |
| **Current implementation** | `acceptOfferTimeoutJob` with claim UPDATE; **no** `cancelOfferTimeoutJob` |
| **Gap** | Name mismatch only if cancel-specific job needed — reassignment covered by accept timeout + reject |
| **Risk** | Low if claim remains solid under multi-instance (single process today) |
| **Required change** | Harden for multi-instance (advisory lock); document that cancelOfferTimeout is N/A |
| **Files affected** | `acceptOfferTimeoutJob.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## NOSHOW-01 — Late arrival / no-show

| Field | Content |
|-------|---------|
| **Requirement** | Minimal detect/notify/reassign/refund/audit |
| **Current implementation** | None |
| **Gap** | Entire policy |
| **Risk** | Stuck bookings |
| **Required change** | Product-minimal: mark no-show after grace; notify; reassign or cancel+refund per policy |
| **Files affected** | New job + bookingJourney + notifications |
| **Database change?** | MAYBE |
| **API change?** | MAYBE |
| **Test required?** | YES |
| **Priority** | P1 |

---

## CANCEL-01 — Cancellation + refund robustness

| Field | Content |
|-------|---------|
| **Requirement** | Server policy; idempotent refund; persist states; no false success |
| **Current implementation** | Policy + refund service; cancel continues if refund fails |
| **Gap** | User-visible refund status; retry job; booking/payment consistency |
| **Risk** | Money lost / UX lies |
| **Required change** | Persist refund outcome on booking; retry queue; don’t claim success without provider confirmation (already mostly) |
| **Files affected** | `bookingService.cancelBooking`, `refundService.js` |
| **Database change?** | MAYBE |
| **API change?** | YES (refund fields) |
| **Test required?** | YES |
| **Priority** | P1 |

---

## REVIEW-01 — Reviews integrity

| Field | Content |
|-------|---------|
| **Requirement** | Participants only; one per booking; after completion; protect averages |
| **Current implementation** | `can_review` after complete; create review; unique by booking lookup not DB unique guaranteed? Check migrate |
| **Gap** | Confirm UNIQUE(booking_id); no 90-day weighted average (simple AVG) |
| **Risk** | Fake reviews |
| **Required change** | DB unique constraint; verify ownership in submit; keep simple AVG unless PRD mandates 90-day |
| **Files affected** | `Review.js`, bookingService submitReview, migration |
| **Database change?** | MAYBE |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## NOTIF-01 — Durable notifications

| Field | Content |
|-------|---------|
| **Requirement** | Critical events in inbox; no PHI in push |
| **Current implementation** | Inbox+FCM for many events |
| **Gap** | Coverage checklist; safety incident; PHI scan |
| **Risk** | Missed UX; PHI leak |
| **Required change** | Event coverage matrix; sanitize payloads |
| **Files affected** | `pushNotificationService.js`, callers |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## SAFETY-01 — Safety incident workflow

| Field | Content |
|-------|---------|
| **Requirement** | User report → create → freeze payout → alert admin → audit → support path; no fake emergency dispatch |
| **Current implementation** | **Missing** |
| **Gap** | Full feature |
| **Risk** | Safety/legal |
| **Required change** | Tables + API + wallet freeze flag + admin list + notifications |
| **Files affected** | New modules, wallet, admin routes |
| **Database change?** | YES |
| **API change?** | YES |
| **Test required?** | YES |
| **Priority** | P1 |

---

## ADMIN-01 — Admin action audit coverage

| Field | Content |
|-------|---------|
| **Requirement** | Audit verify/suspend/refund/withdrawal/money rules/PHI/security config |
| **Current implementation** | Partial writeAudit usage |
| **Gap** | Incomplete coverage; no money rules; PHI reads unaudited |
| **Risk** | Non-repudiation failure |
| **Required change** | Expand audit hooks; immutable access pattern |
| **Files affected** | Admin controllers, audit util |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0/P1 |

---

## OBS-01 — Structured logging + health

| Field | Content |
|-------|---------|
| **Requirement** | JSON logs with request_id; `/health/live` + `/health/ready` |
| **Current implementation** | console + simple `/api/v1/health` |
| **Gap** | Structured logger; dependency readiness |
| **Risk** | Blind ops |
| **Required change** | pino/winston-style logger; health routes |
| **Files affected** | `server.js`, middleware, routes |
| **Database change?** | NO |
| **API change?** | YES (new health paths; keep old) |
| **Test required?** | YES |
| **Priority** | P1 |

---

## SEC-01 — Helmet / CSP

| Field | Content |
|-------|---------|
| **Requirement** | Production-safe CSP; don’t disable globally for Swagger |
| **Current implementation** | CSP false globally |
| **Gap** | Split Swagger vs API CSP |
| **Risk** | XSS on docs host / weak headers |
| **Required change** | Conditional middleware; HSTS in prod HTTPS |
| **Files affected** | `server.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | NO (smoke) |
| **Priority** | P1 |

---

## SEC-02 — Rate limiting coverage

| Field | Content |
|-------|---------|
| **Requirement** | Targeted limits for OTP/login/booking/pay/withdraw/review/incident; safe webhooks |
| **Current implementation** | auth 50 + api 100; ekyc webhook skipped |
| **Gap** | Route-specific limiters |
| **Risk** | Abuse / DoS |
| **Required change** | Additional limiters; bkash callback rate policy |
| **Files affected** | `rateLimiter.js`, routes |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## VAL-01 — Input validation

| Field | Content |
|-------|---------|
| **Requirement** | Validate body/params/query/enums/amounts; never trust client money/role/ids |
| **Current implementation** | Partial express-validator; many manual checks |
| **Gap** | Inconsistent coverage |
| **Risk** | Injection of bad state |
| **Required change** | Central validators on public routes |
| **Files affected** | routes + `middleware/validator.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## DB-01 — Migration ownership

| Field | Content |
|-------|---------|
| **Requirement** | One canonical migrator |
| **Current implementation** | migrate.js + migrateRunner + run-migration + ensureSchema |
| **Gap** | Competing systems |
| **Risk** | Drift / double apply |
| **Required change** | Document + deprecate run-migration; minimize boot DDL |
| **Files affected** | `package.json`, database scripts, README |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | NO |
| **Priority** | P1 |

---

## UPLOAD-01 — Cloudinary security

| Field | Content |
|-------|---------|
| **Requirement** | MIME/size/auth; don’t trust client MIME alone; private sensitive docs |
| **Current implementation** | Multer MIME allowlist + 5MB; public Cloudinary folder |
| **Gap** | Magic-byte check; private ACL for docs |
| **Risk** | Malicious upload / public PHI docs |
| **Required change** | Harden filter; private for eKYC docs if any |
| **Files affected** | `middleware/upload.js`, cloudinary config |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P1 |

---

## SOCKET-01 — Socket.IO authz

| Field | Content |
|-------|---------|
| **Requirement** | Auth connection; booking room auth; no PHI/location leak |
| **Current implementation** | JWT on connect; subscribe/view checks; location only |
| **Gap** | Rate limit; room enumeration; audit |
| **Risk** | Cross-booking subscribe if assert fails |
| **Required change** | Harden errors; tests for unauthorized room |
| **Files affected** | `realtime/socket.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## CFG-01 — Production config fail-closed

| Field | Content |
|-------|---------|
| **Requirement** | Fail if critical secrets missing; ALLOW_STATIC_OTP forced off in production |
| **Current implementation** | Static OTP gated; JWT fallbacks; callback secret optional |
| **Gap** | Boot validation |
| **Risk** | Accidental insecure prod |
| **Required change** | `assertProductionConfig()` on boot |
| **Files affected** | `server.js` / new `config/validateEnv.js` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | YES |
| **Priority** | P0 |

---

## TEST-01 — Automated test suite

| Field | Content |
|-------|---------|
| **Requirement** | Auth/RBAC/NURSE/booking/payment/refund/wallet/PHI/location/admin/upload/socket tests |
| **Current implementation** | None |
| **Gap** | Entire harness |
| **Risk** | Regressions in financial paths |
| **Required change** | Add Jest (or similar) + integration against test DB |
| **Files affected** | `package.json`, new `tests/` |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | N/A (this is the tests) |
| **Priority** | P0 (harness + critical paths) |

---

## DOC-01 — Documentation drift

| Field | Content |
|-------|---------|
| **Requirement** | Accurate README/API docs; v3 audit artifacts |
| **Current implementation** | README decent; API_DOCUMENTATION.md stale; IMPLEMENTATION_REPORT v2 |
| **Gap** | Sync docs with code |
| **Risk** | Wrong client integrations |
| **Required change** | Update after each P0/P1 area |
| **Files affected** | docs/, README, API_DOCUMENTATION |
| **Database change?** | NO |
| **API change?** | NO |
| **Test required?** | NO |
| **Priority** | P2 (maintain continuously) |

---

## Summary counts

| Priority | Approx. requirement groups |
|----------|----------------------------|
| P0 | AUTH-01, RBAC-01, EKYC-01, BOOK-02, PAY-01, MONEY-01, WALLET-01, PHI-01/02 (policy), SEC-02, SOCKET-01, CFG-01, TEST-01, ADMIN audit minimum |
| P1 | NURSE-01, TRUST-01, BOOK-01/03, WITHDRAW-01, LOC-01, JOB-01, NOSHOW-01, CANCEL-01, REVIEW-01, NOTIF-01, SAFETY-01, OBS-01, SEC-01, VAL-01, DB-01, UPLOAD-01, AUTH-02 |
| P2 | PAY-02 Nagad full, DOC polish, performance pass |

**Explicit deferred (out of scope):** doctors, labs, medicine, ambulance, diaspora pay, continuous tracking, SOC2/HSM, multi-region, automatic micro-withdrawal approval.
