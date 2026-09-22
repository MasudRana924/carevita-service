# CareMate — All APIs Explained (Why Each Exists)

**Base:** `/api/v1`  
**Auth header:** `Authorization: Bearer <access_token>` (except Public)

This document answers: **কোন API কী করে** and **কেন লাগে**.

---

## Product flow (big picture)

```
USER registers → adds family member → creates booking
     ↓
System offers CAREGIVER/NURSE → accept → USER pays (bKash)
     ↓
Service start → live location → complete → review / wallet withdraw
     ↓
ADMIN: verify eKYC/credentials, approve withdrawals, safety, disputes
```

---

## 0. Health — server কি বাঁচা আছে?

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `GET /health` | Simple OK | পুরনো client / quick check |
| `GET /health/live` | Process up | Load balancer: app process running? |
| `GET /health/ready` | DB ping | Deploy: traffic দেওয়ার আগে DB ready? |

---

## 1. Auth `/auth` — কে তুমি? login/session

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /register` | Email+password দিয়ে account | নতুন USER/CAREGIVER তৈরি (ADMIN public দিয়ে নয় — security) |
| `POST /send-otp` | Email এ OTP পাঠায় | Email verify করতে |
| `POST /verify-otp` | OTP check → tokens | Account verified + login tokens |
| `POST /resend-otp` | আবার OTP (60s cooldown) | Email miss হলে; spam কমাতে cooldown |
| `POST /login` | Email+password → tokens | পরবর্তী login |
| `POST /refresh-token` | নতুন access + refresh | Access ~15m শেষ হলে user কে আবার password চাইতে না; rotation/reuse detection security |
| `POST /logout` | Refresh family revoke | Stolen/old refresh অকেজো করা |
| `GET /profile` | নিজের profile | App header / settings |
| `PUT /profile` | Name/email/address update | Profile edit |
| `PUT /password` | Password change | Account security |
| `POST /profile/photo` | Avatar upload | UI identity |

---

## 2. User `/user` — family app profile shortcuts

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `GET /user/profile` | Profile | USER app dedicated path (auth/profile এর alternate) |
| `PUT /user/profile` | Update + optional photo | Same |
| `POST /user/avatar` | Avatar only | Mobile separate upload UX |
| `GET /user/bookings` | নিজের bookings list | USER home “my bookings” |

---

## 3. Family members `/family-members` — কার জন্য care?

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /` | Add parent/relative + photo + PHI | Booking এ patient দরকার; medical context |
| `GET /` | List own members | Picker UI |
| `GET /:id` | One member | Detail/edit screen |
| `PUT /:id` | Update | Info change |
| `DELETE /:id` | Remove | Cleanup |

**কেন own-only:** অন্যের patient/PHI দেখা IDOR — তাই ownership check।

---

## 4. Hospitals `/hospitals` — কোথায় service?

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `GET /` | Search/list hospitals | Hospital-assistance booking এ hospital pick |
| `GET /:id` | Hospital detail | Map/address/phone দেখানো |

Public — browse করতে login লাগে না।

---

## 5. Caregiver `/caregiver` — provider marketplace

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /profile` | Provider profile; `provider_type` CAREGIVER/NURSE | Service offer করতে profile লাগে; nurse = subtype (users.role নয়) |
| `GET /profile` | Own profile | Edit screen |
| `PUT /profile` | Update rates/area/credentials | Marketplace data |
| `GET /search` | Search providers | USER preferred caregiver pick / browse |
| `GET/PUT /availability` | Weekly time slots | Auto-match: এই সময়ে free কিনা |
| `GET /bookings/my` | Offered/assigned jobs | Provider inbox of work |
| `POST /bookings/:id/accept` | Offer accept | Job confirm → user can pay |
| `POST /bookings/:id/reject` | Decline → reassign | Match অন্য provider |
| `POST /bookings/:id/start` | Service start (after paid) | Lifecycle + live track unlock |
| `POST /bookings/:id/complete` | Service end | Review unlock, tracking stop |
| `POST /bookings/:id/location` | GPS push (`consent: true`) | USER live track; privacy consent |
| `GET /wallet` | Balance + ledger | Earnings দেখা |
| `GET /reviews/my` | Reviews | Reputation |
| `GET .../delivery-methods` | Withdraw channels | UI form (bKash/Nagad/Bank labels) |
| `POST /withdrawals` | Cash-out request | Earn → money out |
| `GET /withdrawals` | Withdraw history | Status track |
| `POST /ekyc/initiate` | Didit KYC start | Trust / verify identity |
| `GET /ekyc/status` | KYC status | App gate “verified?” |
| `GET /:id` | Public profile | USER view caregiver |
| `GET /:id/availability` | Public slots | Before booking check |

---

## 6. Bookings `/bookings` — core marketplace job

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /` | Create job (family, time, hospital, optional nurse request) | Care request শুরু; price server-side; money rules snapshot |
| `GET /` | USER list | My bookings |
| `GET /:id` | Detail + journey flags (`can_pay`, `can_review`…) | Single booking screen |
| `GET /:id/live-location` | Latest GPS | Family track during service |
| `POST /:id/cancel` | Cancel + refund policy | User/provider cancel rules |
| `POST /:id/review` | Rate after complete | Trust / ranking |
| `POST /:id/dispute` | Raise dispute | Conflict ops |
| `GET /:id/disputes` | Dispute history | Status |
| `POST /:id/safety-incident` | Safety report → payout freeze | Safety without fake ambulance/police claim |

