# CAREGIVER APP — start only on time, end when time is over (copy-paste this prompt)

You are updating the **existing CareMate CAREGIVER mobile app**.

## Context

- Bookings, accept/reject, start, complete, live location, inbox, and push already exist. Do **not** rebuild them.
- Do **not** invent endpoints.
- Keep the current UI. Only change when Start and End are enabled, and add the “why didn’t you start” screen.
- Accept countdown stays. The limit is now **5 minutes** (`accept_timeout_minutes`, default 5), not 15. Use `offer_expires_at` as you already do.

## 1. Start only when the booked time has arrived

`GET /caregiver/bookings/my` and `GET /bookings/:id` now include:

- `scheduled_start_at` (ISO, Asia/Dhaka wall clock)
- `scheduled_end_at`
- `is_start_time_reached`
- `is_end_time_reached`
- `can_start` — true only when status is `PAYMENT_PAID` **and** now is inside the booked window (start reached, end not reached)
- `can_complete` — true only when status is `SERVICE_IN_PROGRESS` **and** `is_end_time_reached` is true
- `can_report_no_start`

Rules:

- Before `scheduled_start_at`: hide or disable Start. Copy: “You can start when the service time begins.”
- Do not call `POST /caregiver/bookings/:id/start` early. The API returns 400: “Service can only be started when the scheduled time arrives”.
- After `scheduled_end_at`, if status is still `PAYMENT_PAID`, Start stays disabled. The caregiver must explain why they did not start (section 3). The API returns 400 if they try to start late.

Start still requires `latitude` and `longitude`, same as today. Live tracking is unchanged.

## 2. End only after the booked time

While `SERVICE_IN_PROGRESS` and `can_complete` is false, hide or disable End.

Copy: “You can end the service when the booked time is over.”

When the booked time passes, the caregiver gets a push:

- `type`: `SERVICE_END_DUE`
- `data.action`: `END_BOOKING`
- `data.screen`: `booking_details`

Open the booking and enable End (`can_complete` true).

`POST /caregiver/bookings/:id/complete` before the end time returns 400: “Service can only be ended after the booked time has passed”. Do not call it early.

After a successful end, the existing completed + wallet flow stays.

## 3. Did not start — why, and emergency goes to the user

If the booked window ends and the caregiver never started (`PAYMENT_PAID`), they get a push:

- `type`: `SERVICE_NOT_STARTED`
- `data.action`: `REPORT_NO_START`
- `data.screen`: `no_start_reason`
- Body asks why they did not start, and to say if it was an emergency

The user is told separately that the service did not start (`SERVICE_MISSED_START` on the user app). You do not build that screen.

On `REPORT_NO_START` (or when `can_report_no_start` is true), open a small screen:

- Required text field: reason (max 500 characters)
- Switch: “This was an emergency”
- Submit

`POST /caregiver/bookings/:id/no-start-reason`

```json
{
  "reason": "Family emergency, could not reach the patient",
  "is_emergency": true
}
```

- `is_emergency: true` → backend push to the **user**: `SERVICE_NOT_STARTED_EMERGENCY` with the reason. The user must see that emergency.
- `is_emergency: false` → user still gets the reason as `SERVICE_NOT_STARTED_REASON`, without the emergency alert.

Success: leave this screen. `can_report_no_start` becomes false. 409 means a reason was already sent — show that and do not submit again.

If they already started, do not show this screen (`can_report_no_start` is false).

## 4. Accept timeout (verify)

Reject or no accept within 5 minutes removes the job from this caregiver. The **user** is asked if they want the next caregiver. This app does not suggest or assign the next caregiver.

Push `BOOKING_CREATED` still means a new offer, including `offer_expires_at`. Show the 5-minute countdown.

## Do not

- Enable Start before `scheduled_start_at`
- Enable End before `scheduled_end_at`
- Build the user suggestion modal (that is the user app)
- Change wallet, eKYC, or availability

## Done when

1. Start is disabled until the booked start time, and disabled again after the booked end if the service never started.
2. End is enabled only after the booked end time, including from push `SERVICE_END_DUE`.
3. Push `SERVICE_NOT_STARTED` opens a reason form with an emergency switch and calls `POST /caregiver/bookings/:id/no-start-reason`.
4. Accept countdown uses 5 minutes.
