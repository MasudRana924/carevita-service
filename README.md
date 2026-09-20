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
- Email OTP registration / verification
- JWT access + refresh tokens
- Roles: `USER` | `CAREGIVER` | `ADMIN`
- Profile + avatar upload

### Family members
- CRUD profiles (district / thana / house for matching)
- Photo upload

### Caregivers
- Profile, search, weekly availability slots
- Wallet + withdrawal requests
- Didit eKYC + admin approve / decline

### Bookings
- Hospital assistance / home care
- Journey: `SEARCHING_PROVIDER` → `PROVIDER_ASSIGNED` → `PROVIDER_ACCEPTED` → `PAYMENT_PAID` → `SERVICE_IN_PROGRESS` → `SERVICE_COMPLETED`
- Auto-offer, accept timeout, reassignment on reject / timeout
- Cancel + refund policy, reviews, disputes

### Payments
- bKash create / execute / query / callback / admin refund
- Platform fee + caregiver wallet distribution

### Hospitals
- Public search + admin CRUD

### Inbox & notifications
- In-app inbox + FCM push tokens

### Admin
- Users, caregivers / eKYC, hospitals, bookings, disputes, withdrawals, audit logs

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
| `npm run migrate` | Base schema bootstrap |
| `npm run migrate:sql` | Apply pending files in `/migrations` once |
| `npm run seed` | Seed data |

Schema is **not** auto-migrated on every boot — run migrate scripts explicitly.

## Security

- Helmet, CORS, rate limits
- bcrypt passwords, JWT
- Parameterized SQL
- Role-based authorize middleware

## Client apps

See:
- `prompts/USER_APP_API_UPDATE.md`
- `prompts/CAREGIVER_APP_API_UPDATE.md`
- `prompts/ADMIN_PANEL_API_UPDATE.md`

## License

ISC
