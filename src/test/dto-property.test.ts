import { describe, it, expect } from 'vitest';
import {
  toPropertyDTO,
  toPropertyDTOs,
  toPropertySummaryDTO,
  PropertyDTO,
  PropertySummaryDTO,
} from '@shared/api/dto/property';

function makeMockRow(
  overrides: Partial<{
    id: string;
    tenantId: string;
    platformAddress: string;
    street: string;
    unit: string;
    ownerId: string | null;
    homeImage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
): {
  id: string;
  tenantId: string;
  platformAddress: string;
  street: string;
  unit: string;
  ownerId: string | null;
  homeImage: string | null;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: 'prop-1',
    tenantId: 'tenant-1',
    platformAddress: '123-main-st@soralia.org',
    street: '123 Main St',
    unit: 'A1',
    ownerId: 'owner-1',
    homeImage: 'https://example.com/img.jpg',
    createdAt: new Date('2026-01-15T10:30:00.000Z'),
    updatedAt: new Date('2026-06-01T14:00:00.000Z'),
    ...overrides,
  };
}

describe('toPropertyDTO', () => {
  it('maps a complete Drizzle row to PropertyDTO', () => {
    const row = makeMockRow();
    const result = toPropertyDTO(row);

    expect(result).toEqual({
      id: 'prop-1',
      street: '123 Main St',
      unit: 'A1',
      platformAddress: '123-main-st@soralia.org',
      homeImage: 'https://example.com/img.jpg',
      ownerId: 'owner-1',
      createdAt: '2026-01-15T10:30:00.000Z',
      updatedAt: '2026-06-01T14:00:00.000Z',
    });
  });

  it('coerces null homeImage to null (not undefined)', () => {
    const row = makeMockRow({ homeImage: null });
    const result = toPropertyDTO(row);

    expect(result.homeImage).toBeNull();
    expect(result).toHaveProperty('homeImage', null);
  });

  it('coerces null ownerId to null', () => {
    const row = makeMockRow({ ownerId: null });
    const result = toPropertyDTO(row);

    expect(result.ownerId).toBeNull();
  });

  it('converts Date fields to ISO strings', () => {
    const row = makeMockRow({
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-12-31T23:59:59.999Z'),
    });
    const result = toPropertyDTO(row);

    expect(result.createdAt).toBe('2025-01-01T00:00:00.000Z');
    expect(result.updatedAt).toBe('2025-12-31T23:59:59.999Z');
  });

  it('falls back to current timestamp when createdAt is nullish', () => {
    const before = new Date();
    const row = makeMockRow({ createdAt: null as unknown as Date });
    const result = toPropertyDTO(row);

    const parsed = new Date(result.createdAt);
    expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(parsed.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('falls back to current timestamp when updatedAt is nullish', () => {
    const before = new Date();
    const row = makeMockRow({ updatedAt: null as unknown as Date });
    const result = toPropertyDTO(row);

    const parsed = new Date(result.updatedAt);
    expect(parsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(parsed.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('handles empty string homeImage by returning null', () => {
    const row = makeMockRow({ homeImage: '' });
    const result = toPropertyDTO(row);

    // '' || null evaluates to null
    expect(result.homeImage).toBeNull();
  });
});

describe('toPropertyDTOs', () => {
  it('maps an array of rows to PropertyDTO[]', () => {
    const rows = [
      makeMockRow({ id: 'prop-1', street: '123 Main St' }),
      makeMockRow({ id: 'prop-2', street: '456 Oak Ave' }),
    ];
    const result = toPropertyDTOs(rows);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('prop-1');
    expect(result[1].id).toBe('prop-2');
  });

  it('returns empty array for empty input', () => {
    const result = toPropertyDTOs([]);
    expect(result).toEqual([]);
  });

  it('preserves all properties across array items', () => {
    const rows = [
      makeMockRow({ id: 'p1', platformAddress: 'addr1@soralia.org' }),
      makeMockRow({ id: 'p2', platformAddress: 'addr2@soralia.org' }),
    ];
    const result = toPropertyDTOs(rows);

    expect(result[0].platformAddress).toBe('addr1@soralia.org');
    expect(result[1].platformAddress).toBe('addr2@soralia.org');
  });
});

describe('toPropertySummaryDTO', () => {
  it('extracts summary fields: id, street, unit, platformAddress, homeImage', () => {
    const row = makeMockRow();
    const result = toPropertySummaryDTO(row);

    expect(result).toEqual({
      id: 'prop-1',
      street: '123 Main St',
      unit: 'A1',
      platformAddress: '123-main-st@soralia.org',
      homeImage: 'https://example.com/img.jpg',
    });
  });

  it('omits ownerId, createdAt, and updatedAt', () => {
    const row = makeMockRow();
    const result = toPropertySummaryDTO(row);

    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
  });

  it('coerces null homeImage to null', () => {
    const row = makeMockRow({ homeImage: null });
    const result = toPropertySummaryDTO(row);

    expect(result.homeImage).toBeNull();
  });

  it('handles empty string homeImage as null', () => {
    const row = makeMockRow({ homeImage: '' });
    const result = toPropertySummaryDTO(row);

    expect(result.homeImage).toBeNull();
  });

  it('returns PropertySummaryDTO type-compatible shape', () => {
    const row = makeMockRow();
    const result: PropertySummaryDTO = toPropertySummaryDTO(row);

    expect(typeof result.id).toBe('string');
    expect(typeof result.street).toBe('string');
    expect(typeof result.unit).toBe('string');
    expect(typeof result.platformAddress).toBe('string');
  });
});
