# USER APP — caregiver list by active day (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app**.

## Context

- Booking create, family/self booking, and the caregiver list already exist. Do not rebuild them.
- Do not invent endpoints.
- The user still picks a caregiver and sends `provider_id`. Do not add auto-match UI.

## What changed on the backend

Booking no longer fails because the requested clock time is outside a caregiver’s weekly hours. That error is gone.

A caregiver is bookable when:

- profile `is_available` is true, and
- they are active on that weekday (if they saved days)

`GET /caregiver/search` now returns only caregivers with `is_available: true`.

When the user has chosen the service date, pass it:

`GET /caregiver/search?booking_date=2026-09-30`

Also keep the filters you already send (`district`, `thana`, and so on).

`booking_date` is `YYYY-MM-DD`. The list is caregivers who are active on that weekday. Caregivers who never saved any days still appear, as long as `is_available` is true.

Do not call `GET /caregiver/:id/availability` to hide people by start/end time. Do not build a “fits this hour” filter.

## Booking

`POST /bookings` is unchanged. Still send `provider_id`, `booking_date`, `start_time`, and `duration_hours`.

`409 CONFLICT` messages to show as a toast:

- `Caregiver is not active on this day`
- `Caregiver already has a booking in this time slot`
- `Caregiver is not available`

## Do not

- Show weekly start/end hours on the caregiver card
- Treat “outside weekly availability” as a current error
