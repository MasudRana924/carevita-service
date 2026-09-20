# CareMate Backend — Implementation Report (v2)

Aligned with the **actual** codebase: caregiver marketplace for Bangladesh families. Out of scope: doctors, nurses-as-separate-role, medicine, diagnostics, ambulance, SOS.

## Product surface

| Domain | Status |
|--------|--------|
| Auth (email OTP + JWT) | Live |
| Family members | Live |
| Caregiver profiles + search + availability | Live |
| Booking journey + reassign + offer timeout | Live |
| bKash pay + wallet + refunds | Live |
| Didit eKYC + admin review | Live |
| Disputes + withdrawals | Live |
| Inbox + FCM | Live |
| Admin dashboard / ops | Live |
| Pricing service | Live (`src/services/pricingService.js`) |
| Nurse / doctor / medicine / ambulance modules | **Removed from scope / docs** |

## Roles

`USER` | `CAREGIVER` | `ADMIN`

## Key services

| Service | Responsibility |
|---------|----------------|
| `bookingJourney.js` | Status machine + presentation flags |
| `bookingAssignment.js` | Availability / area match, reassign |
| `pricingService.js` | Service charge + platform fee |
| `paymentOrchestrationService.js` | Post-bKash settle + notify |
| `cancellationPolicy.js` / `refundService.js` | Cancel + refund |
| `ekycService.js` / `diditService.js` | Identity verification |
| `acceptOfferTimeoutJob.js` | Auto-reassign on offer expiry |
| `startReminderJob.js` | 1h start reminder to caregiver |

## Migrations

1. `npm run migrate` — base schema (`src/database/migrate.js`)
2. `npm run migrate:sql` — versioned patches in `/migrations` via `migrateRunner.js`

Boot no longer runs full migrate on every start.

## API base

`/api/v1` — see Swagger `/api-docs` and `prompts/*_APP_API_UPDATE.md`.
