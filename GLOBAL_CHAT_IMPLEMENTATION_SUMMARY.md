# 🌐 Global Chat Implementation Summary

## Overview
Create a global chat system where **ALL users** (including execution users) can participate in a single chat room. This is different from TaskChat which is task-specific. The global chat will have its own collection and socket room.

---

## 📋 BACKEND IMPLEMENTATION

### 1. Database Schema - New Collection

**Collection Name:** `globalchatmessages` (or `globalChatMessages`)

**Schema Structure:**
```javascript
{
  _id: ObjectId,
  senderId: String,          // User ID of the sender
  senderName: String,        // Full name of sender (firstName + lastName)
  senderEmail: String,       // Optional: for display
  message: String,           // Text message or Cloudinary URL
  messageType: String,       // 'text', 'image', 'video', 'file'
  time: String,              // Formatted time string
  createdAt: Date,           // ISO timestamp
  updatedAt: Date            // ISO timestamp
}
```

**Note:** Unlike TaskChat, this does NOT need:
- `taskId` (no task association)
- `receiverId` (all users see all messages)

---

### 2. Backend API Endpoints

#### **POST** `/api/globalchat/messages`
**Purpose:** Create a new global chat message

**Request Body:**
```json
{
  "senderId": "user123",
  "senderName": "John Doe",
  "senderEmail": "john@example.com",  // Optional
  "message": "Hello everyone!",
  "messageType": "text",  // or "image", "video", "file"
  "time": "2:30 PM, 15 Jan 2025"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "message_id",
    "senderId": "user123",
    "senderName": "John Doe",
    "message": "Hello everyone!",
    "messageType": "text",
    "time": "2:30 PM, 15 Jan 2025",
    "createdAt": "2025-01-15T14:30:00.000Z"
  }
}
```

**Implementation Notes:**
- Save message to `globalchatmessages` collection
- Emit socket event `globalchat:new` to all connected users (broadcast)
- Return saved message

---

#### **GET** `/api/globalchat/messages`
**Purpose:** Get all global chat messages (paginated or limited)

**Query Parameters:**
- `limit`: Number of messages to fetch (default: 100, max: 500)
- `skip`: Number of messages to skip (for pagination)
- `sort`: Sort order ('asc' or 'desc', default: 'asc' for oldest first)

