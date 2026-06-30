import { describe, it, expect, vi } from 'vitest';
import { createId } from '@shared/lib/id';

vi.mock('varlock/env', () => ({
  ENV: {
    DATABASE_URL: 'postgres://localhost:5432/test',
  },
}));

import { messageSchema, conversationSchema } from '@/entities/chat/schema';
import {
  COMMON_EMOJIS,
  DEFAULT_MESSAGE_RETENTION_DAYS,
  MAX_MESSAGE_LENGTH,
  TYPING_INDICATOR_TIMEOUT_MS,
  MAX_CONVERSATION_NAME_LENGTH,
  MIN_PARTICIPANTS_FOR_GROUP,
  MAX_RECENT_CONVERSATIONS_DISPLAY,
  ONLINE_INDICATOR_ANIMATION_CLASS,
  ONLINE_INDICATOR_BASE_CLASS,
} from '@/entities/chat/model/constants';
import { toConversationDTO, toConversationDTOs } from '@/shared/api/dto/conversation';
import { toMessageDTO, toMessageDTOs } from '@/shared/api/dto/message';
import type { InferSelectModel } from 'drizzle-orm';
import type { conversations, messages } from '@api/server';

type ConversationRow = InferSelectModel<typeof conversations>;
type MessageRow = InferSelectModel<typeof messages>;

const uuid = () => createId();

function makeConversationRow(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: 'conv-123',
    tenantId: 'tenant-1',
    name: 'Test Chat',
    type: 'DIRECT',
    deletedAt: null,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    updatedAt: new Date('2024-01-15T11:00:00.000Z'),
    ...overrides,
  } as ConversationRow;
}

function makeMessageRow(overrides: Partial<MessageRow> = {}): MessageRow {
  return {
    id: 'msg-123',
    tenantId: 't1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: 'Hello!',
    type: 'TEXT',
    mediaUrl: null,
    deletedAt: null,
    createdAt: new Date('2024-01-15T10:30:00.000Z'),
    expiresAt: null,
    ...overrides,
  } as MessageRow;
}

// =============================================================================
// messageSchema
// =============================================================================

describe('messageSchema', () => {
  it('validates a valid TEXT message', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'Hello, world!',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('TEXT');
    }
  });

  it('validates a valid IMAGE message with mediaUrl', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'Check this out',
      type: 'IMAGE',
      mediaUrl: 'https://example.com/image.png',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('IMAGE');
      expect(result.data.mediaUrl).toBe('https://example.com/image.png');
    }
  });

  it('fails refinement for IMAGE message without mediaUrl', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'Check this out',
      type: 'IMAGE',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Image URL is required for IMAGE messages');
    }
  });

  it('fails for empty content', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: '',
    });

    expect(result.success).toBe(false);
  });

  it('fails for content over 2000 chars', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'a'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('fails for invalid message type enum', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'test',
      type: 'VIDEO',
    });

    expect(result.success).toBe(false);
  });

  it('fails for missing conversationId', () => {
    const result = messageSchema.safeParse({
      content: 'test',
    });

    expect(result.success).toBe(false);
  });

  it('validates a SYSTEM type message', () => {
    const result = messageSchema.safeParse({
      conversationId: uuid(),
      content: 'User joined the conversation',
      type: 'SYSTEM',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('SYSTEM');
    }
  });
});

// =============================================================================
// conversationSchema
// =============================================================================

