# ADMIN PANEL — SUPPORT CHAT (Messenger-style inbox) — copy-paste this prompt

You are updating the **existing CareMate ADMIN web panel**. Replace the current "conversations" page with a **Messenger / WhatsApp Web style support inbox**.

## Context (important)

- Admin auth, envelope API (`success` / `data` / `meta`), layout and design system are **already implemented** — reuse them.
- Do **NOT** invent endpoints. Base URL: `{API}/api/v1`. All calls need `Authorization: Bearer <admin token>`.
- **Each user has exactly ONE conversation** (one long thread with full history). There are no subjects and no "new conversation per message". A user's new message always lands in the same thread and bumps it to the top of the list.

## Layout

Two-pane page at `/support-chat` (sidebar menu item "Support Chat" with unread badge):

- **Left pane – inbox list**: search box (name / phone / email), filter tabs `All` / `Unread`, list of threads sorted by latest message. Each row: user avatar, name, phone, `last_message_preview` (prefix "You: " when `last_message_sender_role === 'admin'`), relative time of `last_message_at`, unread count badge (`admin_unread_count`), bold when unread. Infinite scroll / pagination.
- **Right pane – chat**: header with user name, phone, avatar, link to user profile, status dropdown (active / closed / archived). Message list (user bubbles left, admin bubbles right, date separators, time, ✓/✓✓ read for admin messages using `is_read`). Composer at bottom: textarea (Enter = send, Shift+Enter = newline, max 4000 chars), attach button (image or PDF, max 10MB), send button, upload progress.
- Deep link: `/support-chat/:conversationId` opens a thread directly. On user detail page add a "Message user" button → `GET /admin/conversations/user/:userId` → open that thread.

## Endpoints

### Inbox list
`GET /admin/conversations?page=1&limit=20&search=rahim&unread_only=true&status=active`

Only threads that have at least one message are returned, newest activity first.
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "Rahim",
      "user_phone": "01700000000",
      "user_email": "r@x.com",
      "user_photo": "https://...",
      "user_role": "USER",
      "status": "active",
      "admin_unread_count": 3,
      "user_unread_count": 0,
      "last_message_at": "2026-09-28T06:00:00.000Z",
      "last_message_preview": "Photo",
      "last_message_sender_role": "user"
    }
  ],
  "meta": { "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3, "hasNext": true, "hasPrev": false } }
}
```

### Sidebar badge
`GET /admin/conversations/unread-summary` → `data = { "unread_messages": 7, "unread_conversations": 3 }`

### Open thread with a specific user (admin starts the chat)
`GET /admin/conversations/user/:userId` → conversation object (created if it doesn't exist yet).

### Thread header
`GET /admin/conversations/:id` → conversation object (same shape as a list row).

### Messages (cursor pagination, always oldest → newest in `data`)
- Open thread / refresh: `GET /admin/conversations/:id/messages?limit=30`
- Older history (scroll to top): `GET /admin/conversations/:id/messages?before=<oldest_message_id>&limit=30`
- Only newer than what you have: `GET /admin/conversations/:id/messages?after=<newest_message_id>`

`meta.has_more` tells you if older history exists. Loading the latest page (no `before`) marks the user's messages as read → set that row's `admin_unread_count` to 0 and refresh the sidebar badge.

Message object:
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "sender_id": "uuid",
  "sender_role": "user",           // "user" | "admin"
  "sender_name": "Rahim",          // for admin messages: the admin's name (show "by <name>" small text)
  "sender_photo": "https://...",
  "message_type": "text",          // "text" | "image" | "document"
  "message": "Hello",              // text or caption, may be null for files
  "attachment_url": null,
  "attachment_name": null,
  "attachment_mime": null,
  "attachment_size": null,
  "client_message_id": null,
  "is_read": false,
  "read_at": null,
  "created_at": "2026-09-28T06:00:00.000Z"
}
```

### Reply (sends FCM push to the user automatically)
`POST /admin/conversations/:id/messages` (alias: `POST /admin/conversations/:id/reply`)

Text (JSON): `{ "message": "Hi, how can we help?", "client_message_id": "<uuid>" }`

File (multipart/form-data): `file` (jpg/png/webp/pdf, max 10MB), optional `message` caption, optional `client_message_id`.

Response `201`: `data` = created message, `meta.conversation` = updated thread. Use `client_message_id` for optimistic bubbles and dedupe (retrying with the same id never duplicates).

### Mark read / status
- `PUT /admin/conversations/:id/read` → `data = { marked, conversation }`
- `PUT /admin/conversations/:id/status` body `{ "status": "active" | "closed" | "archived" }`. A new message from either side sets it back to `active`.

## Refreshing (no WebSocket)

There is **no WebSocket / Socket.IO for chat**. Keep the inbox fresh with lightweight REST polling (only while the browser tab is visible):

- Sidebar badge: `GET /admin/conversations/unread-summary` every 30s.
- Inbox list (when on the Support Chat page): re-fetch page 1 every 15s and merge by `id`.
- Open thread: `GET /admin/conversations/:id/messages?after=<newest_message_id>` every 5–10s; append new messages (dedupe by `id` / `client_message_id`). This also marks the user's messages as read. If new user messages arrived and the tab is visible, play a short sound.
- Also refresh immediately on window focus and after sending a reply.

The user is notified of admin replies by FCM push, which the backend sends automatically on every reply.

## UI details

- Image bubble → thumbnail, click → lightbox. PDF bubble → file icon + `attachment_name` + human size, click → open `attachment_url` in new tab.
- Validate file type/size client-side before upload; show API `message` on `400`.
- Keep scroll position when prepending older history.
- Multiple admins can reply in the same thread; show the admin's `sender_name` under admin bubbles.

## Remove / stop using

- Subject column, "conversation per ticket" UI, creating conversations.
- The list is now per user — never show the same user twice.