**Example:** `/api/globalchat/messages?limit=100&skip=0&sort=asc`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "msg1",
      "senderId": "user123",
      "senderName": "John Doe",
      "message": "Hello!",
      "messageType": "text",
      "time": "2:30 PM, 15 Jan 2025",
      "createdAt": "2025-01-15T14:30:00.000Z"
    },
    // ... more messages
  ],
  "total": 150,
  "limit": 100,
  "skip": 0
}
```

**Implementation Notes:**
- Fetch messages sorted by `createdAt` ascending (oldest first)
- Apply limit and skip for pagination
- Return array of messages

---

#### **GET** `/api/globalchat/messages/recent`
**Purpose:** Get recent messages (last N messages)

**Query Parameters:**
- `count`: Number of recent messages (default: 50)

**Example:** `/api/globalchat/messages/recent?count=50`

**Response:**
```json
{
  "success": true,
  "data": [
    // Last 50 messages sorted by createdAt descending
  ]
}
```

---

### 3. Socket.IO Events

#### **Client → Server Events:**

1. **`joinGlobalChat`**
   ```javascript
   socket.emit('joinGlobalChat');
   ```
   - Client requests to join the global chat room
   - Server adds client to `global-chat` room

2. **`leaveGlobalChat`** (optional)
   ```javascript
   socket.emit('leaveGlobalChat');
   ```
   - Client leaves the global chat room

#### **Server → Client Events:**

1. **`globalchat:new`**
   ```javascript
   socket.on('globalchat:new', (message) => {
     // message = { _id, senderId, senderName, message, messageType, time, createdAt }
   });
   ```
   - Emitted to ALL users in `global-chat` room when new message is created
   - Broadcast to entire room (not task-specific)

2. **`globalchat:error`** (optional)
   ```javascript
   socket.on('globalchat:error', (error) => {
     // Handle errors
   });
   ```

#### **Socket Room Structure:**
- **Room Name:** `global-chat`
- **Behavior:** All authenticated users join the same room
- **Broadcast:** All messages broadcast to entire room

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Create GlobalChatContext

**File:** `src/contexts/GlobalChatContext.jsx`

**Purpose:** Manage global chat messages state and socket room

**Key Features:**
- Store all global chat messages in state
- Handle joining/leaving `global-chat` socket room
- Listen for `globalchat:new` socket events
- Provide methods: `getMessages()`, `setInitialMessages()`, `ensureGlobalRoom()`

**Differences from TaskChatContext:**
- No task-specific grouping (all messages in one array)
- Single socket room (`global-chat` instead of per-task rooms)
- No `getMessagesForTask()` - just `getMessages()`

---

### 2. Create GlobalChat Component

**File:** `src/components/PortalCommonComponents/GlobalChat/GlobalChat.jsx`

**File:** `src/components/PortalCommonComponents/GlobalChat/GlobalChat.css`

**Purpose:** Reusable global chat component (similar to TaskChat but without taskId/receiverId)

**Props:**
```javascript
{
  className?: string,           // Custom CSS class
  title?: string,               // Default: "Global Chat"
  placeholder?: string,         // Default: "Type a message..."
  showTitle?: boolean,          // Default: true
  height?: string,              // Default: '500px'
  onMessageSent?: (message) => void  // Optional callback
}
```

**Key Differences from TaskChat:**
- ❌ NO `taskId` prop
- ❌ NO `receiverId` prop
- ✅ Uses `GlobalChatContext` instead of `TaskChatContext`
- ✅ Uses global chat API endpoints
- ✅ Joins `global-chat` socket room (not task-specific)
- ✅ Same UI/UX features (emoji picker, file upload, media preview, etc.)

---

### 3. API Endpoints in store/api.js

**Add these endpoints:**

```javascript
// Add Global Chat mutation
addGlobalChat: builder.mutation({
  query: ({ senderId, senderName, senderEmail, message, messageType, time }) => ({
    url: '/api/globalchat/messages',
    method: 'POST',
    body: {
      senderId,
      senderName,
      senderEmail,  // Optional
      message,
      messageType: messageType || 'text',
      time
    },
    headers: { 'Content-Type': 'application/json' },
  }),
}),

// Get Global Chat messages
getGlobalChatMessages: builder.query({
  query: ({ limit = 100, skip = 0, sort = 'asc' } = {}) => ({
    url: `/api/globalchat/messages?limit=${limit}&skip=${skip}&sort=${sort}`,
    method: 'GET',
  }),
  providesTags: ['GlobalChat'],
}),

// Get Recent Global Chat messages (lazy)
getRecentGlobalChatMessages: builder.query({
  query: ({ count = 50 } = {}) => ({
    url: `/api/globalchat/messages/recent?count=${count}`,
    method: 'GET',
  }),
  providesTags: ['GlobalChat'],
}),
```

**Export hooks:**
```javascript
export const {
  // ... existing exports
  useAddGlobalChatMutation,
  useGetGlobalChatMessagesQuery,
  useLazyGetGlobalChatMessagesQuery,
  useGetRecentGlobalChatMessagesQuery,
  useLazyGetRecentGlobalChatMessagesQuery,
} = api;
```

**Add to tagTypes:**
```javascript
tagTypes: ['User', 'UserData', 'Tasks', 'UserDocuments', 'Teams', 'GlobalChat'],
```

---

### 4. Socket Integration

**File:** `src/utils/socket.js` (optional additions)

**Add helper functions (if needed):**
```javascript
export const emitJoinGlobalChat = () => {
  if (socket && socket.connected) {
    socket.emit('joinGlobalChat');
  }
};

export const onGlobalChatMessage = (callback) => {
  if (socket) {
    socket.on('globalchat:new', callback);
  }
};

