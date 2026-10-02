# USER APP — Sign up & log in with email or phone + OTP 1234 (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app** (React Native). Today the user can sign up and log in only with **email**. Add **phone number** as a second option on both screens and rework the **Verify OTP** screen so it works for both.

## Context (important)

- Token storage, token refresh, the API envelope (`success` / `data` / `message` / `code`), and everything after login already exist. Do not rebuild them.
- Do **not** invent endpoints. Base URL: `{API}/api/v1`. The auth endpoints below are public (no `Authorization` header).
- **No email or SMS is sent.** The OTP is always **`1234`**, for both email and phone. The user types it on the Verify OTP screen. Do not auto-fill it. You may show a small hint under the input: "Use code 1234".
- Phone numbers are Bangladeshi mobiles. The backend accepts `01712345678`, `+8801712345678` or `8801712345678` and stores them as `01712345678`. Always send the number as `01XXXXXXXXX`.
- Always send `role: "USER"` on register.

## Endpoints

### 1. Register — `POST /auth/register`

Email sign-up:

```json
{ "name": "Rahim Ahmed", "email": "rahim@example.com", "password": "secret123", "role": "USER" }
```

Phone sign-up:

```json
{ "name": "Rahim Ahmed", "phone": "01712345678", "password": "secret123", "role": "USER" }
```

Response `201`:

```json
{
  "success": true,
  "message": "Registration successful. Please verify your account with the OTP.",
  "data": {
    "user": { "id": "uuid", "name": "Rahim Ahmed", "email": null, "phone": "01712345678", "role": "USER", "is_verified": false, "...": "..." },
    "expiresAt": "2026-10-02T18:00:00.000Z",
    "otp_channel": "phone"
  }
}
```

- `otp_channel` is `"email"` or `"phone"`. It tells you which field to send to Verify OTP.
- No tokens are returned here. The user is **not** logged in until Verify OTP succeeds.
- Errors: `400` (show `message`, for example "Name, password, and email or phone are required" or "Invalid phone number. Use a Bangladeshi mobile number like 01712345678."), `409` "User with this email already exists" / "User with this phone number already exists".

### 2. Verify OTP — `POST /auth/verify-otp`

```json
{ "phone": "01712345678", "otp": "1234" }
```

or

```json
{ "email": "rahim@example.com", "otp": "1234" }
```

Response `200` (same shape as login):

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": { "token": "jwt", "refreshToken": "jwt", "user": { "id": "uuid", "role": "USER", "is_verified": true, "...": "..." } }
}
```

Errors:

| Status | `code` | What to do |
| --- | --- | --- |
| `400` | `OTP_INVALID` | Show "Invalid OTP" under the input and clear it |
| `404` | `NOT_FOUND` | "User not found". Send the user back to Sign up |
| `409` | `CONFLICT` | Account is already verified. Show the message and go to Login |
| `429` | `TOO_MANY_REQUESTS` | Too many wrong codes. Show the message; let the user tap Resend and try again |

### 3. Resend OTP — `POST /auth/resend-otp`

```json
{ "phone": "01712345678" }
```

or `{ "email": "..." }`. Response `200`. There is a **60 second cooldown**; inside it the API returns `429` with "Please wait N seconds before requesting another OTP". The code is still `1234`; resend just resets the wrong-attempt counter after a lockout.

### 4. Login — `POST /auth/login`

```json
{ "email": "rahim@example.com", "password": "secret123" }
```

or

```json
{ "phone": "01712345678", "password": "secret123" }
```

Response `200`: `data` = `{ token, refreshToken, user }` (same as today).

Errors:

| Status | `code` | What to do |
| --- | --- | --- |
| `401` | `UNAUTHORIZED` | "Invalid credentials" |
| `403` | `ACCOUNT_NOT_VERIFIED` | Open Verify OTP for this email/phone (call Resend OTP first, then show the screen) |
| `403` | `FORBIDDEN` | "Account is not active". Show the message and stay on Login |

## Screens

### Sign up

1. Add a segmented toggle at the top: **Email** | **Phone**. Default: Email.
2. Fields: **Name** (required), **Email** or **Phone** (depends on the toggle), **Password** (required, min 6), **Confirm password**.
3. Phone input: show a fixed `+88` prefix and a numeric keyboard. Validate on the device with `/^01[3-9]\d{8}$/` after removing spaces/dashes and a leading `+88`/`88`. Error text: "Enter a valid mobile number, e.g. 01712345678".
4. Send only the field for the selected tab (`email` **or** `phone`) plus `name`, `password`, `role: "USER"`.
5. On `201` → navigate to **Verify OTP** with `{ channel: data.otp_channel, value: <email or normalized phone> }`.
6. On `409` → show the message with a "Log in instead" action.

### Log in

1. Same **Email** | **Phone** toggle and the same phone validation.
2. Send `{ email, password }` or `{ phone, password }`.
3. On `200` → keep the existing post-login flow (save tokens, register FCM token, go to Home).
4. On `403` with `code: "ACCOUNT_NOT_VERIFIED"` → call Resend OTP (ignore a `429` cooldown error), then navigate to **Verify OTP** with the same channel/value.

### Verify OTP

1. Show "Enter the 4-digit code sent to `<masked email or phone>`" and a **4-digit** code input (numeric keyboard). Show the hint "Use code 1234".
2. Auto-submit when 4 digits are entered, or tap **Verify**. Disable the button while the request runs.
3. Send `{ [channel]: value, otp }`.
4. On `200` → save `token` and `refreshToken` exactly like a normal login and go to Home (or profile setup if the app already does that after sign-up).
5. **Resend** link with a 60 second countdown. Call Resend OTP. Show the API `message` on errors.
6. Handle the error codes from the table above.

## Do not

- Do not send both `email` and `phone` on login or verify. Send only the selected one.
- Do not call Verify OTP to log in an existing account. It only works for new, unverified accounts (verified accounts get `409`).
- Do not show any "check your inbox / SMS" wording. Nothing is sent; the code is always `1234`.
- Do not change the token refresh or logout flow.
