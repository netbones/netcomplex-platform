import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

/** i18n translations for all supported languages */
const resources = {
  en: {
    common: {
      'app.name': 'Soralia Village',
      'app.tagline': 'A Community of Neighbors',
      'nav.home': 'Home',
      'nav.dashboard': 'Dashboard',
      'nav.directory': 'Directory',
      'nav.services': 'Services',
      'nav.resources': 'Resources',
      'nav.conservation': 'Conservation',
      'nav.groups': 'Groups',
      'nav.interest': 'Interests',
      'nav.maintenance': 'Maintenance',
      'nav.bookings': 'Bookings',
      'nav.messages': 'Messages',
      'nav.notifications': 'Notifications',
      'nav.login': 'Sign In',
      'nav.logout': 'Sign Out',
    },
  },
  af: {
    common: {
      'app.name': 'Soralia Village',
      'app.tagline': "'n Gemeenskap van bure",
      'nav.home': 'Tuis',
      'nav.dashboard': 'Dashbord',
      'nav.directory': 'Gids',
      'nav.services': 'Dienste',
      'nav.resources': 'Hulpbronne',
      'nav.conservation': 'Bewaring',
      'nav.groups': 'Groepe',
      'nav.interest': 'Belange',
      'nav.maintenance': 'Instandhouding',
      'nav.bookings': 'Besprekings',
      'nav.messages': 'Boodskappe',
      'nav.notifications': 'Kennisgewings',
      'nav.login': 'Teken aan',
      'nav.logout': 'Teken uit',
    },
  },
  xh: {
    common: {
      'app.name': 'Soralia Village',
      'app.tagline': 'Uluhlu lwabamelwane',
      'nav.home': 'Ikaya',
      'nav.dashboard': 'Ideshibhodi',
      'nav.directory': 'Uluhlu',
      'nav.services': 'Iinkonzo',
      'nav.resources': 'Izibonelelo',
      'nav.conservation': 'Ulondolozo',
      'nav.groups': 'Amagqitho',
      'nav.interest': 'Iimfuno',
      'nav.maintenance': 'Ukugcinwa',
      'nav.bookings': 'Amabhengezo',
      'nav.messages': 'Imiyalezo',
      'nav.notifications': 'Iimpazamo',
      'nav.login': 'Ngena',
      'nav.logout': 'Phuma',
    },
  },
  zu: {
    common: {
      'app.name': 'Soralia Village',
      'app.tagline': 'Umphakathi wabamelwane',
      'nav.home': 'Ikaya',
      'nav.dashboard': 'I-Dashboard',
      'nav.directory': 'Uhlu',
      'nav.services': 'Amasevisi',
      'nav.resources': 'Izinsiza',
      'nav.conservation': 'Ukugcinwa',
      'nav.groups': 'Amagatsha',
      'nav.interest': 'Izinto Ozinothando',
      'nav.maintenance': 'Ukunakekelwa',
      'nav.bookings': 'Amabhenebhuki',
      'nav.messages': 'Umlando',
      'nav.notifications': 'Izaziso',
      'nav.login': 'Ngena',
      'nav.logout': 'Phuma',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
