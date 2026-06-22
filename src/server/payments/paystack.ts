import 'server-only';

import crypto from 'node:crypto';

export interface PaymentInitializationContext {
  reference: string;
  email: string;
  amount: number;
  currency: string;
  callbackUrl?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitializationResult {
  status: 'ready' | 'configuration_required' | 'degraded';
  paymentUrl: string | null;
  reference: string;
  accessCode?: string | null;
  orderId?: string | null;
  message?: string;
  raw?: unknown;
}

export interface WebhookVerificationResult {
  verified: boolean;
  reason?: string;
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getPaystackSecret(): string | null {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export class PaystackService {
  async initializePayment(
    context: PaymentInitializationContext
  ): Promise<PaymentInitializationResult> {
    const secretKey = getPaystackSecret();
    if (!secretKey) {
      return {
        status: 'configuration_required',
        paymentUrl: null,
        reference: context.reference,
        message: 'PAYSTACK_SECRET_KEY is not configured for this environment.',
      };
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: context.email,
        amount: Math.round(context.amount * 100),
        currency: context.currency,
        callback_url: context.callbackUrl ?? undefined,
        reference: context.reference,
        metadata: context.metadata ?? undefined,
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      status?: boolean;
      message?: string;
      data?: {
        authorization_url?: string;
        access_code?: string;
        reference?: string;
      };
    } | null;

    if (!response.ok || !body?.status || !body.data) {
      return {
        status: 'degraded',
        paymentUrl: null,
        reference: context.reference,
        message: body?.message ?? `Paystack initialization failed with status ${response.status}`,
        raw: body,
      };
    }

    return {
      status: 'ready',
      paymentUrl: body.data.authorization_url ?? null,
      accessCode: body.data.access_code ?? null,
      reference: body.data.reference ?? context.reference,
      raw: body,
    };
  }

  async verifyPayment(reference: string): Promise<unknown> {
    const secretKey = getPaystackSecret();
    if (!secretKey) {
      return { verified: false, reason: 'PAYSTACK_SECRET_KEY is not configured.' };
    }

    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    return response.json().catch(() => null);
  }

  async createCustomer(params: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    const secretKey = getPaystackSecret();
    if (!secretKey) {
      return { created: false, reason: 'PAYSTACK_SECRET_KEY is not configured.' };
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/customer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        phone: params.phone,
      }),
    });

    return response.json().catch(() => null);
  }

  async createSubscription(): Promise<{ created: false; reason: string }> {
    return {
      created: false,
      reason:
        'Recurring Paystack subscriptions are not wired yet in this phase; the platform currently initializes billable checkout transactions and persists subscription state locally.',
    };
  }

  async cancelSubscription(): Promise<{ cancelled: false; reason: string }> {
    return {
      cancelled: false,
      reason:
        'Remote Paystack subscription cancellation is deferred until remote subscription identifiers are persisted by the platform.',
    };
  }

  verifyWebhookSignature(body: string, signature: string | null): WebhookVerificationResult {
    const secretKey = getPaystackSecret();
    if (!secretKey) {
      return { verified: false, reason: 'PAYSTACK_SECRET_KEY is not configured.' };
    }

    if (!signature) {
      return { verified: false, reason: 'Missing X-Paystack-Signature header.' };
    }

    const expected = crypto.createHmac('sha512', secretKey).update(body).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return { verified: false, reason: 'Invalid Paystack webhook signature.' };
    }

    const verified = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

    return verified
      ? { verified: true }
      : { verified: false, reason: 'Invalid Paystack webhook signature.' };
  }
}
