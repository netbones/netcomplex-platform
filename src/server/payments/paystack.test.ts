import crypto from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PaystackService } from './paystack';

const ORIGINAL_SECRET = process.env.PAYSTACK_SECRET_KEY;

describe('PaystackService.verifyWebhookSignature', () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.PAYSTACK_SECRET_KEY;
      return;
    }

    process.env.PAYSTACK_SECRET_KEY = ORIGINAL_SECRET;
  });

  it('verifies a valid signature', () => {
    const service = new PaystackService();
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } });
    const signature = crypto
      .createHmac('sha512', 'test-paystack-secret')
      .update(body)
      .digest('hex');

    expect(service.verifyWebhookSignature(body, signature)).toEqual({ verified: true });
  });

  it('rejects a malformed signature without throwing', () => {
    const service = new PaystackService();
    const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_123' } });

    expect(service.verifyWebhookSignature(body, 'short-signature')).toEqual({
      verified: false,
      reason: 'Invalid Paystack webhook signature.',
    });
  });
});
