# USER APP — Chat with caregiver during service (copy-paste this prompt)

You are updating the **existing CareMate USER mobile app** (React Native). Add a **live chat between the user and the assigned caregiver**, shown inside the **Booking Details** screen.

## Context (important)

- Auth, the API envelope (`success` / `data` / `meta`), FCM token registration (`POST /notifications/tokens`), the push router, and **Socket.IO live tracking** (`tracking:subscribe`) already exist. Reuse them.
- Do **not** invent endpoints. Base URL: `{API}/api/v1`. All REST calls need `Authorization: Bearer <token>`.
- This is a **different feature from Support Chat** (`/conversations/me`). Do not mix the two.

## Product rules

1. The chat exists **only while the booking status is `SERVICE_IN_PROGRESS`** (after the caregiver presses Start, before End).
2. Either side can message first. The user can message the caregiver and the caregiver can message the user.
3. Messages arrive **instantly**: through Socket.IO when the app is open, and through an FCM push when it is in the background or killed.
4. When the service ends (completed, or cancelled by admin), **the backend deletes every message**. The chat disappears from Booking Details. Nothing is kept on the server, so also clear any local cache for that booking.

## Booking Details screen

`GET /bookings/:id` now returns two new fields:

```json
{
  "status": "SERVICE_IN_PROGRESS",
  "can_chat": true,
  "chat": {
    "booking_id": "uuid",
    "booking_number": "BK1727...",
    "is_active": true,
    "my_role": "USER",
    "unread_count": 2,
    "last_message": { "id": "uuid", "message": "I have reached the hospital", "sender_role": "CAREGIVER", "created_at": "..." },
    "counterpart": { "id": "uuid", "role": "CAREGIVER", "name": "Rahim", "photo": "https://..." }
  }
}
```

- `can_chat === true` → show a **"Chat with caregiver"** card in Booking Details, under the live tracking card. It shows the caregiver photo and name, the last message preview, and an unread badge (`chat.unread_count`). Tap opens the **Booking Chat** screen. (Alternatively, embed the chat panel directly in Booking Details. Either is fine, but it must live inside the booking.)
- `can_chat === false` or `chat.is_active === false` → hide the card completely. Do not show an empty chat for completed or cancelled bookings.
- `GET /bookings` (list) also has `can_chat`. Optionally show a small chat icon on in-progress booking cards.

## REST endpoints

### Summary (badge / header)
`GET /bookings/:id/chat` → `data` = the same `chat` object as above.

