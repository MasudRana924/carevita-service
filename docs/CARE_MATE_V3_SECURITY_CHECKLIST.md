# CareMate v3 — Security Checklist

## Before production deploy

- [ ] `NODE_ENV=production`
- [ ] Distinct strong `JWT_SECRET` and `JWT_REFRESH_SECRET` (not example defaults)
- [ ] `JWT_EXPIRE=15m` (or approved value)
- [ ] `ALLOW_STATIC_OTP` unset / false
- [ ] `BKASH_CALLBACK_SECRET` set; callbacks send matching header/query
- [ ] `DIDIT_WEBHOOK_SECRET` set
- [ ] DB credentials via `DATABASE_URL` or DB_* 
- [ ] `npm run migrate` then `npm run migrate:sql`
- [ ] HTTPS + reverse proxy; `trust proxy` already enabled
- [ ] Rotate any secrets previously committed in `.env.example` samples
- [ ] Confirm Swagger not publicly exposed or is IP-restricted if not needed

## Auth

- [ ] Public register cannot create ADMIN
- [ ] OTP attempt lockout (5) works
- [ ] Refresh reuse invalidates session family
- [ ] Logout revokes refresh family

## Money

- [ ] Payment amount mismatch rejected
- [ ] Callback without secret rejected in production
- [ ] Wallet credits idempotent per payment+category
- [ ] Withdrawal approve uses PENDING→PROCESSING→COMPLETED claim

## PHI / location

- [ ] Provider pre-accept responses lack medical fields
- [ ] Admin PHI access creates audit rows
- [ ] Location publish requires consent

## Ops

- [ ] `/health/live` and `/health/ready` monitored
- [ ] Failed Didit webhook creates `DIDIT_WEBHOOK_REJECTED` audit
- [ ] `npm test` green in CI
