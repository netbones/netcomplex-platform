import { describe, it, expect, vi } from 'vitest';

vi.mock('@shared/api/db', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/api/db')>();
  return {
    ...actual,
  };
});

import { announcementSchema } from '@entities/content';
import { validatePriorityForRole, getAllowedPriorities } from '@features/announcements';
import { canPublishAnnouncements } from '@shared/lib';
import { toAnnouncementDTO, toAnnouncementDTOs } from '@shared/api/dto/announcement';

// ─── announcementSchema tests ─────────────────────────────────────────────

describe('announcementSchema', () => {
  describe('valid input', () => {
    it('accepts minimal valid input', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'Author',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('normal');
        expect(result.data.targetFilter).toBe('ALL');
        expect(result.data.targetRoles).toEqual([]);
      }
    });

    it('accepts full valid input with all fields', () => {
      const result = announcementSchema.safeParse({
        title: 'Board Meeting',
        content: 'Monthly board meeting at 7pm.',
        author: 'Board Chair',
        priority: 'high',
        targetFilter: 'OWNERS_ONLY',
        targetRoles: ['BOARD', 'COMMITTEE'],
        resourceId: 'res-123',
        expiresAt: '2026-12-31T23:59:59.000Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('high');
        expect(result.data.targetFilter).toBe('OWNERS_ONLY');
        expect(result.data.targetRoles).toEqual(['BOARD', 'COMMITTEE']);
        expect(result.data.resourceId).toBe('res-123');
        expect(result.data.expiresAt).toBe('2026-12-31T23:59:59.000Z');
      }
    });

    it('accepts all valid priorities', () => {
      for (const priority of ['urgent', 'high', 'normal', 'low'] as const) {
        const result = announcementSchema.safeParse({
          title: 'Test',
          content: 'Content',
          author: 'Author',
          priority,
        });
        expect(result.success).toBe(true);
      }
    });

    it('accepts all valid targetFilter values', () => {
      for (const targetFilter of ['ALL', 'OWNERS_ONLY', 'RENTERS_ONLY'] as const) {
        const result = announcementSchema.safeParse({
          title: 'Test',
          content: 'Content',
          author: 'Author',
          targetFilter,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('invalid input', () => {
    it('rejects empty title', () => {
      const result = announcementSchema.safeParse({
        title: '',
        content: 'Content',
        author: 'Author',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty content', () => {
      const result = announcementSchema.safeParse({
        title: 'Title',
        content: '',
        author: 'Author',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty author', () => {
      const result = announcementSchema.safeParse({
        title: 'Title',
        content: 'Content',
        author: '',
      });
      expect(result.success).toBe(false);
    });

    it('trim transforms whitespace-only title to empty string', () => {
      const result = announcementSchema.safeParse({
        title: '   ',
        content: 'Content',
        author: 'Author',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe('');
      }
    });

    it('rejects invalid priority enum value', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'Author',
        priority: 'CRITICAL',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid targetFilter enum value', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'Author',
        targetFilter: 'MANAGERS_ONLY',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid targetRoles values', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'Author',
        targetRoles: ['SUPER_ADMIN'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const result = announcementSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('boundary values', () => {
    it('rejects title exceeding 200 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'A'.repeat(201),
        content: 'Content',
        author: 'Author',
      });
      expect(result.success).toBe(false);
    });

    it('accepts title exactly at 200 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'A'.repeat(200),
        content: 'Content',
        author: 'Author',
      });
      expect(result.success).toBe(true);
    });

    it('rejects content exceeding 5000 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'X'.repeat(5001),
        author: 'Author',
      });
      expect(result.success).toBe(false);
    });

    it('accepts content exactly at 5000 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'X'.repeat(5000),
        author: 'Author',
      });
      expect(result.success).toBe(true);
    });

    it('rejects author exceeding 100 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'N'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts author exactly at 100 characters', () => {
      const result = announcementSchema.safeParse({
        title: 'Test',
        content: 'Content',
        author: 'N'.repeat(100),
      });
      expect(result.success).toBe(true);
    });
  });
});

// ─── validatePriorityForRole tests ─────────────────────────────────────────

describe('validatePriorityForRole', () => {
  it('ADMIN can assign any priority', () => {
    expect(validatePriorityForRole('urgent', 'ADMIN')).toBe('urgent');
    expect(validatePriorityForRole('high', 'ADMIN')).toBe('high');
    expect(validatePriorityForRole('normal', 'ADMIN')).toBe('normal');
    expect(validatePriorityForRole('low', 'ADMIN')).toBe('low');
  });

  it('BOARD can assign any priority', () => {
    expect(validatePriorityForRole('urgent', 'BOARD')).toBe('urgent');
    expect(validatePriorityForRole('high', 'BOARD')).toBe('high');
  });

  it('COMMITTEE is downgraded from urgent to high', () => {
    expect(validatePriorityForRole('urgent', 'COMMITTEE')).toBe('high');
  });

  it('COMMITTEE can assign high and below', () => {
    expect(validatePriorityForRole('high', 'COMMITTEE')).toBe('high');
    expect(validatePriorityForRole('normal', 'COMMITTEE')).toBe('normal');
    expect(validatePriorityForRole('low', 'COMMITTEE')).toBe('low');
  });

  it('MANAGER is downgraded from urgent to normal', () => {
    expect(validatePriorityForRole('urgent', 'MANAGER')).toBe('normal');
  });

  it('MANAGER is downgraded from high to normal', () => {
    expect(validatePriorityForRole('high', 'MANAGER')).toBe('normal');
  });

  it('MANAGER can assign normal and low', () => {
    expect(validatePriorityForRole('normal', 'MANAGER')).toBe('normal');
    expect(validatePriorityForRole('low', 'MANAGER')).toBe('low');
  });

  it('RESIDENT defaults to normal max', () => {
    expect(validatePriorityForRole('urgent', 'RESIDENT')).toBe('normal');
    expect(validatePriorityForRole('high', 'RESIDENT')).toBe('normal');
    expect(validatePriorityForRole('normal', 'RESIDENT')).toBe('normal');
    expect(validatePriorityForRole('low', 'RESIDENT')).toBe('low');
  });

  it('unknown role defaults to normal max', () => {
    expect(validatePriorityForRole('urgent', 'UNKNOWN')).toBe('normal');
  });
});

// ─── getAllowedPriorities tests ────────────────────────────────────────────

describe('getAllowedPriorities', () => {
  it('returns all priorities for ADMIN', () => {
    const result = getAllowedPriorities('ADMIN');
    expect(result).toEqual(['low', 'normal', 'high', 'urgent']);
  });

  it('returns all priorities for BOARD', () => {
    const result = getAllowedPriorities('BOARD');
    expect(result).toEqual(['low', 'normal', 'high', 'urgent']);
  });

  it('returns low, normal, high for COMMITTEE', () => {
    const result = getAllowedPriorities('COMMITTEE');
    expect(result).toEqual(['low', 'normal', 'high']);
  });

  it('returns only low and normal for MANAGER', () => {
    const result = getAllowedPriorities('MANAGER');
    expect(result).toEqual(['low', 'normal']);
  });

  it('returns only low and normal for RESIDENT', () => {
    const result = getAllowedPriorities('RESIDENT');
    expect(result).toEqual(['low', 'normal']);
  });

  it('returns only low and normal for unknown role', () => {
    const result = getAllowedPriorities('GUEST');
    expect(result).toEqual(['low', 'normal']);
  });
});

// ─── canPublishAnnouncements tests ─────────────────────────────────────────

describe('canPublishAnnouncements', () => {
  it('returns true for ADMIN', () => {
    expect(canPublishAnnouncements('ADMIN')).toBe(true);
  });

  it('returns true for BOARD', () => {
    expect(canPublishAnnouncements('BOARD')).toBe(true);
  });

  it('returns true for COMMITTEE', () => {
    expect(canPublishAnnouncements('COMMITTEE')).toBe(true);
  });

  it('returns true for MANAGER', () => {
    expect(canPublishAnnouncements('MANAGER')).toBe(true);
  });

  it('returns false for RESIDENT', () => {
    expect(canPublishAnnouncements('RESIDENT')).toBe(false);
  });

  it('returns false for AGENT', () => {
    expect(canPublishAnnouncements('AGENT')).toBe(false);
  });

  it('returns false for ASSOCIATE', () => {
    expect(canPublishAnnouncements('ASSOCIATE')).toBe(false);
  });

  it('returns false for GROUP_ADMIN', () => {
    expect(canPublishAnnouncements('GROUP_ADMIN')).toBe(false);
  });

  it('returns false for null', () => {
    expect(canPublishAnnouncements(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(canPublishAnnouncements(undefined)).toBe(false);
  });
});

// ─── toAnnouncementDTO / toAnnouncementDTOs tests ──────────────────────────

describe('toAnnouncementDTO', () => {
  const now = new Date('2026-06-13T10:00:00.000Z');

  const mockRow = {
    id: 'ann-1',
    tenantId: 'tenant-1',
    title: 'Test Announcement',
    content: 'Full content here.',
    author: 'Board Chair',
    priority: 'high',
    targetFilter: 'OWNERS_ONLY',
    targetRoles: ['BOARD', 'COMMITTEE'] as string[],
    resourceId: 'res-456',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date('2026-12-31T23:59:59.000Z'),
  };

  it('maps all fields correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = toAnnouncementDTO(mockRow as any);

    expect(dto.id).toBe('ann-1');
    expect(dto.title).toBe('Test Announcement');
    expect(dto.content).toBe('Full content here.');
    expect(dto.author).toBe('Board Chair');
    expect(dto.priority).toBe('high');
    expect(dto.targetFilter).toBe('OWNERS_ONLY');
    expect(dto.targetRoles).toEqual(['BOARD', 'COMMITTEE']);
    expect(dto.resourceId).toBe('res-456');
    expect(dto.createdAt).toBe('2026-06-13T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-06-13T10:00:00.000Z');
    expect(dto.expiresAt).toBe('2026-12-31T23:59:59.000Z');
  });

  it('handles null resourceId', () => {
    const row = { ...mockRow, resourceId: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = toAnnouncementDTO(row as any);
    expect(dto.resourceId).toBeNull();
  });

  it('handles null expiresAt', () => {
    const row = { ...mockRow, expiresAt: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = toAnnouncementDTO(row as any);
    expect(dto.expiresAt).toBeNull();
  });

  it('handles missing targetRoles as empty array', () => {
    const row = { ...mockRow, targetRoles: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = toAnnouncementDTO(row as any);
    expect(dto.targetRoles).toEqual([]);
  });

  it('handles undefined targetRoles as empty array', () => {
    const row = { ...mockRow, targetRoles: undefined };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dto = toAnnouncementDTO(row as any);
    expect(dto.targetRoles).toEqual([]);
  });
});

describe('toAnnouncementDTOs', () => {
  const now = new Date('2026-06-13T10:00:00.000Z');

  it('maps an array of rows', () => {
    const rows = [
      {
        id: 'ann-1',
        tenantId: 'tenant-1',
        title: 'First',
        content: 'Content A',
        author: 'Author A',
        priority: 'normal',
        targetFilter: 'ALL',
        targetRoles: [],
        resourceId: null,
        createdAt: now,
        updatedAt: now,
        expiresAt: null,
      },
      {
        id: 'ann-2',
        tenantId: 'tenant-1',
        title: 'Second',
        content: 'Content B',
        author: 'Author B',
        priority: 'urgent',
        targetFilter: 'OWNERS_ONLY',
        targetRoles: ['BOARD'],
        resourceId: 'res-1',
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      },
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dtos = toAnnouncementDTOs(rows as any);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].title).toBe('First');
    expect(dtos[1].title).toBe('Second');
    expect(dtos[1].priority).toBe('urgent');
  });

  it('returns empty array for empty input', () => {
    const dtos = toAnnouncementDTOs([]);
    expect(dtos).toEqual([]);
  });
});
