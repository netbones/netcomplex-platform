# Chat Context

> **Last updated:** 2026-06-01

## Purpose

Real-time messaging with Supabase Realtime. Conversations (direct + group), typing indicators, online presence.

## Directory

`src/entities/chat/`

## Key Models

| Model              | Description                              |
| ------------------ | ---------------------------------------- |
| `Conversation`     | Messaging thread: direct or group        |
| `Message`          | Individual message within a conversation |
| `ConversationType` | `DIRECT`, `GROUP`                        |
| `MessageType`      | Message content type classification      |
| `ChatState`        | Client-side chat state management        |
| `DirectChatState`  | Direct chat specific state               |

## Exports

- Chat types and schemas
- `ChatMessage`, `OnlineIndicator`, `TypingIndicator`, `ParticipantAvatar`, `EmojiPickerButton` UI components

## Dependencies

- **Tenant** — tenant isolation
- **User** — participant references
- **Supabase Realtime** — event-driven message delivery (separate from REST lifecycle)

## API Surface

- REST: `/api/messages/*`, `/api/conversations/*`

## DTOs

- `@shared/api/dto/conversation.ts`
- `@shared/api/dto/message.ts`

## Prisma Models

`Conversation`, `Message`

## Realtime Infrastructure

- `useRealtimeMessages` — subscribes to new messages
- `useTypingIndicator` — tracks who is typing
- `usePresence` — tracks online/offline status

## Open Issues

- [ ] ⏳ Message pruning (30-day retention) planned but not implemented
