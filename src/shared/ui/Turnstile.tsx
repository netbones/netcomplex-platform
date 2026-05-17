'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('Turnstile');

interface TurnstileOptions {
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  tabIndex?: number;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement | string, options: unknown) => string;
      reset: (id: string, options?: unknown) => void;
      remove: (id: string) => void;
    };
  }
}

export function useTurnstile(options: TurnstileOptions = {}) {
  const [token, setToken] = useState<string>('');
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    const siteKey = options.siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return;

    const loadScript = () => {
      if (scriptLoaded.current) return;
      scriptLoaded.current = true;

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadScript();

    const checkAndRender = setInterval(() => {
      if (window.turnstile && widgetRef.current && !widgetIdRef.current) {
        clearInterval(checkAndRender);

        const container = widgetRef.current;
        container.innerHTML = '';

        const widgetId = window.turnstile.render(container, {
          sitekey: siteKey,
          theme: options.theme || 'auto',
          size: options.size || 'normal',
          tabIndex: options.tabIndex || 0,
          callback: (responseToken: string) => {
            setToken(responseToken);
          },
          'error-callback': () => {
            toast.error('Verification failed. Please try again.');
          },
          'expired-callback': () => {
            setToken('');
            toast.warning('Verification expired. Please verify again.');
          },
        });

        widgetIdRef.current = widgetId;
      }
    }, 100);

    return () => {
      clearInterval(checkAndRender);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be removed
        }
      }
    };
  }, [options.siteKey, options.theme, options.size, options.tabIndex]);

  return {
    ref: widgetRef,
    token,
    reset: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setToken('');
        } catch {
          // Reset failed
        }
      }
    },
  };
}

export function TurnstileWidget({ siteKey, theme = 'auto', size = 'normal' }: TurnstileOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (!siteKey) return;

    const loadScript = () => {
      if (document.querySelector('script[src*="turnstile"]')) return;

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadScript();

    const checkAndRender = setInterval(() => {
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        clearInterval(checkAndRender);

        const widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (responseToken: string) => {
            setToken(responseToken);
          },
        });

        widgetIdRef.current = widgetId;
      }
    }, 100);

    return () => {
      clearInterval(checkAndRender);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be removed
        }
      }
    };
  }, [siteKey, theme, size]);

  return (
    <div>
      <div ref={containerRef} />
      <input type="hidden" name="turnstile_token" value={token} />
    </div>
  );
}

export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
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
