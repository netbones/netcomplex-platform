# Chat / Messaging Subsystem -- Complete Exploration

1. Prisma Schema Models: Message and Conversation
   File: /home/ubuntupunk/Projects/soralia-village/prisma/schema.prisma
   Conversation model (lines 179-189):
   model Conversation {
   id String @id
   tenantId String
   name String?
   type ConversationType @default(DIRECT)
   createdAt DateTime @default(now())
   updatedAt DateTime @default(now()) @updatedAt
   deletedAt DateTime?
   ConversationParticipant ConversationParticipant[]
   Message Message[]
   }
   ConversationParticipant model (lines 192-206):
   model ConversationParticipant {
   id String @id
   tenantId String
   conversationId String
   userId String
   joinedAt DateTime @default(now())
   lastReadAt DateTime?
   lastReadMessageId String?
   Conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
   user user @relation(fields: [userId], references: [id], onDelete: Cascade)

@@unique([conversationId, userId])
@@index([conversationId])
@@index([userId])
}
Message model (lines 465-482):
model Message {
id String @id
tenantId String
conversationId String
senderId String
content String
type MessageType @default(TEXT)
createdAt DateTime @default(now())
expiresAt DateTime?
deletedAt DateTime?
mediaUrl String?
Conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
user user @relation(fields: [senderId], references: [id])

@@index([conversationId, createdAt])
@@index([expiresAt])
@@index([senderId])
}
Prisma Enums:
ConversationType enum (lines 1317-1320):
enum ConversationType {
DIRECT
GROUP
}
MessageType enum (lines 1376-1380):
enum MessageType {
TEXT
IMAGE
SYSTEM
}
All three models carry the annotation /// This model contains row level security... indicating RLS awareness. However, the chat API routes do NOT use runWithRLS() -- they use direct Drizzle queries. 2. TypeScript Types / Interfaces for Message, Conversation
There are three layers of types:
2a. Entity-level types (canonical source of truth)
File: /home/ubuntupunk/Projects/soralia-village/src/entities/chat/model/types.ts (104 lines)

- Line 1: export type ConversationType = 'DIRECT' | 'GROUP';
- Line 3: export type MessageType = 'TEXT' | 'IMAGE' | 'SYSTEM';
- Lines 5-9: ParticipantInfo -- { id, name, avatar }
- Lines 11-18: ConversationParticipant -- { id, userId, joinedAt, lastReadAt?, lastReadMessageId?, user: ParticipantInfo }
- Lines 20-30: ConversationMessage -- { id, conversationId, senderId, content, type, createdAt, expiresAt?, isDeleted?, mediaUrl? }
- Lines 32-38: Conversation -- { id, name, type, participants: ConversationParticipant[], messages: ConversationMessage[] }
- Lines 40-48: ConversationListItem -- { id, name, type, createdAt, updatedAt, participants, messages }
- Lines 50-54: CreateConversationData -- { name, type, participantIds }
- Lines 56-58: FindConversationData -- { participantIds }
- Lines 60-67: Message -- { id, content, type: MessageType, mediaUrl?, createdAt, sender: ParticipantInfo }
- Lines 69-74: MessageFormData -- { conversationId, content, type, mediaUrl? }
- Lines 76-80: UseChatOptions -- { conversationId, currentUserId, currentUserName }
- Lines 82-87: UseDirectChatOptions -- { recipientId, recipientName, currentUserId, currentUserName }
- Lines 89-99: ChatState -- { messages, loading, typingUsers, onlineCount, messagesEndRef, sendMessage, handleInputChange, sendTypingIndicator, formatTypingUsers }
- Lines 101-104: DirectChatState extends ChatState -- adds { conversationId, isReady }
  2b. Zod schema (inferred types)
  File: /home/ubuntupunk/Projects/soralia-village/src/entities/chat/schema.ts (38 lines)
