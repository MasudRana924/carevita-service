# CareMate v3 — Threat Model (summary)

| # | Threat | Attack path | Protection now | Residual / follow-up |
|---|--------|-------------|----------------|----------------------|
| 1 | Account takeover | Stolen refresh / OTP brute | Rotation+reuse kill; OTP attempts; rate limits | Device binding later |
| 2 | OTP abuse | Flood send/verify | otpLimiter + attempt lock | SMS cost controls N/A (email) |
| 3 | Fake provider | Register + skip eKYC | Eligibility filter; nurse credentials | Require eKYC for all offers (stricter) optional |
| 4 | Fake eKYC webhook | Spoof Didit | HMAC+timestamp+idempotency+audit reject | — |
| 5 | Payment replay | Replay callback/execute | Idempotent COMPLETED; amount reconcile | — |
| 6 | Payment manipulation | Client amount | Server payableAmount only | — |
| 7 | Double booking accept | Race | FOR UPDATE + conditional status | Multi-instance OK with DB |
| 8 | Booking race assign | Dual timeout jobs | Claim UPDATE on offer expiry | Advisory lock if multi-writer |
| 9 | Double payout | Dual withdraw approve | Claim PENDING→PROCESSING + wallet lock | External payout confirmation P1 |
| 10 | Wallet manipulation | Direct balance | Ledger+unique payment category | Reconciliation job |
| 11 | IDOR | Guess UUIDs | Ownership checks | Expand automated IDOR suite |
| 12 | Privilege escalation | role=ADMIN register | Blocked | Admin invite-only process |
| 13 | PHI leakage | Provider/list/logs | presentBooking policy; admin audit | Encryption at rest |
| 14 | Location leakage | Socket subscribe | assertCanView + consent | Retention purge |
| 15 | Fake reviews | Arbitrary submit | can_review after complete | UNIQUE(booking_id) enforce |
| 16 | Refund abuse | Double refund | remaining amount + refund rows | Retry queue UX |
| 17 | Withdrawal fraud | Fake approve | Admin-only + audit | Two-step payout states |
| 18 | Collusion | User+provider | Disputes/safety freeze | Fraud analytics |
| 19 | Admin abuse | Flat ADMIN | Audits on PHI/withdraw/eKYC | Permission roles |
| 20 | Upload abuse | Malware | MIME+size | Magic-byte + private ACL |
| 21 | Socket abuse | Room join | Auth + booking assert | Rate limit sockets |
| 22 | Notification abuse | Spam FCM | Auth token bind | Per-type limits |
| 23 | DoS | Flood API | apiLimiter + targeted limiters | WAF / CDN |

For each P0 fix, unit tests cover the core invariant where feasible without a live DB.
