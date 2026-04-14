import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  APP_TAGLINE,
  ROLES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  BOOKING_STATUSES,
  CONTENT_CATEGORIES,
  INTERESTS_DISPLAY,
  CARD_ANIMATIONS,
  MAP_CENTER,
  MAP_ZOOM,
} from '@shared/lib';

describe('constants', () => {
  describe('APP_NAME', () => {
    it('is defined correctly', () => {
      expect(APP_NAME).toBe('Soralia Village');
    });
  });

  describe('APP_TAGLINE', () => {
    it('is defined correctly', () => {
      expect(APP_TAGLINE).toBe('A Community of Neighbors');
    });
  });

  describe('ROLES', () => {
    it('contains all expected roles', () => {
      expect(ROLES.RESIDENT).toBe('RESIDENT');
      expect(ROLES.GROUP_ADMIN).toBe('GROUP_ADMIN');
      expect(ROLES.COMMITTEE).toBe('COMMITTEE');
      expect(ROLES.BOARD).toBe('BOARD');
      expect(ROLES.ADMIN).toBe('ADMIN');
    });

    it('has exactly 5 roles', () => {
      expect(Object.keys(ROLES).length).toBe(5);
    });
  });

  describe('MAINTENANCE_PRIORITIES', () => {
    it('contains all priority levels', () => {
      expect(MAINTENANCE_PRIORITIES.LOW).toBe('LOW');
      expect(MAINTENANCE_PRIORITIES.MEDIUM).toBe('MEDIUM');
      expect(MAINTENANCE_PRIORITIES.HIGH).toBe('HIGH');
      expect(MAINTENANCE_PRIORITIES.EMERGENCY).toBe('EMERGENCY');
    });
  });

  describe('MAINTENANCE_STATUSES', () => {
    it('contains all statuses', () => {
      expect(MAINTENANCE_STATUSES.SUBMITTED).toBe('SUBMITTED');
      expect(MAINTENANCE_STATUSES.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(MAINTENANCE_STATUSES.COMPLETED).toBe('COMPLETED');
      expect(MAINTENANCE_STATUSES.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('BOOKING_STATUSES', () => {
    it('contains all booking statuses', () => {
      expect(BOOKING_STATUSES.CONFIRMED).toBe('CONFIRMED');
      expect(BOOKING_STATUSES.CANCELLED).toBe('CANCELLED');
      expect(BOOKING_STATUSES.COMPLETED).toBe('COMPLETED');
    });
  });

  describe('CONTENT_CATEGORIES', () => {
    it('contains all content categories', () => {
      expect(CONTENT_CATEGORIES.ANNOUNCEMENT).toBe('ANNOUNCEMENT');
      expect(CONTENT_CATEGORIES.NEWS).toBe('NEWS');
      expect(CONTENT_CATEGORIES.EVENT).toBe('EVENT');
      expect(CONTENT_CATEGORIES.BLOG).toBe('BLOG');
    });
  });

  describe('INTERESTS_DISPLAY', () => {
    it('has display names for interests', () => {
      expect(INTERESTS_DISPLAY.gardening).toBe('Gardening');
      expect(INTERESTS_DISPLAY.fitness).toBe('Fitness');
      expect(INTERESTS_DISPLAY['book-club']).toBe('Book Club');
    });

    it('includes common interests', () => {
      expect(INTERESTS_DISPLAY.pets).toBe('Pets');
      expect(INTERESTS_DISPLAY.volunteering).toBe('Volunteering');
    });
  });

  describe('CARD_ANIMATIONS', () => {
    it('has hover animation', () => {
      expect(CARD_ANIMATIONS.hover).toContain('hover:scale');
    });

    it('has transition class', () => {
      expect(CARD_ANIMATIONS.transition).toContain('transition-all');
    });

    it('has fadeIn animation', () => {
      expect(CARD_ANIMATIONS.fadeIn).toBe('animate-fade-in');
    });

    it('has slideUp animation', () => {
      expect(CARD_ANIMATIONS.slideUp).toBe('animate-slide-up');
    });
  });

  describe('MAP_CENTER', () => {
    it('is a coordinate array', () => {
      expect(Array.isArray(MAP_CENTER)).toBe(true);
      expect(MAP_CENTER.length).toBe(2);
    });

    it('has valid latitude and longitude', () => {
      expect(MAP_CENTER[0]).toBeCloseTo(-34, 0);
      expect(MAP_CENTER[1]).toBeCloseTo(18.48, 1);
    });
  });

  describe('MAP_ZOOM', () => {
    it('is a positive number', () => {
      expect(typeof MAP_ZOOM).toBe('number');
      expect(MAP_ZOOM).toBeGreaterThan(0);
      expect(MAP_ZOOM).toBeLessThanOrEqual(20);
    });
  });
});
