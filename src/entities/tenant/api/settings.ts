export const SETTINGS_KEYS = {
  PAGE_CAMPAIGN_ENABLED: 'page_campaign_enabled',
  PAGE_CONSERVATION_MODE: 'page_conservation_mode',
  PAGE_CONSERVATION_URL: 'page_conservation_external_url',
  PAGE_CHAT_ENABLED: 'page_chat_enabled',
  PAGE_NEWS_ENABLED: 'page_news_enabled',
  PAGE_EVENTS_ENABLED: 'page_events_enabled',
  PAGE_DIRECTORY_ENABLED: 'page_directory_enabled',
  PAGE_GROUPS_ENABLED: 'page_groups_enabled',
  PAGE_SERVICES_ENABLED: 'page_services_enabled',
  PAGE_RESOURCES_ENABLED: 'page_resources_enabled',
  PAGE_MAINTENANCE_ENABLED: 'page_maintenance_enabled',
  PAGE_SURVEYS_ENABLED: 'page_surveys_enabled',
  PAGE_COMPETITIONS_ENABLED: 'page_competitions_enabled',
  PAGE_DASHBOARD_ENABLED: 'page_dashboard_enabled',
  PAGE_BOOKINGS_ENABLED: 'page_bookings_enabled',
  PAGE_MESSAGES_ENABLED: 'page_messages_enabled',
  CUSTOM_PAGES: 'custom_pages',
  CUSTOM_NAV: 'custom_nav',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
