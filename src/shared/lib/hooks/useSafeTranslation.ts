'use client';

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

import { defaultLanguage } from '@shared/lib/i18n';

/**
 * Hydration-safe translation hook. Drop-in replacement for react-i18next's useTranslation.
 *
 * Adds:
 * - `tx(key, fallback, options?)` — returns English fallback until mounted + ready,
 *   then returns t(key, { ...options, defaultValue: fallback }). Guarantees identical
 *   server + first-client-render output to prevent React hydration mismatches.
 * - `mounted` — true after first client-side useEffect fires
 * - `isReady` — mounted && ready (combined flag for conditional rendering)
 * - `ready` — react-i18next's native ready flag (namespaces loaded)
 *
 * Usage: Replace `const { t } = useTranslation('common')` with
 *        `const { t, tx, isReady } = useSafeTranslation('common')`
 *        then use `tx('nav.home', 'Home')` instead of `t('nav.home')` for
 *        any text rendered in the initial SSR/hydration pass.
 */
export function useSafeTranslation(ns?: string | string[], options?: Record<string, unknown>) {
  const { t, i18n, ready } = useI18nextTranslation(ns, options);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReady = mounted && ready;

  const tx = (key: string, fallback: string, options?: Record<string, unknown>): string => {
    if (!mounted || !ready) return fallback;
    return t(key, { ...options, defaultValue: fallback });
  };

  return {
    t,
    tx,
    i18n,
    ready,
    mounted,
    isReady,
    language: i18n.language || defaultLanguage,
    changeLanguage: i18n.changeLanguage.bind(i18n),
  };
}

/**
 * Lighter hook for components that only need language operations (no translation).
 * Provides current language, initialization state, and changeLanguage.
 */
export function useLanguage() {
  const { i18n } = useI18nextTranslation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsReady(true);
    } else {
      const handleReady = () => setIsReady(true);
      i18n.on('initialized', handleReady);
      return () => {
        i18n.off('initialized', handleReady);
      };
    }
  }, [i18n]);

  return {
    language: i18n.language || defaultLanguage,
    isReady,
    changeLanguage: i18n.changeLanguage.bind(i18n),
  };
}
