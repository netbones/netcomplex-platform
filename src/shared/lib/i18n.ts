import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

import {
  supportedLanguages,
  SupportedLanguage,
  languageNames,
  defaultLanguage,
  contentLocales,
  getContentLocales,
  getLocalizedValue,
  namespaces,
} from '@shared/lib';

export {
  supportedLanguages,
  type SupportedLanguage,
  languageNames,
  defaultLanguage,
  contentLocales,
  getContentLocales,
  getLocalizedValue,
  namespaces,
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      queryStringParams: { v: '1' },
    },
    lng: defaultLanguage,
    fallbackLng: defaultLanguage,
    ns: namespaces,
    defaultNS: 'common',
    preload: [...supportedLanguages],
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