- Lines 9-26: messageSchema -- validates { conversationId, content (1-2000 chars), type? ('TEXT'|'IMAGE'|'SYSTEM'), mediaUrl? } with refinement: IMAGE type requires mediaUrl
- Line 28: export type MessageFormData = z.infer<typeof messageSchema>;
- Lines 30-36: conversationSchema -- validates { name? (1-100 chars), type? ('DIRECT'|'GROUP'), participantIds: string[] min 2 }
- Line 38: export type ConversationFormData = z.infer<typeof conversationSchema>;
  2c. DTO layer (API wire format)
  File: /home/ubuntupunk/Projects/soralia-village/src/shared/api/dto/message.ts (35 lines)
- Lines 5-15: MessageDTO -- { id, conversationId, senderId, content, type, mediaUrl, deletedAt, createdAt, expiresAt }
- Lines 18-30: toMessageDTO() -- maps Drizzle row -> MessageDTO
- Lines 33-35: toMessageDTOs() -- batch mapper
  File: /home/ubuntupunk/Projects/soralia-village/src/shared/api/dto/conversation.ts (31 lines)
- Lines 5-11: ConversationDTO -- { id, name, type, createdAt, updatedAt }
- Lines 14-24: toConversationDTO() -- maps Drizzle row -> ConversationDTO
- Lines 27-30: toConversationDTOs() -- batch mapper

3. Drizzle Schema (database query layer)
   Drizzle table definitions:
   File
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/messages.ts (15 lines)
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/conversations.ts (12 lines)
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/conversation-participants.ts (3 lines)
   Drizzle enum definitions:
   File
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/message-type-enum.ts (3 lines)
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/conversation-type-enum.ts (3 lines)
   Drizzle relations:
   File
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/messages-relations.ts (6 lines)
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/conversations-relations.ts (6 lines)
   /home/ubuntupunk/Projects/soralia-village/src/db/schema/conversation-participants-relations.ts (6 lines)
   DB barrel:
   /home/ubuntupunk/Projects/soralia-village/src/db/index.ts (55 lines) -- re-exports all schema modules including messages (line 22) and conversations (line 12), conversation-participants (line 13)
4. Where message.content / msg.content Is Used Directly
   Four locations:
5. /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/ChatMessage.tsx, line 56:
   const { elements, previews } = parseLinks(message.content);
6. /home/ubuntupunk/Projects/soralia-village/src/page-modules/chat/ui/MessagesPage.tsx, line 533:
   content: msg.content,
7. /home/ubuntupunk/Projects/soralia-village/src/features/directory/ui/DirectoryChatModal.tsx, line 221:
<p className="text-sm break-words">{msg.content}</p>
8. /home/ubuntupunk/Projects/soralia-village/src/shared/api/dto/message.ts, line 23:
   content: message.content,
   Additionally, lastMessage.content is used in widget previews:

- /home/ubuntupunk/Projects/soralia-village/src/widgets/chat/ui/MessagesWidget.tsx, line 67
- /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/MessagesWidget.tsx, line 76

5. Chat API Routes
   Primary implementation routes:
   Route File
   /api/messages /home/ubuntupunk/Projects/soralia-village/src/app/api/messages/route.ts (277 lines)
   /api/messages/urgency /home/ubuntupunk/Projects/soralia-village/src/app/api/messages/urgency/route.ts (143 lines)
   /api/messages/unread /home/ubuntupunk/Projects/soralia-village/src/app/api/messages/unread/route.ts (214 lines)
   /api/conversations /home/ubuntupunk/Projects/soralia-village/src/app/api/conversations/route.ts (186 lines)
   /api/conversations/find /home/ubuntupunk/Projects/soralia-village/src/app/api/conversations/find/route.ts (97 lines)
   Key implementation details in POST /api/messages (lines 147-245):

