export const SETTINGS_KEYS = {
  PAGE_CAMPAIGN_ENABLED: 'page_campaign_enabled',
  PAGE_CONSERVATION_MODE: 'page_conservation_mode',
  PAGE_CONSERVATION_URL: 'page_conservation_external_url',
  PAGE_CHAT_ENABLED: 'page_chat_enabled',
  PAGE_NEWS_ENABLED: 'page_news_enabled',
  PAGE_EVENTS_ENABLED: 'page_events_enabled',
  PAGE_DIRECTORY_ENABLED: 'page_directory_enabled',
  CUSTOM_PAGES: 'custom_pages',
  CUSTOM_NAV: 'custom_nav',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
