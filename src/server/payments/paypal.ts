import 'server-only';

import type {
  PaymentInitializationContext,
  PaymentInitializationResult,
  RefundExecutionResult,
  WebhookVerificationResult,
} from './paystack';

function getPayPalBaseUrl(): string {
  const configured = process.env.PAYPAL_BASE_URL?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === 'production'
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com';
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || null;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() || null;
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || null;

  return {
    clientId,
    clientSecret,
    webhookId,
    configured: Boolean(clientId && clientSecret),
  };
}

export class PayPalService {
  private async getAccessToken(): Promise<string | null> {
    const credentials = getPayPalCredentials();
    if (!credentials.configured) {
      return null;
    }

    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json().catch(() => null)) as { access_token?: string } | null;
    return body?.access_token ?? null;
  }

  async createOrder(context: PaymentInitializationContext): Promise<PaymentInitializationResult> {
    const credentials = getPayPalCredentials();
    if (!credentials.configured) {
      return {
        status: 'configuration_required',
        paymentUrl: null,
        reference: context.reference,
        message: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be configured to create orders.',
      };
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return {
        status: 'degraded',
        paymentUrl: null,
        reference: context.reference,
        message: 'Unable to acquire a PayPal access token in this environment.',
      };
    }

    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: context.reference,
            custom_id: context.reference,
            amount: {
              currency_code: context.currency,
              value: context.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: context.callbackUrl ?? undefined,
          cancel_url: context.callbackUrl ?? undefined,
        },
      }),
    });

    const body = (await response.json().catch(() => null)) as {
      id?: string;
      links?: Array<{ href?: string; rel?: string }>;
      message?: string;
    } | null;

    if (!response.ok || !body?.id) {
      return {
        status: 'degraded',
        paymentUrl: null,
        reference: context.reference,
        message: body?.message ?? `PayPal order creation failed with status ${response.status}`,
        raw: body,
      };
    }

    const approvalUrl = body.links?.find(link => link.rel === 'approve')?.href ?? null;

    return {
      status: 'ready',
      paymentUrl: approvalUrl,
      reference: context.reference,
      orderId: body.id,
      raw: body,
    };
  }

  async captureOrder(orderId: string): Promise<unknown> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return { captured: false, reason: 'Unable to acquire PayPal access token.' };
    }

    const response = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.json().catch(() => null);
  }

  async createSubscription(): Promise<{ created: false; reason: string }> {
    return {
      created: false,
      reason:
        'Recurring PayPal subscriptions are deferred until the platform persists remote plan and subscription identifiers.',
    };
  }

  async cancelSubscription(): Promise<{ cancelled: false; reason: string }> {
    return {
      cancelled: false,
      reason:
        'Remote PayPal subscription cancellation is deferred until the platform persists remote subscription identifiers.',
    };
  }

  async refundCapture(params: {
    captureId: string;
    amount: number;
    currency: string;
    reason: string;
  }): Promise<RefundExecutionResult> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return {
        status: 'configuration_required',
        refundReference: null,
        message: 'Unable to acquire PayPal access token for refund execution.',
      };
    }

    const response = await fetch(
      `${getPayPalBaseUrl()}/v2/payments/captures/${encodeURIComponent(params.captureId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            currency_code: params.currency,
            value: params.amount.toFixed(2),
          },
          note_to_payer: params.reason,
        }),
      }
    );

    const body = (await response.json().catch(() => null)) as {
      id?: string;
      status?: string;
      message?: string;
    } | null;

    if (!response.ok || !body?.id) {
      return {
        status: 'degraded',
        refundReference: null,
        message: body?.message ?? `PayPal refund failed with status ${response.status}`,
        raw: body,
      };
    }

    return {
      status: 'completed',
      refundReference: body.id,
      message: body.status
        ? `PayPal refund ${body.status.toLowerCase()}.`
        : 'PayPal refund submitted successfully.',
      processedAmount: params.amount,
      raw: body,
    };
  }

  async verifyWebhookSignature(
    body: Record<string, unknown>,
    headers: Headers
  ): Promise<WebhookVerificationResult> {
    const credentials = getPayPalCredentials();
    if (!credentials.configured || !credentials.webhookId) {
      return {
        verified: false,
        reason:
          'PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_WEBHOOK_ID are required for webhook verification.',
      };
    }

    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const certUrl = headers.get('paypal-cert-url');
    const authAlgo = headers.get('paypal-auth-algo');

    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      return { verified: false, reason: 'Missing required PayPal webhook verification headers.' };
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return { verified: false, reason: 'Unable to acquire PayPal access token.' };
    }

    const response = await fetch(
      `${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: credentials.webhookId,
          webhook_event: body,
        }),
      }
    );

    const payload = (await response.json().catch(() => null)) as {
      verification_status?: string;
    } | null;

    if (!response.ok) {
      return {
        verified: false,
        reason: `PayPal webhook verification failed with status ${response.status}`,
      };
    }

    return payload?.verification_status === 'SUCCESS'
      ? { verified: true }
      : { verified: false, reason: 'PayPal webhook signature verification was not successful.' };
  }
}
