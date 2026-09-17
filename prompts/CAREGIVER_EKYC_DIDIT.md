You are updating the CareMate CAREGIVER mobile app.

Do not invent endpoints. Do not call Didit (`verification.didit.me`) from the app. The backend creates the session. The app only opens the returned hosted URL in a WebView.

Keep the current visual design. Only add the eKYC gate after OTP / login.

## Goal

After caregiver register + OTP verify, the user gets a JWT. **Do not send them to Home.** If `ekyc_status` is not true, start Didit and show it in a full-screen WebView. Home is allowed only after eKYC is approved.

Same gate on login / splash / cold start: token exists but `ekyc_status !== true` → eKYC WebView, not Home.

## Auth envelope (already in the app)

Read everything from `json.data`:

- `data.token`
- `data.refreshToken`
- `data.user`
- `data.user.ekyc_status` (boolean)
- `data.user.ekyc_session_status` (string or null)

## New endpoints

Base: `/api/v1`

### 1. Start Didit — after OTP success, before Home

`POST /caregiver/ekyc/initiate`

Headers:

```
Authorization: Bearer <data.token>
Content-Type: application/json
```

Body:

```json
{
  "redirect_url": "caremate-caregiver://ekyc/callback"
}
```

Use the app’s existing deep-link scheme if it is already registered; otherwise use `caremate-caregiver://ekyc/callback`.

Success `201` or `200` — read `json.data`:

```json
{
  "ekyc_status": false,
  "ekyc_verified_at": null,
  "ekyc_reference_id": "uuid",
  "ekyc_session_status": "Not Started",
  "session_id": "uuid",
  "verification_url": "https://verify.didit.me/session/...",
  "session_token": "...",
  "reference_id": "uuid",
  "status": "Not Started"
}
```

If `data.ekyc_status === true` → skip WebView, go Home.

If `data.verification_url` is present → open it in WebView. Do not build the URL yourself. Do not use `session_token` unless you already have Didit native SDK; WebView + `verification_url` is required.

### 2. Poll status — after callback or if user returns to the app

`GET /caregiver/ekyc/status`

Header: `Authorization: Bearer <token>`

Read `data.ekyc_status` and `data.ekyc_session_status`.

## Navigation (strict)

1. Register (`role: CAREGIVER`) → OTP screen
2. `POST /auth/verify-otp` success:
   - Save `token`, `refreshToken`, `user`
   - If `user.ekyc_status === true` → Home
   - Else → loading, then `POST /caregiver/ekyc/initiate`, then Didit WebView
3. Login success: same check as step 2
4. App launch with stored token: call `GET /caregiver/ekyc/status` (or `/auth/profile`). If `ekyc_status !== true` → initiate + WebView, never Home
5. Back button on WebView must not go to Home while unverified. Show “Verify identity to continue” / Retry

## Didit WebView

- Full screen, no Home tab bar
- `source = data.verification_url` (https://verify.didit.me/...)
- Enable JS, camera, microphone (NID + liveness + face match)
- Intercept navigation to `caremate-caregiver://ekyc/callback` (and any `redirect_url` you sent)
- Didit appends query: `verificationSessionId`, `status` (`Approved` | `Declined` | `In Review`)
- On callback **or** WebView close: call `GET /caregiver/ekyc/status`
  - `ekyc_status === true` or status `Approved` → Home
  - `Declined` → error + Retry (`initiate` again is OK; backend reuses open sessions)
  - `In Review` / `In Progress` / `Not Started` → stay on waiting screen, poll status every 3–5s, max ~2 minutes, then Retry
- Do not trust only the deep-link query. Backend `/ekyc/status` is the source of truth (`ekyc_status` becomes true via Didit webhook)

## Push when admin approves in Didit

Register FCM **right after OTP**, before the WebView (`POST /notifications/tokens`). If you wait until Home, the approval push cannot be delivered.

When Didit (or console manual approve) marks the session `Approved`, backend sends:

- type: `EKYC_APPROVED`
- `screen`: `HOME`
- Also written to inbox

`EKYC_DECLINED` → stay on eKYC / Retry. Do not open Home.

On `EKYC_APPROVED` tap: set local `ekyc_status = true` and go Home. Still confirm with `GET /caregiver/ekyc/status`.

## Do not

- Call `https://verification.didit.me/v3/session/` from the app
- Put Didit API key in the app
- Navigate to Home after OTP just because email is verified (`is_verified` is not eKYC)
- Skip eKYC on later logins if `ekyc_status` is still false

## Implementation order

1. Save `user.ekyc_status` from verify-otp / login / profile
2. Auth router gate: unverified caregiver → eKYC flow, not Home
3. Initiate API + WebView screen
4. Deep-link / callback + status poll
5. Retry + error toasts from `json.message` / `json.code`
