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
  mediaUrl       String?      // URL for IMAGE type messages
  expiresAt      DateTime?     // Auto-expires based on Premium tier
  isDeleted      Boolean      @default(false)
  createdAt      DateTime     @default(now())

  @@index([conversationId, createdAt])
  @@index([expiresAt])
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

model PremiumSeat {
  id String @id @default(cuid())
  userId String @unique
  tier String @default("standard") // standard, premium, enterprise
  messageRetentionDays Int @default(30) // Message retention period
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
GET /api/conversations
- Lists all conversations for current user
- Filters by userId through ConversationParticipant
- Uses userId NOT id (participant's primary key)
- Returns: Array of conversations with participants and last message

POST /api/conversations/find
- Creates or finds existing direct conversation between participants
- Body: { participantIds: [userId1, userId2] }
- Returns: { conversation: { id, participants, ... } }
- Validates exactly 2 participants to ensure unique conversations
```

##### Messages

```
GET /api/messages?conversationId=<id>
- Retrieves all messages for a conversation
- Filters: isDeleted=false, expiresAt>now() OR expiresAt=null
- Requires authentication
- Returns: Array of messages with sender details

POST /api/messages
- Sends a new message (TEXT or IMAGE)
- Body: { conversationId, content, type, mediaUrl? }
- Broadcasts via Supabase Realtime
- Sets expiresAt based on Premium tier (30/90/365 days)
- Returns: Created message object

DELETE /api/messages
- Prunes expired/deleted messages (admin only)
- Called by cron job for cleanup
- Returns: { deleted: count }
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

**Postgres Changes (Database Trigger):**

The system uses PostgreSQL triggers for reliable real-time message delivery:

```sql
-- Database trigger for message inserts
CREATE OR REPLACE FUNCTION notify_message_insert()
RETURNS trigger
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM pg_notify('new_message', row_to_json(NEW)::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
AFTER INSERT ON "Message"
FOR EACH ROW
EXECUTE FUNCTION notify_message_insert();
```

**Client subscription:**

```typescript
// Using postgres_changes for database-driven realtime
const channel = supabase
  .channel(`messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'Message',
      filter: `conversationId=eq.${conversationId}`,
    },
    payload => {
      setMessages(prev => [...prev, payload.new as Message]);
    }
  )
  .subscribe();
```

**Benefits:**

- More reliable than broadcast (database as source of truth)
- Filtered subscriptions reduce unnecessary updates
- Works with RLS policies for security
- Automatic handling of database changes

#### Presence (Online Status)

Users can see who's currently online in a conversation:

```typescript
const presenceChannel = supabase.channel(`presence:${conversationId}`, {
  config: { presence: { key: currentUserId } },
});

presenceChannel
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState();
    setOnlineCount(Object.keys(state).length);
  })
  .subscribe(async status => {
    if (status === 'SUBSCRIBED') {
      await presenceChannel.track({
        user: { id: currentUserId, name: currentUserName, avatar: null },
        online_at: new Date().toISOString(),
      });
    }
  });
```

#### Typing Indicators

Broadcast typing status to other participants:

```typescript
const typingChannel = supabase.channel(`typing:${conversationId}`);

typingChannel
  .on('broadcast', { event: 'typing' }, payload => {
    const { userId, isTyping } = payload.payload;
    // Update typing state
  })
  .subscribe();

// Send typing indicator
await typingChannel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, userName, isTyping: true },
});
```

**RLS Policies (Security):**

```sql
-- Enable RLS
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Users can only view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON "Message" FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM "ConversationParticipant"
    WHERE "conversationId" = "Message"."conversationId"
    AND "userId" = auth.uid()::text
  )
);
```

### 4. Frontend Components

#### Shared Chat Hook (`useChat`)

All chat components use the unified `useChat` hook for shared functionality:

```typescript
// src/components/chat/useChat.ts
export function useChat({ conversationId, currentUserId, currentUserName }: UseChatOptions) {
  // Returns: { messages, loading, onlineCount, typingUsers, messagesEndRef,
  //            sendMessage, handleInputChange, sendTypingIndicator, formatTypingUsers }
}
```

**Shared Features:**

- Real-time message subscriptions (postgres_changes)
- Presence tracking (online count)
- Typing indicator management
- Message sending
- Auto-scroll to bottom
- Input change handler with typing debounce

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
└── DirectoryChatModal (popup chat) → uses useChat

/messages page
├── ConversationList (left panel)
└── ChatWindow (right panel) → uses useChat
```