export const offGlobalChatMessage = (callback) => {
  if (socket && callback) {
    socket.off('globalchat:new', callback);
  }
};
```

**Note:** Socket integration should primarily be handled in `GlobalChatContext` (similar to TaskChatContext).

---

### 5. Provider Setup

**File:** `src/main.jsx`

**Add GlobalChatProvider:**
```javascript
import { GlobalChatProvider } from './contexts/GlobalChatContext';

// Wrap App with GlobalChatProvider
<SocketProvider>
  <TaskChatProvider>
    <GlobalChatProvider>
      <App />
    </GlobalChatProvider>
  </TaskChatProvider>
</SocketProvider>
```

---

### 6. Usage Example

**In any component:**
```javascript
import GlobalChat from '../components/PortalCommonComponents/GlobalChat/GlobalChat';

// Use it anywhere
<GlobalChat
  title="Global Chat"
  placeholder="Type a message to everyone..."
  showTitle={true}
  height="600px"
/>
```

**Common placement locations:**
- Dashboard sidebar/widget
- Dedicated Global Chat page/route
- Modal/drawer component
- Portal sidebar or header

---

## 📊 COMPARISON: TaskChat vs GlobalChat

| Feature | TaskChat | GlobalChat |
|---------|----------|------------|
| **Collection** | `chatmessages` (task-specific) | `globalchatmessages` (global) |
| **Socket Room** | `task-{taskId}` | `global-chat` (single room) |
| **Participants** | Task assignee + receiver | ALL users |
| **Props** | `taskId`, `receiverId` required | No `taskId`/`receiverId` |
| **Context** | `TaskChatContext` | `GlobalChatContext` |
| **API Endpoint** | `/api/chat/messages?taskId=...` | `/api/globalchat/messages` |
| **Socket Event** | `chat:new` (per task) | `globalchat:new` (broadcast) |
| **Message Scope** | Task-specific messages | All messages visible to everyone |

---

## ✅ IMPLEMENTATION CHECKLIST

### Backend:
- [ ] Create `globalchatmessages` collection/model
- [ ] Create POST `/api/globalchat/messages` endpoint
- [ ] Create GET `/api/globalchat/messages` endpoint (with pagination)
- [ ] Create GET `/api/globalchat/messages/recent` endpoint
- [ ] Implement socket room `global-chat`
- [ ] Implement `joinGlobalChat` socket handler
- [ ] Emit `globalchat:new` event on message creation (broadcast to room)
- [ ] Test API endpoints
- [ ] Test socket events

### Frontend:
- [ ] Create `GlobalChatContext.jsx`
- [ ] Create `GlobalChat.jsx` component
- [ ] Create `GlobalChat.css` styles (copy from TaskChat.css, modify as needed)
- [ ] Add API endpoints to `store/api.js`
- [ ] Add `GlobalChatProvider` to `main.jsx`
- [ ] Test component rendering
- [ ] Test message sending
- [ ] Test real-time updates via socket
- [ ] Test file uploads (images, videos, documents)
- [ ] Test emoji picker
- [ ] Test message pagination (if implemented)

---

## 🎯 NEXT STEPS

1. **Start with Backend:**
   - Create the collection schema
   - Implement API endpoints
   - Implement socket handlers
   - Test thoroughly

2. **Then Frontend:**
   - Create GlobalChatContext
   - Create GlobalChat component (copy TaskChat, modify)
   - Add API endpoints
   - Integrate provider
   - Test functionality

3. **Integration:**
   - Add GlobalChat to desired location (Dashboard, sidebar, route, etc.)
   - Test with multiple users
   - Verify real-time updates work

---

## 📝 NOTES

- Global chat is **public** - all authenticated users can see all messages
- Consider adding **message moderation** features if needed
- Consider adding **message deletion** (admin-only?) if needed
- Consider adding **typing indicators** for better UX
- Consider adding **message search** functionality
- Consider implementing **pagination** or **infinite scroll** for large message history
- Consider adding **user presence** indicators (online/offline status)

---

## 🔐 SECURITY CONSIDERATIONS

- Ensure only authenticated users can access global chat
- Validate message content (prevent XSS, spam)
- Limit message length
- Rate limit message sending (prevent spam)
- Validate file uploads (type, size)
- Sanitize user input before storing

---

**End of Summary**


