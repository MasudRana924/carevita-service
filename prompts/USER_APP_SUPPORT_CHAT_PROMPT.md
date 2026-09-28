# USER APP — SUPPORT CHAT (WhatsApp-style) — copy-paste this prompt

You are updating the **existing CareMate USER mobile app** (React Native). Replace the current "conversations" feature with a **single WhatsApp-style chat with CareMate Support (admin)**.

## Context (important)

- Auth, envelope API (`success` / `data` / `meta`), FCM token registration (`POST /notifications/tokens`) and push handling are **already implemented** — reuse them.
- Do **NOT** invent endpoints. Base URL: `{API}/api/v1`. All calls need `Authorization: Bearer <token>`.
- **There is only ONE conversation per user.** Remove "New conversation" screen, subject field, and conversation list screen. The user never creates a conversation; the backend creates it automatically.

## Product behaviour

1. User opens **Support Chat** (from profile/help menu, and from push notification tap).
2. Screen shows the full chat history like WhatsApp/Messenger: user bubbles on the right, admin ("CareMate Support") bubbles on the left, date separators, time under each bubble, ✓ sent / ✓✓ read (use `is_read` on the user's own messages).
3. User can send **text**, **image** (camera/gallery) or **PDF** (document picker). Optional caption with a file.
4. When admin replies, user gets a **push notification**. Tapping it opens Support Chat and messages refresh automatically.
5. If the chat screen is already open when the push arrives → fetch new messages and append them without leaving the screen.
6. Show an unread badge on the Support Chat entry point.

## Endpoints

### Get my thread (optional, for header / badge)
`GET /conversations/me` → `data` = conversation
```json
{ "id": "uuid", "user_id": "uuid", "status": "active", "user_unread_count": 2,
  "last_message_at": "2026-09-28T06:00:00.000Z", "last_message_preview": "Photo",
  "last_message_sender_role": "admin" }
```

### Unread badge
`GET /conversations/me/unread-count` → `data = { "conversation_id": "uuid", "unread_count": 2 }`

### Load messages (cursor pagination, always oldest → newest in `data`)
- Latest page (open screen / refresh): `GET /conversations/me/messages?limit=30`
- Older history (user scrolls to top): `GET /conversations/me/messages?before=<oldest_message_id>&limit=30`
- Only new messages since last known: `GET /conversations/me/messages?after=<newest_message_id>`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_role": "user",            // "user" | "admin"
      "sender_name": "Rahim",
      "sender_photo": "https://...",
      "message_type": "text",           // "text" | "image" | "document"
      "message": "Hello",               // caption or text, may be null for files
      "attachment_url": null,           // Cloudinary URL for image/pdf
      "attachment_name": null,          // original file name (e.g. report.pdf)
      "attachment_mime": null,          // image/jpeg | image/png | image/webp | application/pdf
      "attachment_size": null,          // bytes
      "client_message_id": "local-uuid",
      "is_read": true,
      "read_at": "2026-09-28T06:01:00.000Z",
      "created_at": "2026-09-28T06:00:00.000Z"
    }
  ],
  "meta": { "has_more": true, "conversation": { "...": "conversation object" } }
}
```
- `meta.has_more === true` → there is older history; load with `before`.
- Loading the latest page (no `before`) automatically marks admin messages as read → set badge to 0.

### Send message
`POST /conversations/me/messages`

Text (JSON):
```json
{ "message": "I need help with my booking", "client_message_id": "<uuid generated on device>" }
```

File (multipart/form-data):
- `file`: image (jpg/png/webp) or PDF, **max 10MB**
- `message`: optional caption
- `client_message_id`: optional

Response `201`: `data` = the created message object (same shape as above), `meta.conversation` = updated thread.

Use `client_message_id` for **optimistic UI**: add the bubble immediately with a "sending" clock icon, then replace it with the server message that has the same `client_message_id`. Retrying with the same `client_message_id` will not create a duplicate. On failure show a red "tap to retry" icon.

### Mark as read (when new admin message arrives while chat is open)
`PUT /conversations/me/read` → `data = { "marked": 1, "conversation": {...} }`

## Push notification (FCM)

**Reuse the EXISTING push setup** — the same one that already handles `BOOKING_ACCEPTED` (FCM token registration via `POST /notifications/tokens`, foreground `onMessage`, background tap `onNotificationOpenedApp`, killed-state `getInitialNotification`). Backend sends the chat push through the exact same pipeline as booking pushes. Do **not** add a new Firebase setup — only add one more `type` branch to the existing handler.

For comparison, booking accepted push `data` (already handled today):
```json
{ "type": "BOOKING_ACCEPTED", "booking_id": "uuid", "inbox_id": "uuid", "booking_number": "CM-1001", "screen": "inbox" }
```

Admin reply push (new):
```json
{
  "notification": { "title": "CareMate Support", "body": "Your report looks fine" },
  "data": {
    "type": "SUPPORT_MESSAGE",
    "screen": "support_chat",
    "conversation_id": "uuid",
    "message_id": "uuid",
    "booking_id": "",
    "inbox_id": ""
  }
}
```
- Body is `"Sent you a photo"` / `"Sent you a document"` for attachments.
- Chat pushes are **not** saved in the Inbox list (`inbox_id` is empty) — don't open the inbox for this type.
- All `data` values are strings (FCM rule).

Add to the existing notification router (example, adapt to current code):
```ts
function handlePushNavigation(data) {
  switch (data?.type) {
    case 'BOOKING_ACCEPTED':
      // existing code — unchanged
      break;
    case 'SUPPORT_MESSAGE':
      navigation.navigate('SupportChat'); // screen loads GET /conversations/me/messages on focus
      break;
  }
}

