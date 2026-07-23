import crypto from 'node:crypto';

const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000;

const idempotencyCache = new Map<string, number>();

function getSecret(): string | null {
  return process.env.PAYLOAD_WEBHOOK_SECRET ?? null;
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): { verified: boolean; reason?: string } {
  const secret = getSecret();
  if (!secret) {
    return { verified: false, reason: 'PAYLOAD_WEBHOOK_SECRET not configured' };
  }

  if (!signature) {
    return { verified: false, reason: 'Missing X-Signature-256 header' };
  }

  if (!timestamp) {
    return { verified: false, reason: 'Missing X-Signature-Timestamp header' };
  }

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return { verified: false, reason: 'Invalid X-Signature-Timestamp format' };
  }

  /* Replay window check */
  const now = Date.now();
  if (ts * 1000 < now - REPLAY_WINDOW_MS) {
    return { verified: false, reason: 'Request timestamp is too old' };
  }
  if (ts * 1000 > now + REPLAY_WINDOW_MS) {
    return { verified: false, reason: 'Request timestamp is in the future' };
  }

  /* HMAC-SHA256 over "timestamp.body" */
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(signature);

  if (expectedBuf.length !== sigBuf.length) {
    return { verified: false, reason: 'Invalid signature length' };
  }

  const ok = crypto.timingSafeEqual(expectedBuf, sigBuf);
  return ok ? { verified: true } : { verified: false, reason: 'Signature mismatch' };
}

export function checkIdempotency(key: string | null): { ok: boolean; reason?: string } {
  if (!key) {
    return { ok: true };
  }

  const stored = idempotencyCache.get(key);
  if (stored) {
    return { ok: false, reason: `Idempotency key '${key}' has already been processed` };
  }

  idempotencyCache.set(key, Date.now());
  return { ok: true };
}

/** Evict stale idempotency keys. Run periodically if desired. */
export function evictStaleIdempotencyKeys(): number {
  const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
  let evicted = 0;
  for (const [key, ts] of idempotencyCache) {
    if (ts < cutoff) {
      idempotencyCache.delete(key);
      evicted++;
    }
  }
  return evicted;
}
