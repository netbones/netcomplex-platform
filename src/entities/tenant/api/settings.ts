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
  PAGE_DWALLET_ENABLED: 'page_dwallet_enabled',
  PAGE_BOOKINGS_ENABLED: 'page_bookings_enabled',
  PAGE_MARKETPLACE_PAYPAL_ENABLED: 'page_marketplace_paypal_enabled',
  PAGE_MESSAGES_ENABLED: 'page_messages_enabled',
  PAGE_PROVIDERS_ENABLED: 'page_providers_enabled',
  PAGE_DISPUTES_ENABLED: 'page_disputes_enabled',
  HEADER_LINKS: 'header_links',
  CUSTOM_PAGES: 'custom_pages',
  CUSTOM_NAV: 'custom_nav',
  SERVICES_CONFIG: 'services_config',
  PROVIDER_REGISTRATION_MODE: 'provider_registration_mode',

  // Community stats (non-editable, set during onboarding/seed)
  STATS_HOMES: 'stats_homes',
  STATS_YEARS: 'stats_years',
  STATS_BIRD_SPECIES: 'stats_bird_species',
  STATS_NATIVE_PLANTS: 'stats_native_plants',

  // Merit system tier thresholds (JSON: { GOLD, SILVER, BRONZE, PROBATION })
  MERIT_TIER_THRESHOLDS: 'merit_tier_thresholds',

  // Merit system — optional MERIT record expiry (days as string, default null = never)
  MERIT_EXPIRY_DAYS: 'merit_expiry_days',

  // Machine translation for content — tenant-provided API key
  TRANSLATION_PROVIDER: 'translation_provider',
  TRANSLATION_API_KEY: 'translation_api_key',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
