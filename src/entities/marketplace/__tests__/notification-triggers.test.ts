import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));
const mockSelect = vi.hoisted(() => vi.fn());

vi.mock('@api/server', () => {
  const returning = vi.fn().mockResolvedValue([{ id: 'notif-1' }]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });
  return {
    db: {
      insert,
      select: mockSelect,
    },
    notifications: {},
    users: {},
    tenants: {},
    supabase: {
      channel: vi.fn().mockReturnValue({ send: vi.fn().mockResolvedValue(undefined) }),
    },
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

vi.mock('@shared/api/email/resend', () => ({
  sendEmail: mockSendEmail,
}));

vi.mock('@shared/api/email/templates', () => ({
  templates: {
    emailNotification: {
      subject: vi.fn().mockReturnValue('Test subject'),
      getHtml: vi.fn().mockReturnValue('<html>test</html>'),
    },
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockImplementation((a, b) => ({ field: a, value: b })),
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

function buildEmailChain(prefs: Record<string, { email: boolean; inApp: boolean }> | null) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              email: 'user@test.com',
              name: 'Test User',
              prefs,
              tenantName: 'Test Tenant',
            },
          ]),
        }),
      }),
    }),
  });
}

function buildEmptyChain() {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  });
}

describe('notification-triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReset();
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

  describe('email notification', () => {
    it('sends email when user has email enabled for the notification type', async () => {
      const limitMock = vi.fn().mockResolvedValue([
        {
          email: 'user@test.com',
          name: 'Test User',
          prefs: { info: { email: true, inApp: true } },
          tenantName: 'Test Tenant',
        },
      ]);
      const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
      const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });
      mockSelect.mockReturnValue({ from: fromMock });

      await notifyInquiryReceived({
        ...baseParams,
        inquirerName: 'Alice',
        inquirerId: 'user-1',
      });

      expect(mockSelect).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalled();
      expect(innerJoinMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
      expect(limitMock).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
        })
      );
    });

    it('does not send email when user has email disabled for the type', async () => {
      buildEmailChain({ info: { email: false, inApp: true } });

      await notifyInquiryReceived({
        ...baseParams,
        inquirerName: 'Alice',
        inquirerId: 'user-1',
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('does not send email when user has no preferences for the type', async () => {
      buildEmailChain({ warning: { email: true, inApp: true } });

      await notifyInquiryReceived({
        ...baseParams,
        inquirerName: 'Alice',
        inquirerId: 'user-1',
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('does not send email when user has null preferences', async () => {
      buildEmailChain(null);

      await notifyInquiryReceived({
        ...baseParams,
        inquirerName: 'Alice',
        inquirerId: 'user-1',
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('handles missing user gracefully (no email sent)', async () => {
      buildEmptyChain();

      await notifyInquiryReceived({
        ...baseParams,
        inquirerName: 'Alice',
        inquirerId: 'user-1',
      });

      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });
});
