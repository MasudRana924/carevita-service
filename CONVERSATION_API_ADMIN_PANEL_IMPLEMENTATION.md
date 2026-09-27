# Conversation API - Admin Panel Implementation Guide

## Overview
This guide provides implementation instructions for integrating the conversation/messaging system into the admin panel. Admins can view all user conversations, send replies, and receive updates via page reload.

## Base URL
```
https://your-api-domain.com
```

## Authentication
All API calls require authentication via JWT token with admin role in the Authorization header:
```
Authorization: Bearer <your_admin_jwt_token>
```

## API Endpoints

### 1. Get All Conversations
**Endpoint:** `GET /admin/conversations`
**Description:** Get list of all conversations (admin only)

**Query Parameters:**
- `status` (optional): Filter by status - `active`, `closed`, `archived`
- `search` (optional): Search by user name, phone, email, or subject
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
      "user_name": "John Doe",
      "user_phone": "+8801712345678",
      "user_email": "john@example.com",
      "subject": "Booking issue",
      "status": "active",
      "user_unread_count": 0,
      "admin_unread_count": 2,
      "last_message_at": "2024-01-15T10:30:00Z",
      "last_message_preview": "I need help with my booking",
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

### 2. Get Single Conversation Details
**Endpoint:** `GET /admin/conversations/:id`
**Description:** Get details of a specific conversation with user information

**Response:**
```json
{
  "success": true,
  "message": "Conversation fetched successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "user_name": "John Doe",
    "user_phone": "+8801712345678",
    "user_email": "john@example.com",
    "subject": "Booking issue",
    "status": "active",
    "user_unread_count": 0,
    "admin_unread_count": 2,
    "last_message_at": "2024-01-15T10:30:00Z",
    "last_message_preview": "I need help with my booking",
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Get Conversation Messages
**Endpoint:** `GET /admin/conversations/:id/messages`
**Description:** Get all messages in a conversation (admin view)

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

### 4. Reply to Conversation
**Endpoint:** `POST /admin/conversations/:id/reply`
**Description:** Send an admin reply to a conversation

**Request Body:**
```json
{
  "message_type": "text",
  "message": "I understand your issue. Let me help you resolve this..."
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
  "message": "Reply sent successfully",
  "data": {
    "id": "uuid",
    "conversation_id": "uuid",
    "sender_id": "uuid",
    "sender_role": "admin",
    "message": "I understand your issue. Let me help you resolve this...",
    "message_type": "text",
    "is_read": false,
    "read_at": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

**Note:** This endpoint automatically:
- Sends Firebase push notification to the user
- Updates conversation unread counts

### 5. Update Conversation Status
**Endpoint:** `PUT /admin/conversations/:id/status`
**Description:** Update the status of a conversation

**Request Body:**
```json
{
  "status": "closed"
}
```

**Valid status values:**
- `active`: Conversation is ongoing
- `closed`: Conversation is closed
- `archived`: Conversation is archived

**Response:**
```json
{
  "success": true,
  "message": "Conversation status updated successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "subject": "Booking issue",
    "status": "closed",
    "user_unread_count": 0,
    "admin_unread_count": 0,
    "created_at": "2024-01-15T09:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

### 6. Mark Messages as Read
**Endpoint:** `PUT /admin/conversations/:id/read`
**Description:** Mark all user messages in a conversation as read

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
      "sender_role": "user",
      "message": "I have a problem with my booking",
      "message_type": "text",
      "is_read": true,
      "read_at": "2024-01-15T10:01:00Z",
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T10:01:00Z"
    }
  ]
}
```

## Update Mechanism

**Note:** Admin panel uses page reload for updates. Users receive instant updates via Firebase push notifications.

### Current Implementation (Page Reload)
- Admin manually refreshes the page to see new conversations and messages
- Simple and reliable approach for admin panel
- No complex WebSocket connection management required

### Optional Auto-Refresh Enhancement
If you want to add near real-time updates for admin in the future:
- Implement auto-refresh interval (e.g., every 30 seconds)
- Use polling to fetch new conversations and messages
- Show visual indicator when new data is available

## UI Implementation Recommendations

### Conversation List Screen
- Display table/list of all conversations
- Show user information (name, phone, email)
- Display conversation subject
- Show last message preview
- Display unread count badge for admin unread messages
- Show timestamp of last message
- Status filter dropdown (active, closed, archived)
- Search functionality
- Sort by last message time
- Click to open conversation details

### Conversation Detail Screen
- Display user information at top
- Show conversation subject and status
- Chat interface for messages
- Different styles for user vs admin messages
- Support different message types (text, image, document, audio)
- Real-time updates via WebSocket
- Message input field for admin replies
- Status change dropdown
- Read receipts
- Timestamp for each message

### Admin Dashboard Integration
- Show total conversation count
- Display active conversations count
- Show unread message count
- Recent conversations widget
- Quick actions (mark as read, close conversation)

## Real-time Features

**Note:** Admin panel uses page reload for updates. Users receive instant updates via Firebase push notifications.

### Current Implementation (Page Reload)
- Admin manually refreshes the page to see new conversations and messages
- Simple and reliable approach for admin panel
- No complex WebSocket connection management required

### Optional Auto-Refresh Enhancement
If you want to add near real-time updates in the future:
- Implement auto-refresh interval (e.g., every 30 seconds)
- Use polling to fetch new conversations and messages
- Show visual indicator when new data is available

## Error Handling
Handle these common error responses:
- `401 Unauthorized`: Invalid or expired admin token
- `403 Forbidden`: User doesn't have admin role
- `404 Not Found`: Conversation not found
- `400 Bad Request`: Invalid request parameters
- `500 Server Error`: Server-side error

## Best Practices
1. Store admin JWT token securely
2. Implement token refresh logic
3. Implement proper error messages
4. Use optimistic UI updates for better UX
5. Implement conversation filtering and search
6. Show loading states during API calls
7. Handle network failures gracefully
8. Implement pagination for large conversation lists
9. Cache conversation data locally for performance
10. Consider adding auto-refresh interval for near real-time updates

## Security Considerations
1. Always verify admin role on client side
2. Never expose other admin users' information
3. Implement proper access controls
4. Log admin actions for audit trail
5. Implement rate limiting for message sending
6. Validate all user inputs
7. Sanitize message content to prevent XSS

## Performance Optimization
1. Implement virtual scrolling for large conversation lists
2. Cache conversation data locally for faster page loads
3. Implement lazy loading for messages
4. Debounce search queries
5. Use pagination for both conversations and messages
6. Implement image optimization for media messages
7. Consider adding auto-refresh interval (e.g., every 30 seconds) for near real-time updates without WebSocket complexity
