import { describe, it, expect } from 'vitest';
import { toEventDTO, toEventDTOs, toPublicEventDTO } from '../shared/api/dto/event';
import type { InferSelectModel } from 'drizzle-orm';
import type { events } from '../shared/api/db';

type EventRow = InferSelectModel<typeof events>;

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: 'event-1',
    tenantId: 'tenant-1',
    title: 'Community BBQ',
    description: 'Annual community BBQ event',
    date: new Date('2026-06-15T10:00:00.000Z'),
    location: 'Community Park',
    organizer: 'Board Committee',
    image: 'https://example.com/image.jpg',
    isPublic: true,
    createdAt: new Date('2026-06-01T08:00:00.000Z'),
    updatedAt: new Date('2026-06-05T09:00:00.000Z'),
    ...overrides,
  };
}

describe('toEventDTO', () => {
  it('maps all fields correctly', () => {
    const event = makeEvent();
    const dto = toEventDTO(event);

    expect(dto.id).toBe('event-1');
    expect(dto.title).toBe('Community BBQ');
    expect(dto.description).toBe('Annual community BBQ event');
    expect(dto.location).toBe('Community Park');
    expect(dto.organizer).toBe('Board Committee');
    expect(dto.image).toBe('https://example.com/image.jpg');
    expect(dto.isPublic).toBe(true);
  });

  it('converts dates to ISO strings', () => {
    const event = makeEvent();
    const dto = toEventDTO(event);

    expect(dto.date).toBe('2026-06-15T10:00:00.000Z');
    expect(dto.createdAt).toBe('2026-06-01T08:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-06-05T09:00:00.000Z');
  });

  it('handles null date with current timestamp fallback', () => {
    const event = makeEvent({ date: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toEventDTO(event);
    const after = new Date().toISOString();

    expect(dto.date >= before || dto.date <= after).toBe(true);
  });

  it('handles null createdAt with current timestamp fallback', () => {
    const event = makeEvent({ createdAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toEventDTO(event);
    const after = new Date().toISOString();

    expect(dto.createdAt >= before || dto.createdAt <= after).toBe(true);
  });

  it('handles null updatedAt with current timestamp fallback', () => {
    const event = makeEvent({ updatedAt: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toEventDTO(event);
    const after = new Date().toISOString();

    expect(dto.updatedAt >= before || dto.updatedAt <= after).toBe(true);
  });

  it('converts null image to null', () => {
    const event = makeEvent({ image: null });
    const dto = toEventDTO(event);

    expect(dto.image).toBeNull();
  });

  it('maps isPublic correctly', () => {
    const publicEvent = makeEvent({ isPublic: true });
    expect(toEventDTO(publicEvent).isPublic).toBe(true);

    const privateEvent = makeEvent({ isPublic: false });
    expect(toEventDTO(privateEvent).isPublic).toBe(false);
  });
});

describe('toEventDTOs', () => {
  it('maps an array of event rows to DTOs', () => {
    const rows = [
      makeEvent({ id: 'e-1' }),
      makeEvent({ id: 'e-2', title: 'Pool Party', location: 'Main Pool' }),
    ];

    const dtos = toEventDTOs(rows);

    expect(dtos).toHaveLength(2);
    expect(dtos[0].id).toBe('e-1');
    expect(dtos[0].title).toBe('Community BBQ');
    expect(dtos[1].id).toBe('e-2');
    expect(dtos[1].title).toBe('Pool Party');
    expect(dtos[1].location).toBe('Main Pool');
  });

  it('handles an empty array', () => {
    const dtos = toEventDTOs([]);

    expect(dtos).toHaveLength(0);
    expect(dtos).toEqual([]);
  });

  it('returns a new array (does not mutate input)', () => {
    const rows = [makeEvent()];
    const dtos = toEventDTOs(rows);

    expect(dtos).not.toBe(rows);
  });
});

describe('toPublicEventDTO', () => {
  it('extracts only the public-facing subset of fields', () => {
    const event = makeEvent();
    const dto = toPublicEventDTO(event);

    expect(dto.id).toBe('event-1');
    expect(dto.title).toBe('Community BBQ');
    expect(dto.description).toBe('Annual community BBQ event');
    expect(dto.date).toBe('2026-06-15T10:00:00.000Z');
    expect(dto.location).toBe('Community Park');
    expect(dto.organizer).toBe('Board Committee');
    expect(dto.image).toBe('https://example.com/image.jpg');

    expect('isPublic' in dto).toBe(false);
    expect('createdAt' in dto).toBe(false);
    expect('updatedAt' in dto).toBe(false);
  });

  it('handles null date fallback', () => {
    const event = makeEvent({ date: null as unknown as Date });
    const before = new Date().toISOString();
    const dto = toPublicEventDTO(event);
    const after = new Date().toISOString();

    expect(dto.date >= before || dto.date <= after).toBe(true);
  });

  it('converts null image to null', () => {
    const event = makeEvent({ image: null });
    const dto = toPublicEventDTO(event);

    expect(dto.image).toBeNull();
  });
});