**Journey why:**  
`SEARCHING → ASSIGNED → ACCEPTED → PAID → IN_PROGRESS → COMPLETED`  
Pay before start = unpaid service চালু না হওয়া।

---

## 7. Payments `/payments` — bKash money

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /bkash/token` | bKash session token | Checkout SDK |
| `POST /bkash/create` | Create payment for booking | Amount server থেকে (client price trust নয়) |
| `POST /bkash/execute` | Finish payment | Mark paid + wallet credit |
| `POST /bkash/query` | Check status | Network fail / retry |
| `POST /bkash/callback` | Provider callback (secret) | App kill হলেও payment confirm |
| `POST /bkash/refund` | Admin refund | Cancel/dispute money back |
| `POST /bkash/refund/status` | Refund status | Ops + user visibility |

---

## 8. eKYC `/ekyc` — identity trust

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /initiate` | Open Didit session | Caregiver verify |
| `GET /status` | Current KYC flags | App routing |
| `POST /webhook` | Didit server → us (HMAC) | Client fake “I'm verified” বন্ধ |

---

## 9. Inbox `/inbox` — durable notifications

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `GET /` | In-app messages | Push miss হলেও history |
| `GET /unread-count` | Badge | UX |
| `PUT /read-all` | Mark all read | Bulk |
| `GET /:id` | One item | Detail |
| `PUT /:id/read` | Mark read | Per item |

**কেন FCM ছাড়াও:** Push delivery guaranteed নয়।

---

## 10. Notifications `/notifications` — FCM device tokens

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `POST /tokens` | Register device FCM token | Push পাঠাতে |
| `GET /tokens` | List devices | Manage |
| `DELETE /tokens/:id` | Remove token | Logout device |
| `DELETE /tokens/device/:device_id` | By device | Same |
| `POST /tokens/deactivate-all` | All off | Full logout |
| `GET/PUT /preferences` | Push prefs | Mute categories |

---

## 11. Admin `/admin` — ops control plane

| API | কী করে | কেন লাগে |
|-----|--------|----------|
| `GET /profile` | Admin identity | Panel header |
| `GET /dashboard` | Counts/stats | Ops overview |
| `GET /users` | List users | Support |
| `PUT /users/:id/block\|unblock` | Ban/unban | Abuse |
| `PUT /users/:id/status` | Status change | Same |
| `GET /caregivers` | List providers | Verify queue |
| `GET /caregivers/:id/ekyc` | KYC detail | Review |
| `POST .../ekyc/approve\|decline` | Manual Didit decision | Edge cases Didit alone can't |
| `POST .../credentials` | Nurse license verify/reject | Professional gating |
| `PUT .../block\|unblock` | Suspend provider | Safety/quality |
| `GET/POST/PUT /hospitals` | Hospital CRUD | Catalog |
| `PUT /hospitals/:id/status` | Active/inactive | Soft delete |
| `GET /bookings` | All bookings | Ops |
| `GET /bookings/:id` | Detail (PHI audited) | Support with audit trail |
| `POST /bookings/:id/cancel` | Force cancel | Escalation |
| `GET/PATCH /disputes` | Dispute resolve | Conflict |
| `GET /withdrawals` | Payout queue | Finance |
| `POST .../approve\|reject` | Pay or reject withdraw | Manual payout (no auto bank API) |
| `GET /safety-incidents` | Safety queue | Ops |
| `PATCH /safety-incidents/:id` | Resolve + optional unfreeze | Close case |
| `GET /audit-logs` | Who did what | Compliance / forensics |

---

## 12. Socket.IO — live GPS (not REST)

| Event | কী করে | কেন লাগে |
|-------|--------|----------|
| `tracking:subscribe` | Join booking room | Real-time map |
| `tracking:update` | Caregiver GPS | Continuously push |
| `tracking:location` | Server broadcast | USER map update |
| `tracking:ended` | Stop signal | Service complete |

REST location = fallback / poll; Socket = live UX।

---

## Role → কোন API group

| Role | Primary APIs |
|------|----------------|
| **USER** | auth, user, family-members, hospitals, bookings, payments, inbox, notifications |
| **CAREGIVER / NURSE** | auth, caregiver/*, ekyc, withdrawals, inbox, notifications |
| **ADMIN** | admin/* (+ cancel booking, refund) |

NURSE = `users.role = CAREGIVER` + `caregiver_profiles.provider_type = NURSE`.

---

## Quick “কেন এই design?”

1. **OTP + short access token** — account hijack কমাতে  
2. **Pay after accept** — unpaid provider time waste কমাতে + start gate  
3. **Server-side price** — client fee hack বন্ধ  
4. **Wallet ledger** — money audit trail  
5. **Safety freeze** — incident এ payout আটকানো  
6. **PHI after accept only** — privacy vs care balance  
7. **Inbox + FCM** — delivery reliability  
8. **Admin credentials** — nurse fake license ছাড়া automatic BNMC নেই  

Interactive try: `/api-docs` · short table: `docs/CARE_MATE_V3_API_CATALOG.md`
