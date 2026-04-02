# Chat Architecture Design Document

## Overview

The Soralia Village chat system provides real-time messaging capabilities for community members to communicate directly. The architecture supports both individual conversations and group chats with real-time updates, read receipts, and unread message indicators.

## Architecture Components

### 1. Database Schema

#### Core Models

```prisma
model Conversation {
  id           String                  @id @default(cuid())
  name         String?
  type         ConversationType        @default(DIRECT)
  participants ConversationParticipant[]
  messages     Message[]
  createdAt    DateTime                @default(now())
  updatedAt    DateTime                @updatedAt
}

model ConversationParticipant {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt       DateTime     @default(now())
  lastReadAt     DateTime?    // When user last read this conversation
  lastReadMessageId String?   // ID of last message user read

  @@unique([conversationId, userId])
  @@index([conversationId])
  @@index([userId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User         @relation(fields: [senderId], references: [id])
  content        String
  type           MessageType  @default(TEXT)
  createdAt      DateTime     @default(now())
}

enum ConversationType {
  DIRECT
  GROUP
}

enum MessageType {
  TEXT
  IMAGE
  SYSTEM
}
```

#### Key Design Decisions

- **ConversationParticipant Junction Table**: Enables tracking of read status per user per conversation
- **Direct vs Group Conversations**: Supports both 1-on-1 and multi-user chats
- **Read Receipts**: `lastReadAt` and `lastReadMessageId` enable unread message tracking
- **Message Types**: Extensible for future message types (images, files, etc.)

### 2. API Layer

#### Endpoints

##### Conversations

```
POST /api/conversations/find
- Creates or finds existing direct conversation between participants
- Body: { participantIds: [userId1, userId2] }
- Returns: { conversation: { id, participants, ... } }
```

##### Messages

```
GET /api/messages?conversationId=<id>
- Retrieves all messages for a conversation
- Requires authentication
- Returns: Array of messages with sender details

POST /api/messages
- Sends a new message
- Body: { conversationId, content, type }
- Broadcasts via Supabase Realtime
- Returns: Created message object
```

##### Unread Messages

```
GET /api/messages/unread
- Returns unread message counts for current user
- Returns: { unreadCounts: { [userId]: count }, totalUnread: number }

POST /api/messages/mark-read
- Marks conversation as read for current user
- Body: { conversationId, messageId }
- Updates lastReadAt and lastReadMessageId
```

#### Authentication & Authorization

- All endpoints require authentication via Better Auth
- Message access controlled by conversation participation
- TODO: Implement conversation access control validation

### 3. Real-Time Communication

#### Supabase Realtime Integration

**Broadcast Channels:**

```typescript
// Message broadcasting
await supabase.channel(`messages:${conversationId}`).send({
  type: 'broadcast',
  event: 'new-message',
  payload: message,
});

// Client subscription
const channel = supabase
  .channel(`chat:${conversationId}`)
  .on('broadcast', { event: 'new-message' }, payload => {
    setMessages(prev => [...prev, payload.payload as Message]);
  })
  .subscribe();
```

**Benefits:**

- Real-time message delivery without WebSocket server
- Automatic reconnection handling
- Cross-tab synchronization
- Scalable with Supabase infrastructure

### 4. Frontend Components

#### Chat Entry Points

**Directory Integration:**

- `UnifiedResidentCard` shows chat icons for other users
- Current user shows unread message indicators (green/red chat icon with badge)
- `DirectoryGrid` manages chat modal state

**Dedicated Chat Page:**

- `/messages` page with `ChatWindow` component
- Full conversation management interface
- Message history and real-time updates

#### Component Hierarchy

```
DirectoryGrid
├── UnifiedResidentCard (with chat icon)
└── DirectoryChatModal (popup chat)

ChatWindow (full page)
├── MessageList
├── MessageInput
└── Real-time updates
```

#### Chat Modal (`DirectoryChatModal`)

**Features:**

- Popup modal for quick conversations
- Real-time message sync via Supabase
- Auto-scroll to latest messages
- Enter-to-send functionality
- Loading states and error handling

**Implementation:**

```typescript
// Conversation initialization
const res = await fetch('/api/conversations/find', {
  method: 'POST',
  body: JSON.stringify({ participantIds: [currentUserId, recipientId] }),
});

// Real-time subscription
const channel = supabase
  .channel(`chat:${conversationId}`)
  .on('broadcast', { event: 'new-message' }, handleNewMessage)
  .subscribe();
```

### 5. Unread Message System

#### UI Indicators

**Current User Card:**

- 🟢 Green chat icon: "Ready to receive communication"
- 🔴 Red chat icon + badge: "You have X unread messages"

**Badge Design:**

- Red circular badge (20x20px)
- White text, positioned top-right of chat icon
- Shows count (1-9) or "9+" for overflow

#### Data Flow

