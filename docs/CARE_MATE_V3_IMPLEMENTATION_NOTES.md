# CareMate v3 — Implementation Notes

## Migrations (canonical)

```bash
npm run migrate       # base schema
npm run migrate:sql   # versioned patches in /migrations
```

Required for this hardening pass:

- `add_auth_sessions_and_otp_attempts.sql`
- `add_nurse_safety_and_snapshots.sql`

`migrate:patch` / `run-migration.js` are **deprecated**.

## Auth (breaking / soft-breaking)

| Change | Client impact |
|--------|----------------|
| Access token default `15m` | Refresh more often; set `JWT_EXPIRE` if needed |
| Refresh tokens persisted + rotated | Old refresh JWTs without DB row fail → re-login |
| Register role | `ADMIN` rejected; only `USER` / `CAREGIVER` |
| `POST /auth/logout` | Body: `{ "refreshToken": "..." }` |

## Money

- Booking stores `platform_fee` / amounts at create + `money_rules_snapshot` JSON.
- Wallet settlement uses **snapshotted** fee proportion, not live `PLATFORM_FEE_RATE`.
- Cancel policy prefers snapshot hours/percent.

## NURSE

- `users.role` stays `CAREGIVER`.
- `caregiver_profiles.provider_type`: `CAREGIVER` | `NURSE`.
- Nurses need `credential_status=VERIFIED` and non-expired `credential_expires_at`.
- Admin: `POST /admin/caregivers/:id/credentials`.

## Safety

- `POST /bookings/:id/safety-incident` `{ "description": "..." }`
- Sets `bookings.payout_frozen=true`. Not an emergency dispatch service.

## PHI

- Providers before accept: no medical fields.
- After accept: allergies / conditions / medications only (not full `medical_history`).
- Admin booking detail audits `ADMIN_PHI_ACCESS`.

## Location

- First publish requires `consent: true`.
- Only while `SERVICE_IN_PROGRESS`.

## Health

- `GET /api/v1/health` (compat)
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready` (DB ping)

## Deferred

- Nagad checkout (abstraction not built; MFS withdrawal label only)
- Full fine-grained admin permission matrix
- PHI envelope encryption (access policy shipped; encryption needs `PHI_KEK`)
- Location retention purge job
- 90-day weighted review average