### Load messages (cursor pagination, `data` is always oldest → newest)
- Open the screen: `GET /bookings/:id/chat/messages?limit=30`
- Scroll to the top for older messages: `GET /bookings/:id/chat/messages?before=<oldest_message_id>&limit=30`
- Catch up after a reconnect or push: `GET /bookings/:id/chat/messages?after=<newest_message_id>`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "booking_id": "uuid",
      "sender_id": "uuid",
      "sender_role": "CAREGIVER",
      "sender_name": "Rahim",
      "sender_photo": "https://...",
      "message_type": "text",
      "message": "I have reached the hospital",
      "attachment_url": null,
      "attachment_name": null,
      "attachment_mime": null,
      "attachment_size": null,
      "client_message_id": "device-uuid",
      "is_read": false,
      "read_at": null,
      "created_at": "2026-10-01T04:10:00.000Z"
    }
  ],
  "meta": { "has_more": false, "chat": { "is_active": true, "unread_count": 0, "...": "..." } }
}
```

- `sender_role`: `"USER"` (my bubble, right side) or `"CAREGIVER"` (left side).
- `message_type`: `"text" | "image" | "document"`.
- Loading the latest page (no `before`) marks the caregiver's messages as read automatically.
- If `meta.chat.is_active === false`, the service has ended. Close the chat screen (see "Service ended").

### Send a message
`POST /bookings/:id/chat/messages`

Text (JSON):
```json
{ "message": "Please give the medicine at 2 PM", "client_message_id": "<uuid generated on device>" }
```

Photo or PDF (multipart/form-data): `file` (jpg/png/webp/pdf, **max 10MB**), optional `message` caption, optional `client_message_id`.

Response `201`: `data` = the created message. Resending the same `client_message_id` does **not** create a duplicate. Use it for optimistic bubbles (clock icon → ✓ when the server confirms, red retry icon on failure).

Errors:
- `409` with `code: "CHAT_CLOSED"` → the service is no longer in progress. Close the chat and refresh Booking Details.
- `403` → this is not your booking.
- `400` → show `message` (for example "Message text or a file is required", "File too large. Maximum size is 10MB.").

### Mark as read
`PUT /bookings/:id/chat/read` → `data = { "marked": 3 }`. Call it when a new caregiver message arrives while the chat screen is open.

## Socket.IO (instant delivery)

Reuse the **same socket connection** used for live tracking (`/socket.io`, `auth: { token }`). After connecting, the server automatically puts the socket in a personal room, so **no join or subscribe call is needed for chat**. Keep the socket connected while the app is in the foreground and a booking is `SERVICE_IN_PROGRESS`.

Listen to these events:

| Event | Payload | What to do |
|---|---|---|
| `chat:message` | full message object (same as REST) | If `booking_id` is the open chat → append (dedupe by `id` and `client_message_id`), then emit `chat:read`. Otherwise increment that booking's unread badge. My own messages also arrive here; use them to confirm optimistic bubbles. |
| `chat:read` | `{ booking_id, reader_role, read_at }` | If `reader_role === "CAREGIVER"` → mark all my bubbles in that booking as ✓✓ read. |
| `chat:typing` | `{ booking_id, sender_role, is_typing }` | Show or hide "Rahim is typing…" in the chat header. Hide it automatically after 5 s without a new event. |
| `chat:ended` | `{ booking_id, reason }` | Service ended and the messages were deleted. See "Service ended". |
| `chat:error` | `{ message, code }` | Show `message` as a toast. If `code === "CHAT_CLOSED"` treat it like `chat:ended`. |

Emit (optional; REST works too):

```ts
socket.emit('chat:send', { booking_id, message: 'Hello', client_message_id }, (ack) => {
  // ack = { ok: true, data: message, duplicate } | { ok: false, message, code }
});
socket.emit('chat:typing', { booking_id, is_typing: true });   // throttle to once every 2-3 s while typing
socket.emit('chat:typing', { booking_id, is_typing: false });  // on send / blur
socket.emit('chat:read', { booking_id });                      // when the chat screen shows new incoming messages
```

Send text through `chat:send` when the socket is connected. Fall back to `POST /bookings/:id/chat/messages` if it is disconnected or the ack does not arrive within 10 s. Always send **files** through the REST multipart endpoint.

On socket reconnect, if the chat screen is open, call `GET /bookings/:id/chat/messages?after=<newest_id>` to fill any gap.

## Push notification (FCM)

Reuse the **existing** push handler and add one more `type` branch. Do not add a new Firebase setup.

```json
{
  "notification": { "title": "Rahim", "body": "I have reached the hospital" },
  "data": {
    "type": "BOOKING_CHAT_MESSAGE",
    "action": "OPEN_BOOKING_CHAT",
    "screen": "booking_chat",
    "booking_id": "uuid",
    "booking_number": "BK1727...",
    "message_id": "uuid",
    "sender_role": "CAREGIVER",
    "inbox_id": ""
  }
}
```

- The title is the caregiver's name. For attachments the body is "Sent you a photo" or "Sent you a document".
- Chat pushes are **not** saved in the Inbox (`inbox_id` is empty).
- All `data` values are strings.

Handle all three states:
- **Background or killed, user taps** → open Booking Details for `booking_id` with the chat open (or navigate to `BookingChat` with `bookingId`). The screen loads the latest page on focus.
- **Foreground, that booking's chat is open** → do **not** show a banner (the socket already delivered the message). If the socket is disconnected, fetch `?after=<newest_id>` and then `PUT /chat/read`.
- **Foreground, another screen** → show an in-app banner "Rahim: …". Tap opens the chat. Increment the unread badge on the booking card.

```ts
case 'BOOKING_CHAT_MESSAGE':
  navigation.navigate('BookingDetails', { bookingId: data.booking_id, openChat: true });
  break;
```

The existing `SERVICE_STARTED` push now also has `chat_available: "true"` and the body says "Live tracking and chat are available." No change is needed beyond the existing navigation, since Booking Details shows the chat card from `can_chat`.

## Service ended

When **any** of these happens: socket `chat:ended`, the push `SERVICE_COMPLETED` arrives, `409 CHAT_CLOSED`, or `meta.chat.is_active === false`:
1. If the chat screen is open, show "Service has ended. This chat is closed and messages have been deleted." and go back to Booking Details.
2. Clear local messages and the cached unread count for that booking.
3. Refetch `GET /bookings/:id`. `can_chat` is now `false`, so the chat card disappears.

## UI details

- Inverted `FlatList` (newest at the bottom). `onEndReached` loads older messages with `before` while `has_more` is true.
- Header: caregiver photo, name, "Service in progress" subtitle, typing indicator.
- Bubbles: my messages on the right, caregiver's on the left; time under each; ✓ sent, ✓✓ read (`is_read` on my messages). Date separators.
- Image bubble → thumbnail, tap for a full-screen viewer. PDF bubble → file icon, `attachment_name`, and size; tap opens `attachment_url`.
- Composer: multiline text (max 4000 chars), attach (Camera / Gallery / Document), send. Validate file type and 10MB before uploading. Show upload progress.
- Small notice above the composer: "Messages are deleted when the service ends."
- Empty state: "Say hello to your caregiver. You can share instructions, photos or reports here."

## Do not

- Do not show the chat for bookings that are not `SERVICE_IN_PROGRESS`.
- Do not store chat history permanently on the device after the service ends.
- Do not reuse the Support Chat endpoints or push type `SUPPORT_MESSAGE` for this feature.
