import { describe, it, expect } from 'vitest';
import {
  getBookingConfirmationHtml,
  getInquiryReceivedHtml,
  getPaymentReceivedHtml,
} from '@shared/api/email/marketplace-templates';

describe('marketplace email templates', () => {
  const bookingParams = {
    serviceName: 'Garden Maintenance',
    providerName: 'Green Thumb Services',
    date: '2026-07-15',
    time: '09:00 - 10:00',
    price: 'R500.00',
    listingUrl: 'https://soralia.example.com/services/listing-1',
  };

  const inquiryParams = {
    serviceName: 'Plumbing Repair',
    providerName: 'Pipe Masters',
    inquirerName: 'Alice Resident',
    message: 'I have a leaking pipe in the kitchen.',
    listingUrl: 'https://soralia.example.com/services/listing-2',
  };

  const paymentParams = {
    serviceName: 'House Cleaning',
    amount: 'R350.00',
    transactionId: 'txn-abc-123',
    listingUrl: 'https://soralia.example.com/services/listing-3',
  };

  describe('getBookingConfirmationHtml', () => {
    it('returns HTML string containing service name', () => {
      const html = getBookingConfirmationHtml(bookingParams);
      expect(html).toContain('Garden Maintenance');
    });

    it('returns HTML string containing provider name', () => {
      const html = getBookingConfirmationHtml(bookingParams);
      expect(html).toContain('Green Thumb Services');
    });

    it('returns HTML string containing date', () => {
      const html = getBookingConfirmationHtml(bookingParams);
      expect(html).toContain('2026-07-15');
    });

    it('returns HTML string containing time', () => {
      const html = getBookingConfirmationHtml(bookingParams);
      expect(html).toContain('09:00');
    });

    it('returns HTML string containing price', () => {
      const html = getBookingConfirmationHtml(bookingParams);
      expect(html).toContain('R500.00');
    });

    it('does not throw with minimal params (no image)', () => {
      const html = getBookingConfirmationHtml({
        serviceName: 'Test',
        providerName: 'Test Provider',
        date: '2026-07-01',
        time: '10:00 - 11:00',
        price: 'R100.00',
        listingUrl: 'https://example.com',
      });
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    it('does not throw when optional fields are missing', () => {
      const html = getBookingConfirmationHtml({
        serviceName: 'Test',
        providerName: 'Test Provider',
        date: '2026-07-01',
        time: '10:00',
        price: 'R100.00',
        listingUrl: 'https://example.com',
        // serviceImage intentionally omitted
      });
      expect(typeof html).toBe('string');
    });
  });

  describe('getInquiryReceivedHtml', () => {
    it('returns HTML string containing service name', () => {
      const html = getInquiryReceivedHtml(inquiryParams);
      expect(html).toContain('Plumbing Repair');
    });

    it('returns HTML string containing inquirer name', () => {
      const html = getInquiryReceivedHtml(inquiryParams);
      expect(html).toContain('Alice Resident');
    });

    it('does not throw with missing message', () => {
      const html = getInquiryReceivedHtml({
        ...inquiryParams,
        message: undefined,
      });
      expect(typeof html).toBe('string');
    });
  });

  describe('getPaymentReceivedHtml', () => {
    it('returns HTML string containing service name', () => {
      const html = getPaymentReceivedHtml(paymentParams);
      expect(html).toContain('House Cleaning');
    });

    it('returns HTML string containing amount', () => {
      const html = getPaymentReceivedHtml(paymentParams);
      expect(html).toContain('R350.00');
    });

    it('returns HTML string containing transaction ID', () => {
      const html = getPaymentReceivedHtml(paymentParams);
      expect(html).toContain('txn-abc-123');
    });
  });
});
