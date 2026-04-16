import { describe, it, expect } from 'vitest';
import {
  contentSchema,
  groupSchema,
  maintenanceRequestSchema,
  bookingSchema,
  userProfileSchema,
} from '@api/schemas';

describe('schemas', () => {
  describe('contentSchema', () => {
    const validContentData = {
      title: { en: 'Test Title' },
      content: { en: 'Test content body' },
      excerpt: { en: 'Short excerpt' },
      category: 'NEWS' as const,
      tags: ['test'],
      featured: false,
      published: true,
      defaultLocale: 'en',
      contentType: 'article' as const,
    };

    it('validates correct content data', () => {
      expect(() => contentSchema.parse(validContentData)).not.toThrow();
    });

    it('requires title in at least one locale', () => {
      const data = {
        ...validContentData,
        title: { en: '' },
      };
      expect(() => contentSchema.parse(data)).toThrow('At least one language must have a title');
    });

    it('requires content in at least one locale', () => {
      const data = {
        ...validContentData,
        content: { en: '' },
      };
      expect(() => contentSchema.parse(data)).toThrow('At least one language must have content');
    });

    it('validates category enum', () => {
      const data = {
        ...validContentData,
        category: 'INVALID' as never,
      };
      expect(() => contentSchema.parse(data)).toThrow();
    });
  });

  describe('groupSchema', () => {
    it('validates correct group data', () => {
      const data = {
        name: 'Test Group',
        description: 'A test group',
        category: 'sports',
        isPublic: true,
      };
      expect(() => groupSchema.parse(data)).not.toThrow();
    });

    it('requires name', () => {
      const data = {
        name: '',
        category: 'sports',
        isPublic: true,
      };
      expect(() => groupSchema.parse(data)).toThrow('Group name is required');
    });

    it('requires category', () => {
      const data = {
        name: 'Test Group',
        category: '',
        isPublic: true,
      };
      expect(() => groupSchema.parse(data)).toThrow('Category is required');
    });

    it('allows empty description', () => {
      const data = {
        name: 'Test Group',
        description: '',
        category: 'sports',
        isPublic: true,
      };
      const result = groupSchema.parse(data);
      expect(result.description).toBe('');
    });
  });

  describe('maintenanceRequestSchema', () => {
    it('validates correct maintenance request', () => {
      const data = {
        category: 'PLUMBING',
        priority: 'HIGH',
        description: 'Leaking tap in bathroom needs urgent attention',
        preferredDate: '2026-04-20',
        preferredTime: '14:00',
      };
      expect(() => maintenanceRequestSchema.parse(data)).not.toThrow();
    });

    it('requires category', () => {
      const data = {
        priority: 'LOW',
        description: 'Some description here for testing',
      };
      expect(() => maintenanceRequestSchema.parse(data)).toThrow();
    });

    it('requires priority', () => {
      const data = {
        category: 'ELECTRICAL',
        description: 'Description of the issue',
      };
      expect(() => maintenanceRequestSchema.parse(data)).toThrow();
    });

    it('requires description minimum 10 characters', () => {
      const data = {
        category: 'PLUMBING',
        priority: 'LOW',
        description: 'Short',
      };
      expect(() => maintenanceRequestSchema.parse(data)).toThrow('at least 10 characters');
    });

    it('allows optional date and time', () => {
      const data = {
        category: 'PLUMBING',
        priority: 'LOW',
        description: 'A valid description here',
      };
      const result = maintenanceRequestSchema.parse(data);
      expect(result.preferredDate).toBeUndefined();
      expect(result.preferredTime).toBeUndefined();
    });
  });

  describe('bookingSchema', () => {
    it('validates correct booking data', () => {
      const data = {
        facility: 'POOL',
        date: '2026-04-20',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Swimming',
      };
      expect(() => bookingSchema.parse(data)).not.toThrow();
    });

    it('requires facility', () => {
      const data = {
        date: '2026-04-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      expect(() => bookingSchema.parse(data)).toThrow();
    });

    it('validates facility enum', () => {
      const data = {
        facility: 'INVALID_FACILITY',
        date: '2026-04-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      expect(() => bookingSchema.parse(data)).toThrow();
    });

    it('requires date', () => {
      const data = {
        facility: 'GYM',
        startTime: '09:00',
        endTime: '10:00',
      };
      expect(() => bookingSchema.parse(data)).toThrow();
    });

    it('allows optional purpose', () => {
      const data = {
        facility: 'TENNIS',
        date: '2026-04-20',
        startTime: '09:00',
        endTime: '10:00',
      };
      const result = bookingSchema.parse(data);
      expect(result.purpose).toBe('');
    });
  });

  describe('userProfileSchema', () => {
    it('validates correct profile data', () => {
      const data = {
        name: 'John Doe',
        street: 'Main St',
        unit: '12',
        phone: '555-1234',
        interests: ['gardening', 'fitness'],
        isPublic: true,
      };
      expect(() => userProfileSchema.parse(data)).not.toThrow();
    });

    it('requires name', () => {
      const data = {
        name: '',
        isPublic: true,
      };
      expect(() => userProfileSchema.parse(data)).toThrow('Name is required');
    });

    it('allows empty optional fields', () => {
      const data = {
        name: 'John',
        street: '',
        unit: '',
        phone: '',
        interests: [],
        isPublic: false,
      };
      expect(() => userProfileSchema.parse(data)).not.toThrow();
    });

    it('validates interests array', () => {
      const data = {
        name: 'John',
        interests: ['gardening'],
        isPublic: true,
      };
      expect(() => userProfileSchema.parse(data)).not.toThrow();
    });
  });
});
