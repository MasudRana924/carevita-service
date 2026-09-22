# CareMate Backend API

Backend for **CareMate** — a Bangladesh family care marketplace where families book **verified caregivers** for hospital assistance and home care, pay with **bKash**, and manage trust via **Didit eKYC**.

> Scope (v2): **USER · CAREGIVER · ADMIN** only. Doctor appointments, medicine delivery, ambulance, diagnostics, and SOS are **out of scope** for this codebase.

## Tech stack

- Node.js + Express
- PostgreSQL (`pg`)
- JWT auth (email OTP)
- Cloudinary (uploads)
- bKash payments
- Didit eKYC
- Firebase Cloud Messaging (push + inbox)

## Core product loop

1. Family creates a booking (optional preferred caregiver, or auto-match)
2. System offers a caregiver by **availability + hospital/area match**
3. Caregiver **accepts within offer timeout** or booking is **reassigned**
4. User pays via bKash → caregiver starts / completes service
5. Wallet settlement + review / dispute

## Features

### Auth & users
- Email + password registration / login with email OTP verification
- JWT access (~15m) + refresh (~30d) with **rotation** and reuse detection
- `POST /auth/logout` revokes the refresh-token session family
- Roles: `USER` | `CAREGIVER` | `ADMIN` (public register: USER or CAREGIVER only)
- Profile + avatar upload
- Dev static OTP only when `ALLOW_STATIC_OTP=true` and **never** in production

### Family members
- CRUD profiles (district / thana / house for matching)
- Photo upload

### Caregivers
- Profile, search, weekly availability slots
- Provider subtype: `CAREGIVER` | `NURSE` (`caregiver_profiles.provider_type`, not `users.role`)
- Wallet + withdrawal requests
- Didit eKYC + admin approve / decline / credential review

### Bookings
- Hospital assistance / home care
- Journey: `SEARCHING_PROVIDER` → `PROVIDER_ASSIGNED` → `PROVIDER_ACCEPTED` → `PAYMENT_PAID` → `SERVICE_IN_PROGRESS` → `SERVICE_COMPLETED`
- Auto-offer, accept timeout, reassignment on reject / timeout
- Cancel + refund policy (snapshotted money rules), reviews, disputes
- Safety incident report (payout freeze; not emergency dispatch)

### Payments
- bKash create / execute / query / callback / admin refund
- Platform fee from booking snapshot + caregiver wallet distribution

### Hospitals
- Public search + admin CRUD

### Inbox & notifications
- In-app inbox + FCM push tokens

### Admin
- Users, caregivers / eKYC / credentials, hospitals, bookings, disputes, withdrawals, audit logs

## Installation

```bash
git clone <repository-url>
cd caremet-service
npm install
cp .env.example .env
# edit .env
createdb caremet_db
npm run migrate          # base schema (migrate.js)
npm run migrate:sql      # versioned SQL patches under /migrations
npm run dev
```

API base: `http://localhost:8000/api/v1`  
Swagger: `http://localhost:8000/api-docs`

## Environment (key vars)

```env
PORT=8000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=caremet_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d
CLOUDINARY_CLOUD_NAME=...
SMTP_HOST=...
SMTP_USER=...
BKASH_APP_KEY=...
DIDIT_API_KEY=...
PLATFORM_FEE_RATE=0.05
ACCEPT_OFFER_TIMEOUT_MINUTES=15
# Dev only — never in production:
# ALLOW_STATIC_OTP=true
# DEV_OTP=5852
```

## Project structure

```
caremet-service/
├── migrations/              # Versioned SQL patches
├── prompts/                 # Client app integration specs
├── src/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── database/            # migrate.js + migrateRunner.js
│   ├── docs/                # swagger-jsdoc
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/            # journey, assignment, pricing, payments, eKYC…
│   ├── utils/
│   └── server.js
├── package.json
└── README.md
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Nodemon |
| `npm start` | Production |
| `npm run migrate` | Base schema bootstrap (**canonical**) |
| `npm run migrate:sql` | Apply pending files in `/migrations` once (**canonical**) |
| `npm test` | Jest unit/integration tests |
| `npm run seed` | Seed data |

Schema is **not** auto-migrated on every boot — run migrate scripts explicitly.

Canonical migration process: `npm run migrate` then `npm run migrate:sql`.  
`migrate:patch` / `migrate:clean` (`run-migration.js`) are **deprecated** — they re-apply SQL without `schema_migrations` tracking.

## Security

- Helmet, CORS, rate limits
- bcrypt passwords, JWT
- Parameterized SQL
- Role-based authorize middleware

## Client apps

See:
- `docs/CARE_MATE_V3_API_CATALOG.md` — full backend API catalog (v3)
- `prompts/USER_APP_API_UPDATE.md`
- `prompts/CAREGIVER_APP_API_UPDATE.md`
- `prompts/ADMIN_PANEL_API_UPDATE.md`

## License

ISC
