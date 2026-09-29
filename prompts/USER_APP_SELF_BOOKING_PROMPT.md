# USER APP — book a caregiver for myself (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app**.

## Context (important)

- Envelope API, family-member booking, payment, review, dispute, inbox, and push are **ALREADY implemented**.
- Do **NOT** rebuild those flows.
- Do **NOT** invent endpoints. This is the same `POST /api/v1/bookings`.
- Keep the current UI. Add one patient choice: **Myself**, next to the existing family-member list.
- Product rule stays: the user **picks a caregiver and books directly** (`provider_id` required). Do not build auto-match UI.

## What changed on the backend

Previously a booking always required `family_member_id` (a family member).

Now the same create endpoint also accepts a booking **for the logged-in user**.

`book_for` is `"FAMILY"` (default, current behavior) or `"SELF"`.

### Book for a family member (do not change this)

```json
{
  "book_for": "FAMILY",
  "family_member_id": "<uuid>",
  "provider_id": "<caregiver_profiles.id>",
  "service_type": "HOSPITAL_ASSISTANCE",
  "booking_date": "2026-09-15",
  "start_time": "10:00",
  "duration_hours": 4,
  "hospital_id": "<uuid or omit>",
  "patient_requirements": "",
  "notes": ""
}
```

`book_for` may be omitted. If it is omitted, `family_member_id` is still required. Existing family bookings must keep working exactly as they do now.

### Book for myself (new)

Do **not** send `family_member_id`.

```json
{
  "book_for": "SELF",
  "provider_id": "<caregiver_profiles.id>",
  "service_type": "HOSPITAL_ASSISTANCE",
  "booking_date": "2026-09-15",
  "start_time": "10:00",
  "duration_hours": 4,
  "district": "Dhaka",
  "thana": "Dhanmondi",
  "house": "House 12, Road 4",
  "blood_group": "B+",
  "allergies": "",
  "existing_conditions": "",
  "current_medications": "",
  "medical_history": "",
  "patient_requirements": "",
  "notes": ""
}
```

Rules:

- Patient name, phone, photo, and date of birth come from the **user profile**. Do not send a separate patient name.
- Before opening self-booking, the profile `name` must be set. If it is empty, `POST /bookings` returns `400`: `Add your name on your profile before booking for yourself`. Send the user to edit profile.
- `district`, `thana`, and `house` are optional. Send them when the user picks a service location. `house` falls back to the profile `address` when omitted.
- Medical fields above are optional. Send them only if the user filled them in. Do not show that medical text on caregiver-facing screens in the user app.
- Sending both `book_for: "SELF"` and `family_member_id` returns `400`: `family_member_id must not be sent when book_for is SELF`.
- `provider_id` is still required by the app (user selected the caregiver).
- `409 CONFLICT` still means the caregiver is busy or outside weekly availability. Show the API message.

## How to show it in lists and detail

Booking objects now include `book_for`: `"SELF"` or `"FAMILY"`.

For a self booking:

- `family_member_id` is `null`
- `family_member_name` is the user's name
- `family_member_relationship` is `"Self"`
- `family_member_district`, `family_member_thana`, `family_member_house` are the location sent at booking time (or the profile address in `house`)

Use the same patient row the app already renders for family members. When `book_for === "SELF"`, label it **Myself** / the user's name. Do not look up a family member by id.

Family bookings still use `family_member_*` from the family member. Do not change that rendering.

## UI to add

On the “who is this care for?” step:

1. First option: **Myself** (uses the logged-in user).
2. Then the existing family-member list, unchanged.
3. Selecting Myself does not call `GET /family-members` as a requirement and does not create a family member.
4. Optional location fields (district, thana, house) for Myself. Reuse the same inputs family booking already has if they exist.
5. Submit `book_for: "SELF"` without `family_member_id`.
6. Booking cards and detail: if `book_for` is `SELF`, show Myself. Otherwise show the family member name as today.

## Do not

- Do not remove family-member booking.
- Do not create a fake family member with relationship `"Self"` to work around this. The backend stores self bookings without `family_member_id`.
- Do not call caregiver accept / reject / start / complete.
- Do not add auto-match / book-without-caregiver UI.

## Done when

1. Existing family-member booking still sends `family_member_id` and succeeds.
2. A user with a profile name can book a selected caregiver for themselves with `book_for: "SELF"` and no `family_member_id`.
3. Booking list and detail show **Myself** when `book_for` is `SELF`.
4. Missing profile name shows the API error and routes to profile edit.
5. No other booking, payment, or inbox flow changes.
