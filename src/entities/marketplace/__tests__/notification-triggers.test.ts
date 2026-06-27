import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @api/server
vi.mock('@api/server', () => {
  const insert = vi
    .fn()
    .mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn() }) });
  return {
    db: {
      insert,
    },
    notifications: {},
    supabase: {
      channel: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
    },
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  };
});

vi.mock('@shared/lib', () => ({
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  logError: vi.fn(),
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  notifyInquiryReceived,
  notifyInquiryResponse,
  notifyBookingConfirmed,
  notifyPaymentReceived,
  notifyReviewPosted,
  notifyListingApproved,
  notifyListingRejected,
  notifyBookingCancelled,
} from '../api/notification-triggers';

const baseParams = {
  tenantId: 'tenant-1',
  providerId: 'provider-1',
  listingId: 'listing-1',
  listingTitle: 'Test Service',
};

describe('notification-triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyInquiryReceived', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyInquiryReceived({
          ...baseParams,
          inquirerName: 'Alice',
          inquirerId: 'user-1',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyInquiryResponse', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyInquiryResponse({
          tenantId: 'tenant-1',
          inquirerId: 'user-1',
          providerName: 'Bob',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyBookingConfirmed', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyBookingConfirmed({
          tenantId: 'tenant-1',
          residentId: 'user-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
          date: '2026-07-01',
          startTime: '09:00',
          endTime: '10:00',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyPaymentReceived', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyPaymentReceived({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
          amount: 500,
          transactionId: 'txn-1',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyReviewPosted', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyReviewPosted({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
          reviewerName: 'Alice',
          rating: 4,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyListingApproved', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyListingApproved({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyListingRejected', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyListingRejected({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
          reason: 'Incomplete documentation',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('notifyBookingCancelled', () => {
    it('is callable without throwing', async () => {
      await expect(
        notifyBookingCancelled({
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          listingId: 'listing-1',
          listingTitle: 'Test Service',
          cancelledBy: 'resident',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('smoke test: all 8 functions', () => {
    it('all 8 trigger functions are exported and callable', () => {
      expect(typeof notifyInquiryReceived).toBe('function');
      expect(typeof notifyInquiryResponse).toBe('function');
      expect(typeof notifyBookingConfirmed).toBe('function');
      expect(typeof notifyPaymentReceived).toBe('function');
      expect(typeof notifyReviewPosted).toBe('function');
      expect(typeof notifyListingApproved).toBe('function');
      expect(typeof notifyListingRejected).toBe('function');
      expect(typeof notifyBookingCancelled).toBe('function');
    });
  });
});