messaging().onMessage(async (remoteMessage) => {
  const data = remoteMessage.data;
  if (data?.type === 'SUPPORT_MESSAGE') {
    if (isSupportChatScreenFocused()) {
      supportChatEvents.emit('refresh'); // chat screen calls ?after=<newest_id>, then PUT /conversations/me/read
    } else {
      showInAppBanner(remoteMessage.notification); // tap -> handlePushNavigation(data)
      incrementSupportBadge();
    }
    return;
  }
  // existing foreground handling for booking pushes — unchanged
});
```

Handle in all 3 states:
- **Background / killed (tap)** → `navigate('SupportChat')` → screen fetches latest page (auto refresh).
- **Foreground, chat screen open** → do NOT show a banner; call `GET /conversations/me/messages?after=<newest_id>` (or full latest page), append, then `PUT /conversations/me/read`.
- **Foreground, other screen** → show in-app toast/banner "CareMate Support: …"; tap → open chat. Increment badge.

Also refresh messages on `AppState` change to `active` while the chat screen is focused, and on screen focus (`useFocusEffect`).

**No WebSocket / Socket.IO for chat.** Push notification is the only trigger for new admin replies; the app then calls the REST API to refresh. To update ✓✓ read ticks on the user's own messages, simply re-fetch the latest page on screen focus / pull-to-refresh.

## UI details

- Inverted `FlatList` (newest at bottom), `onEndReached` → load older with `before`.
- Image bubble: thumbnail (tap → full-screen viewer with pinch zoom). PDF bubble: file icon + `attachment_name` + size; tap → open `attachment_url` in in-app browser / PDF viewer.
- Composer: text input (multiline, max 4000 chars), attach button (Camera / Gallery / Document), send button disabled when empty.
- Show upload progress for files; validate type + 10MB before uploading.
- Empty state: "Send us a message — our support team usually replies within a few minutes."

## Errors

- `400` → show `message` from API (e.g. "File too large. Maximum size is 10MB.", "Message text or a file is required").
- `401` → existing token refresh flow.
- Network failure → keep bubble with retry.

## Remove / stop using

- `POST /conversations` (creating conversations), subject input, conversations list screen.
- Old push type `conversation_message` → now `SUPPORT_MESSAGE`.
- Old `/conversations/:id/...` routes still work (they map to the same single thread) but migrate to `/conversations/me/...`.
