# Conversation API - User/Caregiver App Implementation Guide

## Overview
This guide provides implementation instructions for integrating the conversation/messaging system into the user/caregiver mobile app. Users can send messages to support and receive replies via Firebase push notifications for instant updates.

## Base URL
```
https://your-api-domain.com
```

## Authentication
All API calls require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### 1. Get User Conversations
**Endpoint:** `GET /conversations`
**Description:** Get list of all conversations for the authenticated user

**Query Parameters:**
- `status` (optional): Filter by status - `active`, `closed`, `archived`
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**
```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "subject": "Support request",
      "status": "active",
      "user_unread_count": 2,
      "admin_unread_count": 0,
      "last_message_at": "2024-01-15T10:30:00Z",
      "last_message_preview": "How can I help you?",
      "message_count": 5,
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### 2. Get Single Conversation
**Endpoint:** `GET /conversations/:id`
**Description:** Get details of a specific conversation

**Response:**
```json
{
  "success": true,
  "message": "Conversation fetched successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "subject": "Support request",
    "status": "active",
    "user_unread_count": 2,
    "admin_unread_count": 0,
    "last_message_at": "2024-01-15T10:30:00Z",
    "last_message_preview": "How can I help you?",
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Create New Conversation
**Endpoint:** `POST /conversations`
**Description:** Create a new conversation with support

**Request Body:**
```json
{
  "subject": "Booking issue",
  "first_message": "I have a problem with my recent booking..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "subject": "Booking issue",
    "status": "active",
    "user_unread_count": 0,
    "admin_unread_count": 1,
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T09:00:00Z"
  }
}
```

### 4. Get Conversation Messages
**Endpoint:** `GET /conversations/:id/messages`
**Description:** Get all messages in a conversation

**Query Parameters:**
- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page

**Response:**
```json
{
  "success": true,
  "message": "Messages fetched successfully",
  "data": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_role": "user",
      "message": "I have a problem with my booking",
      "message_type": "text",
      "is_read": true,
      "read_at": "2024-01-15T09:05:00Z",
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T09:00:00Z"
    },
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_role": "admin",
      "message": "I'll help you with that. What's the issue?",
      "message_type": "text",
      "is_read": false,
      "read_at": null,
      "created_at": "2024-01-15T09:05:00Z",
      "updated_at": "2024-01-15T09:05:00Z"
    }
  ]
}
```

### 5. Send Message
**Endpoint:** `POST /conversations/:id/messages`
**Description:** Send a message in a conversation

**Request Body:**
```json
{
  "message_type": "text",
  "message": "Here are the details of my issue..."
}
```

**Supported message types:**
- `text`: Plain text messages
- `image`: Image messages (URL in message field)
- `document`: Document messages (URL in message field)
- `audio`: Audio messages (URL in message field)

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "sender_role": "user",
    "message": "Here are the details of my issue...",
    "message_type": "text",
    "is_read": false,
    "read_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### 6. Mark Messages as Read
**Endpoint:** `PUT /conversations/:id/read`
**Description:** Mark all admin messages in a conversation as read

**Response:**
```json
{
  "success": true,
  "message": "Messages marked as read",
  "data": [
    {
      "id": "uuid",
      "conversation_id": "uuid",
      "sender_id": "uuid",
      "sender_role": "admin",
      "message": "I'll help you with that.",
      "message_type": "text",
      "is_read": true,
      "read_at": "2024-01-15T10:01:00Z",
      "created_at": "2024-01-15T09:05:00Z",
      "updated_at": "2024-01-15T10:01:00Z"
    }
  ]
}
```

## Firebase Push Notifications

Users receive instant updates via Firebase push notifications when the admin replies to their conversation.

### Setup
Register Firebase Cloud Messaging (FCM) token with the API to receive push notifications.

### Register Notification Token
**Endpoint:** `POST /notifications/tokens`
**Request Body:**
```json
{
  "device_id": "unique_device_id",
  "platform": "ANDROID", // or "IOS", "WEB"
  "token": "fcm_token_from_firebase"
}
```

### Handle Push Notifications
When you receive a push notification with `type: "conversation_message"`:
```json
{
  "notification": {
    "title": "New message from support",
    "body": "How can I help you?"
  },
  "data": {
    "type": "conversation_message",
    "conversation_id": "uuid",
    "message_id": "uuid"
  }
}
```

**Implementation Steps:**
1. Navigate to the conversation screen
2. Fetch messages for the conversation
3. Mark messages as read
4. Update UI to show new message

## UI Implementation Recommendations

### Conversation List Screen
- Display conversation subject as title
- Show last message preview
- Display unread count badge
- Show timestamp of last message
- Tap to open conversation details

### Conversation Detail Screen
- Display messages in chat interface
- Show different styles for user vs admin messages
- Support different message types (text, image, document, audio)
- Show read receipts
- Pull-to-refresh for message list

### New Conversation Screen
- Subject input field
- First message input field
- Validation for required fields
- Success/error feedback

## Error Handling
Handle these common error responses:
- `401 Unauthorized`: Invalid or expired token
- `404 Not Found`: Conversation not found
- `400 Bad Request`: Invalid request parameters
- `500 Server Error`: Server-side error

## Best Practices
1. Store JWT token securely
2. Implement token refresh logic
3. Handle network failures gracefully
4. Cache conversation data locally
5. Implement optimistic UI updates
6. Respect pagination limits
7. Implement proper error messages for users
