# USER APP — notifications + next caregiver (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app**.

## Context

- Envelope API, booking, payment, inbox, and push handling already exist. Do **not** rebuild them.
- Do **not** invent endpoints. Use only what is listed here.
- Keep the current UI. Add a notifications screen and a suggestion modal.
- The user still picks a caregiver and books directly. This flow only happens **after** that caregiver rejects or does not accept within 5 minutes.

## 1. Notifications screen (same as caregiver)

Caregiver already lists notifications. The user app needs the same screen.

Call either of these (same data, scoped to the logged-in user):

- `GET /user/notifications?page=1&limit=20`
- `GET /notifications?page=1&limit=20`

Optional query: `is_read=true|false`, `type`.

Each item:

- `id`, `title`, `body`, `type`, `is_read`, `reference_id`, `reference_type`, `data`, `created_at`

Also:

- `GET /user/notifications/unread-count` → `data.unread` for the badge
- `PUT /user/notifications/:id/read` mark one read
- `POST /user/notifications/read-all` mark all read
- `DELETE /notifications/:id` delete one (optional)

Show every notification, newest first. Tap uses `type` + `data` the same way push taps already do. Empty state: “No notifications”.

Register FCM the same way the caregiver app does (`POST /notifications/tokens`) if the user app does not already.

## 2. Caregiver busy → suggest the next one

This **replaces** automatic reassignment. The backend does **not** assign the next caregiver until the user taps Yes.

When the selected caregiver **rejects** or does **not accept within 5 minutes**, the user gets a push:

- `type`: `SUGGEST_NEXT_CAREGIVER`
- `title`: Caregiver is busy
- `body`: “{Name} is busy. Do you want to select the next caregiver?”
- `data.show_modal`: `"true"`
- `data.screen`: `suggest_next_caregiver`
- `data.action`: `CONFIRM_NEXT_CAREGIVER`
- `data.booking_id`
- `data.suggested_caregiver_id`
- `data.suggested_caregiver_name`
- `data.suggested_caregiver_photo`
- `data.suggested_caregiver_rating`
- `data.suggested_caregiver_hourly_rate`
- `data.suggested_caregiver_district`
- `data.suggested_caregiver_thana`
- `data.suggestion_expires_at`

On this push (and when opening a notification of this type), show a **modal**:

- Copy: this caregiver is busy. Do you want the next caregiver?
- Show the suggested caregiver card (photo, name, rating, area, rate) from `data` or from booking detail.
- **Yes** and **No**.

`GET /bookings/:id` while this is pending:

- `status`: `SEARCHING_PROVIDER`
- `awaiting_next_caregiver`: true
- `can_accept_next_caregiver`: true
- `can_decline_next_caregiver`: true
- `suggestion_expires_at`
- `suggested_caregiver`: `{ id, name, profile_photo, rating, hourly_rate, experience_years, district, thana, gender, provider_type }`
- `suggestion_response_timeout_minutes` (default 30)

If the user opens the booking from the list instead of the push, and `awaiting_next_caregiver` is true, show the same modal.

### Yes

`POST /bookings/:id/accept-next-caregiver`

No body. This does **not** create a second booking. It sends this same booking to that caregiver. They have 5 minutes to accept (`offer_expires_at`, `accept_timeout_minutes`).

Then show “Waiting for caregiver to accept” as you already do for `PROVIDER_ASSIGNED`.

If that caregiver is no longer free, the API stays on `SEARCHING_PROVIDER` with a **new** `suggested_caregiver` and the message asks you to confirm the next one. Show the modal again. Do not create a new booking.

### No

`POST /bookings/:id/decline-next-caregiver`

No body. The booking becomes `CANCELLED_BY_USER`.

Show: booking cancelled. The user can create a **new** booking (existing create-booking flow). Do not keep this booking alive.

### If the user does nothing

If they do not tap Yes within `suggestion_expires_at` (default 30 minutes), the backend cancels the booking and sends push `BOOKING_CANCELLED` with `data.action` = `BOOK_AGAIN`.

Refresh the booking and show that it was cancelled. They book again from scratch.

### Other pushes

- `BOOKING_CANCELLED` + `action` `BOOK_AGAIN` → booking cancelled, offer to book again
- `SERVICE_MISSED_START` → caregiver did not start. Open booking detail. Do not ask the user to start anything.
- `SERVICE_NOT_STARTED_REASON` → show the caregiver’s reason (`data.reason`)
- `SERVICE_NOT_STARTED_EMERGENCY` → alert the user. `data.is_emergency` is `"true"`. Show `data.reason` as an emergency. This is the message that must be visible, not only stored in the list.
- `SERVICE_STARTED`, `SERVICE_COMPLETED`, `BOOKING_ACCEPTED` stay as they are

Do **not** treat `BOOKING_REASSIGNED` as “caregiver already changed” anymore. The next caregiver is chosen only after Yes.

## Do not

- Auto-pick or auto-book the next caregiver without the Yes tap
- Call caregiver accept / reject / start / complete
- Rebuild the notifications list from scratch if inbox UI already exists — point it at `/user/notifications`

## Done when

1. User has a notifications screen that lists all of their notifications, with unread badge and mark-read.
2. Push `SUGGEST_NEXT_CAREGIVER` opens a Yes/No modal with the suggested caregiver.
3. Yes calls `POST /bookings/:id/accept-next-caregiver` and then shows waiting-for-accept.
4. No calls `POST /bookings/:id/decline-next-caregiver` and the booking is cancelled so the user can book again.
5. Emergency missed-start push is shown to the user as an emergency, including the reason.