- Rate limited: 30 messages per 60 seconds per user (line 155)
- Validates with messageSchema Zod schema (line 162-165)
- Checks participant membership (line 173-184)
- Looks up premium seat for retention period (line 190-194)
- Sanitizes content: sanitizeHtml(content) for TEXT messages (line 208)
- Broadcasts via Supabase Realtime on channel chat:${conversationId} (lines 234-238)
- Revalidates conversation caches (line 231)
  V1 namespace proxy routes (all re-export canonical implementations):
  Route File
  /api/v1/tenant/messages /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/messages/route.ts (5 lines) -- re-exports GET, POST, DELETE from @/app/api/messages/route
  /api/v1/tenant/messages/unread /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/messages/unread/route.ts (5 lines) -- re-exports GET from @/app/api/messages/unread/route
  /api/v1/tenant/conversations /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/conversations/route.ts (5 lines) -- re-exports GET, POST from @/app/api/conversations/route
  /api/v1/tenant/conversations/find /home/ubuntupunk/Projects/soralia-village/src/app/api/v1/tenant/conversations/find/route.ts (5 lines) -- re-exports POST from @/app/api/conversations/find/route

6. Moderation-Related Code in the Chat Domain
   There is NO moderation-specific code in the chat domain. Specifically:

- No moderation checks in the message/route.ts (no suspension check, no content moderation filter)
- src/entities/chat/ contains no moderation-related files
- The getSessionAndRole() function in messages/route.ts (lines 46-67) does NOT check for suspension status
  The broader app has moderation elsewhere:
- src/app/api/community-services/moderation/ -- for community service listings
- src/app/api/content/[id]/moderate/ -- for content (articles, etc.)
- ModerationStatus Prisma enum (line 1310)
- group-moderation widget (@widgets/admin) for group membership requests
  But the chat subsystem has no moderation integration.

7. Search-Related Code in the Chat Domain
   Search is client-side only, in the MessagesPage component:
   File: /home/ubuntupunk/Projects/soralia-village/src/page-modules/chat/ui/MessagesPage.tsx

- Line 57: const [searchQuery, setSearchQuery] = useState(''); -- local state
- Lines 121-139: filteredConversations useMemo -- filters by searchQuery matching against conv.name or other participants' names, and by filter type (all/direct/group)
- Lines 258-264: Search input rendered with placeholder="Search conversations..."
- Line 130: Filter logic: (conv.name || otherParticipants).toLowerCase().includes(searchQuery.toLowerCase())
  There is no server-side search for conversations or messages. No full-text search. No search API endpoint.

8. MessageType / ConversationType Enum Definitions
   All three layers are consistent:
   Layer ConversationType
   Prisma DIRECT, GROUP
   Drizzle pgEnum('ConversationType', ['DIRECT', 'GROUP'])
   TypeScript types 'DIRECT' | 'GROUP'
   Zod schema z.enum(['DIRECT', 'GROUP'])
   One local redefinition exists in CreateConversationModal.tsx:

- Line 7: type ConversationType = 'DIRECT' | 'GROUP'; (duplicate but equivalent)

9. Widget Registration for Chat
   There are two message-related widgets in the registry:
   File: /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/model/widgets.ts
   notifications widget (lines 148-163):
   registry.register({
   id: 'notifications',
   version: '1.0.0',
   name: 'Notifications',
   description: 'User notifications and alerts',
   category: 'communication',
   icon: Bell,
   component: lazy(() => import('../ui/NotificationsWidget')...),
   defaultSize: { width: 2, height: 2 },
   spaces: ['home', 'messages'],
   });
   messages widget (lines 165-178):
   registry.register({
   id: 'messages',
   version: '1.0.0',
   name: 'Messages',
   description: 'Recent messages and conversations',
   category: 'communication',
   icon: MessageSquare,
   component: lazy(() => import('@widgets/chat').then(m => ({ default: m.MessagesWidget }))),
   defaultSize: { width: 2, height: 2 },
   spaces: ['messages'],
   });
   The messages widget lazily loads from @widgets/chat which re-exports from:
   File: /home/ubuntupunk/Projects/soralia-village/src/widgets/chat/index.ts (1 line):
   export \* from './ui/MessagesWidget';
   There is also a duplicate MessagesWidget at /home/ubuntupunk/Projects/soralia-village/src/widgets/dashboard/ui/MessagesWidget.tsx (101 lines) which is a simpler non-registered version (no ParticipantAvatar import from entities, inline avatar rendering).
