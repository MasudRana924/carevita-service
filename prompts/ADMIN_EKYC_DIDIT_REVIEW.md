You are updating the CareMate ADMIN panel to support Didit eKYC review for caregivers.

Do not invent endpoints. Use the CareMate API envelope (`success`, `data`, `meta`). Auth: Bearer admin JWT.

## Goal

When a caregiver Didit session is `In Review`, admin can Approve / Decline from CareMate admin panel — no need to open Didit Business Console.

## Endpoints

Base: `/api/v1`

### 1. List caregivers pending eKYC review

`GET /admin/caregivers?ekyc_session_status=In%20Review&page=1&limit=20`

Optional filters:
- `verification_status`
- `ekyc_session_status` → `In Review` | `Approved` | `Declined` | `In Progress` | ...

Each row includes (among profile fields):
- `user_ekyc_status` (boolean)
- `user_ekyc_session_status` (string)
- `user_ekyc_verified_at`
- `user_ekyc_reference_id` (Didit session id)
- `ekyc_status` / `ekyc_session_status` on the profile as well

UI: Caregivers → tab or filter **“eKYC In Review”**.

### 2. Open eKYC detail

`GET /admin/caregivers/{id}/ekyc`

`{id}` = caregiver **profile id** or **user id** (both work).

Response `data` highlights:
```json
{
  "caregiver_id": "uuid",
  "user_id": "uuid",
  "name": "...",
  "email": "...",
  "ekyc_status": false,
  "ekyc_session_status": "In Review",
  "session_id": "uuid",
  "can_approve": true,
  "can_decline": true,
  "decision": {
    "status": "In Review",
    "id_verifications": [{ "status": "Approved", "document_type": "Identity Card" }],
    "liveness_checks": [{ "status": "Approved" }],
    "face_matches": [{ "status": "In Review" }],
    "reviews": []
  }
}
```

Show feature statuses so admin knows why it needs review (often Face Match).

Enable **Approve** only when `can_approve === true`.
Enable **Decline** when `can_decline === true`.

### 3. Approve on Didit (from admin panel)

`POST /admin/caregivers/{id}/ekyc/approve`

```json
{
  "comment": "Face match reviewed and accepted"
}
```

`comment` optional.

Success → Didit session becomes `Approved`, CareMate sets `ekyc_status: true`, caregiver gets `EKYC_APPROVED` push/inbox (if FCM token active).

### 4. Decline on Didit

`POST /admin/caregivers/{id}/ekyc/decline`

```json
{
  "comment": "Document mismatch / face not matching"
}
```

Sets Didit + CareMate to Declined; caregiver gets `EKYC_DECLINED`.

## UI flow

1. Admin login → Caregivers list
2. Filter `ekyc_session_status=In Review`
3. Click row → eKYC detail (`GET .../ekyc`)
4. Review decision features
5. Approve or Decline with optional comment
6. Toast from `json.message`; refresh detail / list

## Errors

- `400` — session not reviewable yet (`Not Started` / `In Progress`), already Approved, or no session
- `404` — caregiver not found
- `503` — Didit not configured

Show `json.message` to admin.

## Do not

- Call Didit APIs from the admin frontend
- Store Didit API keys in the panel
- Treat CareMate-only DB flip as enough — always use these approve/decline endpoints so Didit stays source of truth

## Implementation order

1. Caregivers list + `ekyc_session_status` filter chip “In Review”
2. eKYC detail page/modal with feature statuses
3. Approve / Decline buttons wired to the POST endpoints
4. Refresh list after success
