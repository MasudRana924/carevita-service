# CAREGIVER APP — day-wise active (copy-paste this prompt)

You are updating the **existing CareMate CAREGIVER mobile app**.

## Context

- Profile, bookings, wallet, and the availability screen already exist. Do not rebuild them.
- Do not invent endpoints.
- Availability is no longer a clock-time window. A caregiver is **active on a weekday** or not. Start time and end time are not used.

## What changed on the backend

`PUT /caregiver/availability` still replaces the saved days. Send only the weekday and whether that day is on:

```json
{
  "slots": [
    { "day_of_week": 0, "is_active": true },
    { "day_of_week": 1, "is_active": true },
    { "day_of_week": 2, "is_active": false },
    { "day_of_week": 3, "is_active": true },
    { "day_of_week": 4, "is_active": true },
    { "day_of_week": 5, "is_active": true },
    { "day_of_week": 6, "is_active": false }
  ]
}
```

`day_of_week`: 0 = Sunday … 6 = Saturday.

`start_time` and `end_time` are optional and ignored. Do not show time pickers.

`GET /caregiver/availability` still returns the saved rows. Use `day_of_week` and `is_active` only.

`is_available` on the profile is still the master switch. If it is false, the user app does not list this caregiver.

## UI

Replace the weekly hours editor with seven day toggles (Sunday–Saturday). Saving turns those days on or off. A caregiver who is active on a day can be booked for any time that day. Overlap with another booking is still rejected by the server.

Accept may return `409` with `Caregiver is not active on this day` or `Caregiver already has a booking in this time slot`. Show the API message.

## Do not

- Rebuild wallet, eKYC, or booking actions
- Add a from-time / to-time availability editor
