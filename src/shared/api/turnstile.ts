import { ENV } from 'varlock/env';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('Turnstile');

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = ENV.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    log.warn('TURNSTILE_SECRET_KEY not configured, skipping verification');
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    log.error({}, 'Turnstile verification failed', error);
    return false;
  }
}