10. Payload / Attachment Handling in Messages
    Current state: basic, client-side only.
    The Message table has mediaUrl: text('mediaUrl') in Drizzle (line 14 of src/db/schema/messages.ts) and mediaUrl String? in Prisma (line 475). The Zod schema validates it as z.string().url().optional() with a refinement that type === 'IMAGE' requires mediaUrl.
    Send flow in MessagesPage.tsx (lines 150-183):

- Lines 153-155: If selectedImage is set, sends { content: 'Image', type: 'IMAGE', mediaUrl: selectedImage }
- Lines 185-192: handleImageSelect() -- reads file via FileReader.readAsDataURL() -- this is a base64 data URL, NOT a real upload to storage
  No server-side attachment handling exists:
- No file upload endpoint
- No Supabase Storage integration for chat attachments
- No multipart form handling
- The mediaUrl field is stored as-provided in the request body
  The type field is used to distinguish rendering:
- ChatMessage.tsx line 57: const isImage = message.type === 'IMAGE' && message.mediaUrl;
- When isImage, renders <img src={message.mediaUrl!}> (lines 91-98)
  useMessageSend feature hook accepts mediaUrl as optional parameter:
  /home/ubuntupunk/Projects/soralia-village/src/features/chat/model/useMessageSend.ts, line 31: mediaUrl?: string
  No attachment concept, no payload field, no multi-attachment support. Only a single mediaUrl string.

11. Supporting Infrastructure
    Feature hooks:
    File
    /home/ubuntupunk/Projects/soralia-village/src/features/chat/model/useConversationList.ts
    /home/ubuntupunk/Projects/soralia-village/src/features/chat/model/useMessageSend.ts
    /home/ubuntupunk/Projects/soralia-village/src/features/chat/model/useUnreadUrgency.ts
    /home/ubuntupunk/Projects/soralia-village/src/features/chat/ui/CreateConversationModal.tsx
    Shared hook:
    File
    /home/ubuntupunk/Projects/soralia-village/src/shared/lib/hooks/useConversations.ts
    UI Components (entities layer):
    File
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/ChatMessage.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/TypingIndicator.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/OnlineIndicator.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/ParticipantAvatar.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/ParticipantAvatarStack.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/ui/EmojiPickerButton.tsx
    /home/ubuntupunk/Projects/soralia-village/src/entities/chat/model/use-presence.ts
    Directory integration:
    File
    /home/ubuntupunk/Projects/soralia-village/src/features/directory/ui/DirectoryChatModal.tsx
    Sanitization:
    File
    /home/ubuntupunk/Projects/soralia-village/src/shared/lib/sanitize/server.ts
    /home/ubuntupunk/Projects/soralia-village/src/shared/lib/sanitize/index.ts
    Test files:
    File
    /home/ubuntupunk/Projects/soralia-village/src/test/api/messages.test.ts
    /home/ubuntupunk/Projects/soralia-village/src/test/api/conversations-find.test.ts
12. Page Module
    File
    /home/ubuntupunk/Projects/soralia-village/src/page-modules/chat/ui/MessagesPage.tsx
    /home/ubuntupunk/Projects/soralia-village/src/page-modules/chat/index.ts
    Summary of Gaps / Observations
13. No moderation in chat -- no suspension checks, no content filtering, no flagging
14. No server-side search -- only client-side text filtering in MessagesPage
15. No real attachment upload -- images are base64 data URLs, not uploaded to storage
16. No MessagePayload type exists anywhere in the codebase
17. RLS is defined on the models but NOT activated -- chat API routes use direct Drizzle queries, not runWithRLS()
18. Two MessagesWidget implementations exist -- one in widgets/chat/ (uses ParticipantAvatar entity component) and one in widgets/dashboard/ (inline rendering)
19. Supabase Realtime is used in two inconsistent ways: the POST /api/messages handler broadcasts via channel.send() (lines 234-238), while DirectoryChatModal subscribes via postgres_changes (lines 84-104)
20. Constants are in src/entities/chat/model/constants.ts: MAX_MESSAGE_LENGTH = 2000, DEFAULT_MESSAGE_RETENTION_DAYS = 30, TYPING_INDICATOR_TIMEOUT_MS = 2000, MAX_CONVERSATION_NAME_LENGTH = 100
