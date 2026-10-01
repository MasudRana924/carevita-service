# USER APP — Profile screen, photo upload & Edit Profile (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app** (React Native). Rework the **Profile** screen and the **Edit Profile** screen to use three new account APIs.

## Context (important)

- Auth, token refresh, and the API envelope (`success` / `data` / `message` / `code`) already exist. Reuse them.
- Do **not** invent endpoints. Base URL: `{API}/api/v1`. All calls need `Authorization: Bearer <token>`.
- Stop using `GET/PUT /user/profile`, `POST /user/avatar` and `POST /auth/profile/photo` for these screens. They still work, but use the new endpoints below.

## Endpoints

### 1. Get my account — `GET /user/me`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "USER",
    "name": "Karim Ahmed",
    "email": "karim@example.com",
    "phone": "01712345678",
    "profile_photo": "https://res.cloudinary.com/.../avatar-123.jpg",
    "gender": "male",
    "date_of_birth": "1995-04-20",
    "address": "House 12, Road 5, Dhanmondi",
    "emergency_contact": "01811111111",
    "language_preference": "bn",
    "status": "active",
    "is_verified": true,
    "ekyc_status": false,
    "caregiver_profile_id": null,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

- `profile_photo`, `gender`, `date_of_birth`, `address`, `emergency_contact` can be `null`. Show a placeholder.
- `gender` is `"male" | "female" | "other" | null`.
- `date_of_birth` is `"YYYY-MM-DD"` or `null`.

### 2. Update photo only — `PUT /user/me/photo`

- `multipart/form-data` with one field: **`photo`** (JPEG, PNG or WEBP, **max 5MB**).
- The server crops the image to a square (800×800).
- Response `200`: `data` = the full account (same shape as `GET /user/me`).
- Errors (`400`, show `message`): "Photo is required…", "Invalid file type. Only JPEG, PNG and WEBP images are allowed.", "File too large. Maximum size is 5MB."

```ts
const form = new FormData();
form.append('photo', { uri: asset.uri, name: asset.fileName ?? 'avatar.jpg', type: asset.type ?? 'image/jpeg' } as any);
await api.put('/user/me/photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
```

### 3. Update profile fields — `PUT /user/me` (JSON)

Send **only the fields that changed**:

```json
{
  "name": "Karim Ahmed",
  "gender": "male",
  "date_of_birth": "1995-04-20",
  "address": "House 12, Road 5, Dhanmondi",
  "emergency_contact": "01811111111",
  "language_preference": "bn"
}
```

- Response `200`: `data` = the full account.
- This endpoint does **not** change the photo, email or phone. Fields not sent are left unchanged.
- Validation errors are `400` with `code: "VALIDATION_ERROR"`. Show `message`, for example "Name cannot be empty", "gender must be one of: male, female, other", "date_of_birth must be a valid date in YYYY-MM-DD format", "date_of_birth cannot be in the future".

## Profile screen

1. On focus (`useFocusEffect`) call `GET /user/me` and render: avatar, name, phone, email, gender, date of birth (show as `20 Apr 1995`), and address. Pull-to-refresh calls it again.
2. **Avatar with an edit icon**: show a small round camera/pencil icon badge at the bottom-right of the avatar.
3. Tap the edit icon → action sheet: **Take photo** / **Choose from gallery** / Cancel. Ask for camera or gallery permission when needed.
4. After the user picks an image (allow square crop in the picker if available), check the type (jpg/png/webp) and size (≤ 5MB) on the device. If it is too large, compress or resize it before uploading.
5. **Upload automatically**. No extra Save button. Call `PUT /user/me/photo`. While uploading, show a spinner over the avatar and disable the edit icon.
6. **On success → call `GET /user/me` again** and render the latest data (new photo URL). Show a toast "Profile photo updated". Update the cached user in the global store or context too, so the header or drawer avatar changes everywhere.
7. On failure → keep the old photo, show the API `message` in a toast, and hide the spinner.
8. Add an **Edit Profile** button that opens the Edit Profile screen.

## Edit Profile screen

- **No photo upload here.** The photo is changed only from the avatar edit icon on the Profile screen. You may show the current avatar read-only at the top.
- Prefill the form from the latest `GET /user/me` data.
- Fields:
  - **Name**: text, required, max 255
  - **Gender**: segmented control or radio — Male / Female / Other → send `"male" | "female" | "other"`
  - **Date of birth**: date picker, no future dates → send `"YYYY-MM-DD"`
  - **Address**: multiline, max 500
  - **Emergency contact**: phone number, max 20
  - **Email** and **Phone**: shown **read-only** (not editable here)
- **Save**: send only the changed fields to `PUT /user/me`. Disable Save while nothing has changed or while saving.
- On success → call `GET /user/me`, update the global user store, show the toast "Profile updated", and go back to the Profile screen (which refetches on focus).
- On `400` → show `message` under the related field or as a toast. Keep the user's input.

## Do not

- Do not send the photo through `PUT /user/me`.
- Do not let the user edit email or phone on this screen.
- Do not show stale data after an update. Always refetch `GET /user/me`.