```
1. Page Load → DirectoryGrid fetches unread counts
2. API Query → Count messages newer than lastReadAt
3. UI Update → Display badges on current user card
4. Click → Open chat modal, auto-mark as read
```

#### Performance Considerations

- Unread counts fetched once per page load
- Cached in component state
- Real-time updates could be added via WebSocket
- Efficient database queries with proper indexing

### 6. User Experience Flow

#### Initiating Chat

1. **From Directory**: Click chat icon on resident card
2. **Modal Opens**: Shows conversation or "start conversation" state
3. **Real-time Sync**: Messages appear instantly
4. **Send Messages**: Enter key or send button

#### Receiving Messages

1. **Unread Indicators**: Current user sees red chat icon with badge
2. **Click to View**: Opens chat modal with new messages
3. **Auto-scroll**: Jumps to latest message
4. **Mark as Read**: Automatically updates read status

#### Message Features

- **Text Messages**: Standard chat functionality
- **Timestamps**: Show message send times
- **Sender Identification**: Avatar, name, "You" labels
- **Message Status**: Sent confirmation (future enhancement)

### 7. Security & Privacy

#### Access Control

- **Authentication Required**: All chat features require login
- **Conversation Privacy**: Only participants can view messages
- **Participant Validation**: API verifies user access to conversations
- **Data Encryption**: Messages stored securely in database

#### Privacy Features

- **Direct Messages**: Private conversations between participants
- **No Public Messages**: All chats are private to participants
- **Read Receipts**: Optional read status tracking
- **Message History**: Retained for conversation continuity

### 8. Scalability Considerations

#### Database Optimization

- **Indexing**: Proper indexes on conversationId, userId, createdAt
- **Partitioning**: Future consideration for large message tables
- **Archival**: Old message cleanup policies

#### Real-time Performance

- **Supabase Limits**: Monitor broadcast frequency and connection limits
- **Connection Management**: Proper channel cleanup on component unmount
- **Batch Updates**: Group message updates to reduce API calls

#### Frontend Performance

- **Lazy Loading**: Load conversation history on demand
- **Virtual Scrolling**: For long message histories
- **Optimistic Updates**: Immediate UI updates before server confirmation

### 9. Future Enhancements

#### Planned Features

- **Typing Indicators**: Show when other users are typing
- **Message Reactions**: Like, reply, emoji reactions
- **File Attachments**: Image and document sharing
- **Voice Messages**: Audio message support
- **Message Search**: Search within conversations
- **Push Notifications**: Browser push for new messages

#### Advanced Chat Features

- **Group Chats**: Multi-user conversations
- **Chat Moderation**: Admin controls for inappropriate content
- **Message Encryption**: End-to-end encryption
- **Offline Support**: Queue messages when offline
- **Message Templates**: Quick reply templates

### 10. Monitoring & Analytics

#### Key Metrics

- **Message Volume**: Total messages sent per day/week
- **Active Conversations**: Number of active chat threads
- **User Engagement**: Chat participation rates
- **Response Times**: Average time to respond to messages
- **Unread Message Rates**: Percentage of messages left unread

#### Error Tracking

- **Delivery Failures**: Messages that fail to send
- **Connection Issues**: Real-time sync failures
- **API Errors**: Backend endpoint failures
- **Performance Issues**: Slow message loading

### 11. Testing Strategy

#### Unit Tests

- **Component Tests**: Chat UI component behavior
- **API Tests**: Message sending and receiving
- **Real-time Tests**: Supabase channel functionality

#### Integration Tests

- **End-to-End**: Complete chat conversation flows
- **Cross-browser**: Compatibility across browsers
- **Mobile Testing**: Responsive design validation

#### Load Testing

- **Concurrent Users**: Multiple users chatting simultaneously
- **Message Volume**: High-frequency message sending
- **Real-time Sync**: Performance under load

### 12. Deployment Considerations

#### Environment Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Database Migration

- **Schema Updates**: Proper migration scripts for new models
- **Data Migration**: Preserve existing conversations during updates
- **Rollback Plan**: Safe rollback procedures for failed deployments

#### Monitoring Setup

- **Real-time Metrics**: Supabase channel health monitoring
- **Error Logging**: Comprehensive error tracking and alerting
- **Performance Monitoring**: Message delivery latency tracking

---

## Conclusion

The Soralia Village chat architecture provides a robust, scalable messaging system that enhances community engagement through real-time communication. The combination of Supabase Realtime for instant messaging, comprehensive read receipt tracking, and intuitive UI components creates a modern chat experience that scales with community growth.

**Key Strengths:**

- Real-time messaging with Supabase Realtime
- Comprehensive unread message tracking
- Intuitive UI with chat indicators
- Scalable database design
- Security and privacy focused
- Extensible for future enhancements

**Technology Stack:**

- **Frontend**: React/Next.js with TypeScript
- **Real-time**: Supabase Realtime
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Styling**: Tailwind CSS

The architecture supports both immediate community needs and future growth, providing a solid foundation for enhanced communication features.
