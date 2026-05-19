export * from './utils';
export * from './logger';
export * from './logging';
export {
  supportedLanguages,
  defaultLanguage,
  getLocalizedValue,
  getLocalizedContent,
  languageNames,
  getContentLocales,
  type SupportedLanguage,
} from './i18n-config';
export * from './constants';
export * from './constants/tiers';
// NOTE: Do NOT export './i18n' here — it imports react-i18next (createContext) and
// i18next-browser-languagedetector which are client-only. Import directly:
//   import { supportedLanguages, ... } from '@shared/lib/i18n'
// NOTE: useContactSettings and useApiToast are client-only hooks.
// Import them directly from their source files to avoid pulling
// client-side code (sonner, react context) into server bundles:
//   import { useContactSettings } from '@shared/lib/useContactSettings'
//   import { useApiToast } from '@shared/lib/hooks/useApiToast'