#### Two Chat Patterns

| Aspect                 | /messages Page                | Directory Chat Modal           |
| ---------------------- | ----------------------------- | ------------------------------ |
| **Purpose**            | Full messaging hub            | Quick 1-on-1 chat              |
| **Layout**             | 2-panel: list + chat          | Modal overlay                  |
| **Conversation**       | Multi-conversation management | Auto-creates/finds direct chat |
| **Access**             | Via `/messages` route         | Triggered from resident card   |
| **Shared via useChat** | Presence, typing, realtime    | Same                           |

#### ChatWindow (Multi-Conversation)

**Features:**

- Conversation list in left panel
- Chat area in right panel
- Online user count indicator
- Typing indicators
- Image upload
- Emoji picker

**Implementation:**

```typescript
export function ChatWindow({ conversationId, currentUserId, currentUserName }) {
  const {
    messages,
    loading,
    onlineCount,
    messagesEndRef,
    sendMessage,
    handleInputChange,
    formatTypingUsers,
  } = useChat({ conversationId, currentUserId, currentUserName });

  // ... UI with image upload, emoji picker, presence indicators
}
```

#### ChatModal (Direct Chat)

**Features:**

- Popup modal for quick conversations
- Real-time message sync via useChat
- Auto-scroll to latest messages
- Enter-to-send functionality
- Online/offline status indicator
- Typing indicators
- Image upload
- Emoji picker
- Loading states and error handling

**Implementation:**

```typescript
export function ChatModal({ recipientId, recipientName, currentUserId, currentUserName, onClose }) {
  // Initialize direct conversation
  const [conversationId, setConversationId] = useState(null);

  // Use chat hook with conversation
  const { messages, onlineCount, sendMessage, ... } = useChat({
    conversationId: conversationId || '',
    currentUserId,
    currentUserName,
  });

  // ... Modal UI with same features as ChatWindow
}

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

#### Message Retention & Expiry

Messages are automatically expired based on user's Premium tier:

| Tier       | Retention | Description                   |
| ---------- | --------- | ----------------------------- |
| Standard   | 30 days   | Default for regular residents |
| Premium    | 90 days   | Extended for premium users    |
| Enterprise | 365 days  | Long-term for business users  |

**Expiry Implementation:**

- `expiresAt` field set on message creation (sender's retention period)
- GET /api/messages filters: `isDeleted: false AND (expiresAt IS NULL OR expiresAt > now())`
- DELETE /api/messages (admin) prunes expired/deleleted messages
- Cron job calls DELETE daily to clean up old messages

**Soft Delete:**

- `isDeleted` field for manual message removal
- Deleted messages filtered from API responses
- Pruning removes permanently from database

#### Emoji & Image Support

**Message Types:**

- `TEXT` - Standard text messages (default)
- `IMAGE` - Images with mediaUrl
- `SYSTEM` - System notifications

**Image Messages:**

- Client uploads image via file input
- Image converted to data URL (base64)
- Sent as IMAGE type with mediaUrl
- Rendered as img element in chat UI

**Emoji Picker:**

- Quick emoji selection bar
- Common emojis: 😀😂❤️👍🎉🔥💯👏🙏😊
- Click inserts emoji into message input

#### Group Chat

**Creating Groups:**

```

POST /api/conversations

- Body: { name, type: 'GROUP', participantIds: [...] }
- Creates conversation with multiple participants
- Returns: Created conversation object

````

**Group Features:**

- Name for group conversation
- Multiple participants (3+)
- Real-time updates for all members
- Uses same message expiry system

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

#### Implemented (v1.0)

- ✅ **Typing Indicators**: Show when other users are typing
- ✅ **Presence**: Online status tracking in conversations

#### Planned Features

- **Message Reactions**: Like, reply, emoji reactions
- **File Attachments**: Image and document sharing (images done)
- **Voice Messages**: Audio message support
- **Message Search**: Search within conversations
- **Push Notifications**: Browser push for new messages
- **Read Receipts**: Mark messages as read with timestamps
- **Group Management**: Add/remove participants, admin controls

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
````

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

- **Frontend**: React/Next.js with TypeScript, Tailwind CSS
- **Real-time**: Supabase Realtime (postgres_changes + Presence)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **State**: React hooks (useState, useEffect) + TanStack Query

The architecture supports both immediate community needs and future growth, providing a solid foundation for enhanced communication features.
