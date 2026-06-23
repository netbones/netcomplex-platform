import { describe, it, expect } from 'vitest';
import { eventSchema, adminEventSchema } from '../entities/event/schema';
import { canManageEvents } from '../entities/event/permissions';
import { validateEventFields } from '../entities/event/services';

function futureDate(hours = 24): string {
  const d = new Date(Date.now() + hours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pastDate(): string {
  const d = new Date(Date.now() - 86400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const validEventData = {
  title: 'Community BBQ',
  startDate: futureDate(24),
  endDate: futureDate(48),
};

describe('eventSchema', () => {
  it('accepts valid event data', () => {
    const result = eventSchema.safeParse(validEventData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Community BBQ');
      expect(result.data.description).toBe('');
      expect(result.data.location).toBe('');
      expect(result.data.requiresRegistration).toBe(false);
    }
  });

  it('accepts valid data with optional fields', () => {
    const data = {
      title: 'Pool Party',
      description: 'Come swim!',
      startDate: futureDate(24),
      endDate: futureDate(48),
      location: 'Main Pool',
      maxAttendees: 50,
      requiresRegistration: true,
    };
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxAttendees).toBe(50);
      expect(result.data.requiresRegistration).toBe(true);
    }
  });

  it('rejects missing title', () => {
    const data = { ...validEventData };
    delete (data as Record<string, unknown>).title;
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('title'))).toBe(true);
    }
  });

  it('rejects missing startDate', () => {
    const data = { ...validEventData };
    delete (data as Record<string, unknown>).startDate;
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('startDate'))).toBe(true);
    }
  });

  it('rejects missing endDate', () => {
    const data = { ...validEventData };
    delete (data as Record<string, unknown>).endDate;
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid startDate format', () => {
    const data = { ...validEventData, startDate: '2026/06/15 10:00' };
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('startDate'))).toBe(true);
    }
  });

  it('rejects invalid endDate format', () => {
    const data = { ...validEventData, endDate: '06-15-2026' };
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('endDate'))).toBe(true);
    }
  });

  it('rejects endDate before startDate', () => {
    const data = {
      ...validEventData,
      startDate: futureDate(48),
      endDate: futureDate(24),
    };
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          i => i.path.includes('endDate') && i.message.includes('after start')
        )
      ).toBe(true);
    }
  });

  it('rejects startDate in the past', () => {
    const data = {
      title: 'Past Event',
      startDate: pastDate(),
      endDate: futureDate(24),
    };
    const result = eventSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(i => i.path.includes('startDate') && i.message.includes('past'))
      ).toBe(true);
    }
  });

  it('applies defaults for optional fields', () => {
    const result = eventSchema.safeParse(validEventData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
      expect(result.data.location).toBe('');
      expect(result.data.requiresRegistration).toBe(false);
    }
  });
});

describe('adminEventSchema', () => {
  it('accepts valid admin event data', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      isPublic: false,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts valid admin event with image URL', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      image: 'https://example.com/photo.jpg',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts empty string for image', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      image: '',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing title', () => {
    const data = {
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const data = {
      title: 'Board Meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing date', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      location: 'Conference Room',
      organizer: 'Board Chair',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing location', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      organizer: 'Board Chair',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing organizer', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: '2026/06/15 10:00',
      location: 'Conference Room',
      organizer: 'Board Chair',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects invalid image URL', () => {
    const data = {
      title: 'Board Meeting',
      description: 'Monthly board meeting',
      date: futureDate(48),
      location: 'Conference Room',
      organizer: 'Board Chair',
      image: 'not-a-url',
      isPublic: true,
    };
    const result = adminEventSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('canManageEvents', () => {
  it('returns true for ADMIN', () => {
    expect(canManageEvents('ADMIN')).toBe(true);
  });

  it('returns true for RESIDENT', () => {
    expect(canManageEvents('RESIDENT')).toBe(true);
  });

  it('returns true for BOARD', () => {
    expect(canManageEvents('BOARD')).toBe(true);
  });

  it('returns false for AGENT', () => {
    expect(canManageEvents('AGENT')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(canManageEvents('')).toBe(false);
  });

  it('returns false for invalid role', () => {
    expect(canManageEvents('INVALID_ROLE' as string)).toBe(false);
  });
});

describe('validateEventFields', () => {
  const validBody: Record<string, unknown> = {
    title: 'Summer Fest',
    description: 'A fun summer event',
    date: '2026-07-15T10:00',
    location: 'Courtyard',
    organizer: 'Social Committee',
  };

  it('returns valid for all required fields present', () => {
    const result = validateEventFields(validBody);
    expect(result.valid).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('returns invalid with missing details when title is empty', () => {
    const body = { ...validBody, title: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('title');
  });

  it('returns invalid when description is empty', () => {
    const body = { ...validBody, description: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('description');
  });

  it('returns invalid when date is empty', () => {
    const body = { ...validBody, date: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('date');
  });

  it('returns invalid when location is empty', () => {
    const body = { ...validBody, location: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('location');
  });

  it('returns invalid when organizer is empty', () => {
    const body = { ...validBody, organizer: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('organizer');
  });

  it('returns invalid with multiple missing fields', () => {
    const body = { ...validBody, title: '', description: '', organizer: '' };
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(expect.arrayContaining(['title', 'description', 'organizer']));
  });

  it('returns valid with extra fields present', () => {
    const body = { ...validBody, extraField: 'ignored', anotherField: 42 };
    const result = validateEventFields(body);
    expect(result.valid).toBe(true);
    expect(result.missing).toBeUndefined();
  });

  it('returns invalid for completely empty body', () => {
    const result = validateEventFields({});
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(5);
    expect(result.missing).toEqual(
      expect.arrayContaining(['title', 'description', 'date', 'location', 'organizer'])
    );
  });

  it('returns invalid when required field is missing entirely', () => {
    const body = { ...validBody };
    delete (body as Record<string, unknown>).title;
    const result = validateEventFields(body);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('title');
  });
});
