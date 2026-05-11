'use client';

import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { defaultLanguage } from '@shared/lib/i18n';

/**
 * Custom hook that wraps react-i18next's useTranslation.
 * Provides translation function, language switching, and initialization state.
 * @returns Translation utilities including t function, i18n instance, current language, and changeLanguage function
 */
export function useTranslation() {
  const { t, i18n } = useI18nextTranslation();
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
    t,
    i18n,
    language: i18n.language || defaultLanguage,
    isReady,
    changeLanguage: i18n.changeLanguage.bind(i18n),
  };
}

/**
 * Custom hook for accessing and changing the current language.
 * Lighter version of useTranslation for components that only need language operations.
 * @returns Current language, initialization state, and changeLanguage function
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
