import { describe, it, expect } from 'vitest';
import { commentDto, commentDetailDto } from '@api/server';

describe('commentDto allowlist', () => {
  const baseComment = {
    id: 'cm-001',
    contentId: 'cnt-001',
    authorId: 'usr-001',
    parentId: null,
    rootId: null,
    body: 'Great post!',
    status: 'PUBLISHED',
    score: 5,
    upvotes: 3,
    downvotes: 1,
    createdAt: new Date('2026-07-26T10:00:00Z'),
    updatedAt: new Date('2026-07-26T10:00:00Z'),
    editedAt: null,
    deletedAt: null,
  };

  it('strips tenantId from output', () => {
    const input = { ...baseComment, tenantId: 'tn-001' };
    const result = commentDto.parse(input);
    expect(result).not.toHaveProperty('tenantId');
  });

  it('strips moderatedBy/moderatedAt/moderationNotes from output', () => {
    const input = {
      ...baseComment,
      moderatedBy: 'admin-001',
      moderatedAt: new Date('2026-07-26T11:00:00Z'),
      moderationNotes: 'Spam',
    };
    const result = commentDto.parse(input);
    expect(result).not.toHaveProperty('moderatedBy');
    expect(result).not.toHaveProperty('moderatedAt');
    expect(result).not.toHaveProperty('moderationNotes');
  });

  it('allows only id/name/avatar/profileSlug for author', () => {
    const input = {
      ...baseComment,
      author: {
        id: 'usr-001',
        name: 'Anna',
        avatar: 'https://example.com/avatar.jpg',
        profileSlug: 'anna-p',
        email: 'anna@example.com',
        role: 'RESIDENT',
        tenantId: 'tn-001',
      },
    };
    const result = commentDetailDto.parse(input);
    expect(result.author).toEqual({
      id: 'usr-001',
      name: 'Anna',
      avatar: 'https://example.com/avatar.jpg',
      profileSlug: 'anna-p',
    });
    expect(result.author).not.toHaveProperty('email');
    expect(result.author).not.toHaveProperty('role');
    expect(result.author).not.toHaveProperty('tenantId');
  });

  it('transforms dates to ISO strings', () => {
    const input = { ...baseComment, createdAt: new Date('2026-07-26T10:00:00Z') };
    const result = commentDto.parse(input);
    expect(typeof result.createdAt).toBe('string');
    expect(result.createdAt).toBe('2026-07-26T10:00:00.000Z');
  });

  it('rejects body longer than 5000 chars', async () => {
    const { createCommentSchema } = await import('../schema');
    const result = createCommentSchema.safeParse({
      contentId: 'cnt-001',
      body: 'x'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid vote schema', async () => {
    const { voteSchema } = await import('../schema');
    const result = voteSchema.safeParse({ commentId: 'cm-001', type: 'UPVOTE' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid vote type', async () => {
    const { voteSchema } = await import('../schema');
    const result = voteSchema.safeParse({ commentId: 'cm-001', type: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