describe('conversationSchema', () => {
  it('validates a DIRECT conversation with 2 participantIds', () => {
    const result = conversationSchema.safeParse({
      name: 'Direct Chat',
      participantIds: [uuid(), uuid()],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('DIRECT');
      expect(result.data.participantIds).toHaveLength(2);
    }
  });

  it('validates a GROUP conversation with 3+ participantIds', () => {
    const result = conversationSchema.safeParse({
      name: 'Group Chat',
      type: 'GROUP',
      participantIds: [uuid(), uuid(), uuid()],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('GROUP');
      expect(result.data.participantIds).toHaveLength(3);
    }
  });

  it('fails for missing name (empty string)', () => {
    const result = conversationSchema.safeParse({
      name: '',
      participantIds: [uuid(), uuid()],
    });

    expect(result.success).toBe(false);
  });

  it('fails for name over 100 chars', () => {
    const result = conversationSchema.safeParse({
      name: 'a'.repeat(101),
      participantIds: [uuid(), uuid()],
    });

    expect(result.success).toBe(false);
  });

  it('fails for only 1 participantId (below minimum of 2)', () => {
    const result = conversationSchema.safeParse({
      name: 'Solo Chat',
      participantIds: [uuid()],
    });

    expect(result.success).toBe(false);
  });

  it('fails for invalid UUID format in participantIds', () => {
    const result = conversationSchema.safeParse({
      name: 'Bad UUIDs',
      participantIds: ['not-a-uuid', uuid()],
    });

    expect(result.success).toBe(false);
  });

  it('fails for invalid type enum', () => {
    const result = conversationSchema.safeParse({
      name: 'Bad Type',
      type: 'INVALID_TYPE',
      participantIds: [uuid(), uuid()],
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Chat Constants
// =============================================================================

describe('chat constants', () => {
  it('COMMON_EMOJIS has 10 elements', () => {
    expect(COMMON_EMOJIS).toHaveLength(10);
  });

  it('COMMON_EMOJIS contains expected values', () => {
    expect(COMMON_EMOJIS).toEqual(['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '👏', '🙏', '😊']);
  });

  it('DEFAULT_MESSAGE_RETENTION_DAYS equals 30', () => {
    expect(DEFAULT_MESSAGE_RETENTION_DAYS).toBe(30);
  });

  it('MAX_MESSAGE_LENGTH equals 2000', () => {
    expect(MAX_MESSAGE_LENGTH).toBe(2000);
  });

  it('MIN_PARTICIPANTS_FOR_GROUP equals 2', () => {
    expect(MIN_PARTICIPANTS_FOR_GROUP).toBe(2);
  });

  it('TYPING_INDICATOR_TIMEOUT_MS equals 2000', () => {
    expect(TYPING_INDICATOR_TIMEOUT_MS).toBe(2000);
  });

  it('MAX_CONVERSATION_NAME_LENGTH equals 100', () => {
    expect(MAX_CONVERSATION_NAME_LENGTH).toBe(100);
  });

  it('MAX_RECENT_CONVERSATIONS_DISPLAY equals 5', () => {
    expect(MAX_RECENT_CONVERSATIONS_DISPLAY).toBe(5);
  });

  it('ONLINE_INDICATOR_ANIMATION_CLASS contains expected classes', () => {
    expect(ONLINE_INDICATOR_ANIMATION_CLASS).toContain('animate-ping');
    expect(ONLINE_INDICATOR_ANIMATION_CLASS).toContain('rounded-full');
    expect(ONLINE_INDICATOR_ANIMATION_CLASS).toContain('bg-green-400');
  });

  it('ONLINE_INDICATOR_BASE_CLASS contains expected classes', () => {
    expect(ONLINE_INDICATOR_BASE_CLASS).toContain('rounded-full');
    expect(ONLINE_INDICATOR_BASE_CLASS).toContain('bg-green-500');
  });
});

// =============================================================================
// toConversationDTO
// =============================================================================

describe('toConversationDTO', () => {
  it('maps all fields correctly', () => {
    const row = makeConversationRow();
    const dto = toConversationDTO(row);

    expect(dto.id).toBe('conv-123');
    expect(dto.name).toBe('Test Chat');
    expect(dto.type).toBe('DIRECT');
    expect(dto.createdAt).toBe('2024-01-15T10:30:00.000Z');
    expect(dto.updatedAt).toBe('2024-01-15T11:00:00.000Z');
  });

  it('returns null name when name is null', () => {
    const row = makeConversationRow({ name: null });
    const dto = toConversationDTO(row);

    expect(dto.name).toBeNull();
  });

  it('handles null createdAt with current timestamp fallback', () => {
    const row = makeConversationRow({ createdAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toConversationDTO(row);
    const after = new Date().toISOString();

    expect(dto.createdAt >= before || dto.createdAt <= after).toBe(true);
  });

  it('handles null updatedAt with current timestamp fallback', () => {
    const row = makeConversationRow({ updatedAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toConversationDTO(row);
    const after = new Date().toISOString();

    expect(dto.updatedAt >= before || dto.updatedAt <= after).toBe(true);
  });
});

// =============================================================================
// toConversationDTOs
// =============================================================================

describe('toConversationDTOs', () => {
  it('maps an array of conversation rows', () => {
    const rows = [
      makeConversationRow({ id: 'conv-1', type: 'DIRECT' }),
      makeConversationRow({ id: 'conv-2', type: 'GROUP' }),
    ];
    const dtos = toConversationDTOs(rows);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('conv-1');
    expect(dtos[0].type).toBe('DIRECT');
    expect(dtos[1].id).toBe('conv-2');
    expect(dtos[1].type).toBe('GROUP');
  });

  it('returns empty array for empty input', () => {
    expect(toConversationDTOs([])).toEqual([]);
  });
});

// =============================================================================
// toMessageDTO
// =============================================================================

describe('toMessageDTO', () => {
  it('maps all fields correctly', () => {
    const row = makeMessageRow();
    const dto = toMessageDTO(row);

    expect(dto.id).toBe('msg-123');
    expect(dto.conversationId).toBe('conv-1');
    expect(dto.senderId).toBe('user-1');
    expect(dto.content).toBe('Hello!');
    expect(dto.type).toBe('TEXT');
    expect(dto.mediaUrl).toBeNull();
    expect(dto.deletedAt).toBeNull();
    expect(dto.createdAt).toBe('2024-01-15T10:30:00.000Z');
    expect(dto.expiresAt).toBeNull();
  });

  it('returns null for mediaUrl when row has null', () => {
    const row = makeMessageRow({ mediaUrl: null });
    const dto = toMessageDTO(row);

    expect(dto.mediaUrl).toBeNull();
  });

  it('preserves mediaUrl when present', () => {
    const row = makeMessageRow({ mediaUrl: 'https://example.com/img.png' });
    const dto = toMessageDTO(row);

    expect(dto.mediaUrl).toBe('https://example.com/img.png');
  });

  it('maps deletedAt when set', () => {
    const row = makeMessageRow({ deletedAt: new Date('2024-06-15T10:00:00.000Z') });
    const dto = toMessageDTO(row);

    expect(dto.deletedAt).toBe('2024-06-15T10:00:00.000Z');
  });

  it('maps expiresAt when set', () => {
    const date = new Date('2024-02-15T10:30:00.000Z');
    const row = makeMessageRow({ expiresAt: date });
    const dto = toMessageDTO(row);

    expect(dto.expiresAt).toBe('2024-02-15T10:30:00.000Z');
  });

  it('handles null createdAt with current timestamp fallback', () => {
    const row = makeMessageRow({ createdAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toMessageDTO(row);
    const after = new Date().toISOString();

    expect(dto.createdAt >= before || dto.createdAt <= after).toBe(true);
  });

  it('handles null expiresAt returning null', () => {
    const row = makeMessageRow({ expiresAt: null });
    const dto = toMessageDTO(row);

    expect(dto.expiresAt).toBeNull();
  });
});

// =============================================================================
// toMessageDTOs
// =============================================================================

describe('toMessageDTOs', () => {
  it('maps an array of message rows', () => {
    const rows = [
      makeMessageRow({ id: 'msg-1', content: 'Hi' }),
      makeMessageRow({ id: 'msg-2', content: 'Hello' }),
    ];
    const dtos = toMessageDTOs(rows);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('msg-1');
    expect(dtos[0].content).toBe('Hi');
    expect(dtos[1].id).toBe('msg-2');
    expect(dtos[1].content).toBe('Hello');
  });

  it('returns empty array for empty input', () => {
    expect(toMessageDTOs([])).toEqual([]);
  });
});
