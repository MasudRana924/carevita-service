# CareMate v3 — Final Readiness Report

**Date:** 2026-09-22  
**Branch work:** P0 hardening + selected P1 (NURSE, safety, location consent, observability basics)

## 1. Completed

| Area | Status |
|------|--------|
| Production env fail-closed | Done |
| Jest test harness | Done |
| Auth: role lockdown, 15m access, refresh rotation/reuse, logout, OTP attempts | Done |
| Payment amount reconcile + callback auth + complete on callback | Done |
| Money snapshot at settle + cancel policy snapshot | Done |
| Wallet/withdrawal locking + claim | Done |
| Booking accept race (FOR UPDATE) | Done |
| PHI assignment-based policy | Done |
| Didit webhook reject audit | Done |
| Admin PHI access audit | Done |
| Targeted rate limits | Done |
| Helmet CSP split (API vs Swagger) | Done |
| Health live/ready | Done |
| NURSE provider_type + credentials + eligibility | Done |
| Safety incident + payout freeze | Done |
| Location consent | Done |
| Threat model / security checklist / impl notes | Done |

## 2. Partially completed

| Area | Notes |
|------|--------|
| Fine-grained admin permissions | Still flat `ADMIN`; sensitive actions audited |
| PHI encryption | Access policy only; needs `PHI_KEK` for AES-GCM |
| Withdrawal payout states | PROCESSING intermediate; still manual COMPLETED |
| Location retention purge | Consent only; no scheduled purge |
| Review UNIQUE constraint | Logic present; confirm DB unique in migrate if missing |
| Structured JSON logging | requestId exists; full pino-style logger not added |
| Nagad payment | Not implemented (env stubs / MFS label only) |
| Automated integration tests vs live DB | Unit tests only |

## 3. Remaining risks

- Pre-migration deploys will break OTP insert (`attempt_count`) / consent / nurse columns until `migrate:sql`.
- Clients with old refresh tokens must re-login.
- Caregiver wallet credited at **payment** time (not service completion) — payout_frozen mitigates safety cases.
- Flat ADMIN remains a privilege concentration risk.

## 4. Security findings addressed

- Client `role=ADMIN` registration  
- Stateless refresh reuse  
- Optional bKash callback in production  
- Live fee rate at wallet settle  
- Unlocked concurrent withdrawal approve  
- Accept race without row lock  
- Always-redact vs post-accept PHI  
- Global CSP off  

## 5. Database changes

- `refresh_tokens`, OTP `attempt_count` / `locked_at`
- `caregiver_profiles.provider_type` + credential fields
- `bookings.money_rules_snapshot`, `payout_frozen`
- `booking_live_locations.consent_granted`
- `safety_incidents`

## 6. API changes

| Endpoint / behavior | Breaking? |
|---------------------|-----------|
| Access TTL 15m | Soft |
| Refresh rotation store | Soft (re-login) |
| `POST /auth/logout` | Additive |
| Register rejects ADMIN | Soft |
| `POST /bookings/:id/safety-incident` | Additive |
| `POST /admin/caregivers/:id/credentials` | Additive |
| Location `consent: true` | Soft |
| `/health/live`, `/health/ready` | Additive |
| Nurse profile fields + `requested_provider_type` | Additive |

## 7. Environment changes

- Prefer `JWT_EXPIRE=15m`
- Distinct JWT secrets required in production
- `BKASH_CALLBACK_SECRET`, `DIDIT_WEBHOOK_SECRET` required in production
- Optional `SUPPORT_HOTLINE`

## 8. Migration instructions

```bash
npm run migrate
npm run migrate:sql
npm test
npm start
```

## 9. Test results

Run `npm test` in CI/local (unit suite). Integration/DB tests still recommended before go-live.

## 10. Performance

No dedicated perf pass; assignment query still LIMIT 20. Monitor booking create latency after nurse filters.

## 11. Production deployment checklist

See `docs/CARE_MATE_V3_SECURITY_CHECKLIST.md`.

## 12. Intentionally deferred

Doctors, labs, medicine, ambulance, diaspora pay, continuous tracking, auto micro-withdrawals, HSM/SOC2, multi-region, Nagad checkout API, full admin RBAC matrix, PHI envelope encryption.
