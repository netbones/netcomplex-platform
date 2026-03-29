import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

/** Supported language codes for i18n */
export const supportedLanguages = ['en', 'af', 'xh', 'zu'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

/** Display names for supported languages */
export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  af: 'Afrikaans',
  xh: 'Xhosa',
  zu: 'Zulu',
};

/** Default language when user preference is not set */
export const defaultLanguage = 'en';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
