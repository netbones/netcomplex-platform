type BoolFlag = boolean;
type ConservationMode = 'default' | 'iframe' | 'external';

export type SettingValueMap = {
  page_campaign_enabled: BoolFlag;
  page_conservation_mode: ConservationMode;
  page_conservation_external_url: string;
  page_chat_enabled: BoolFlag;
  page_news_enabled: BoolFlag;
  page_events_enabled: BoolFlag;
  page_directory_enabled: BoolFlag;
  page_groups_enabled: BoolFlag;
  page_services_enabled: BoolFlag;
  page_resources_enabled: BoolFlag;
  page_maintenance_enabled: BoolFlag;
  page_surveys_enabled: BoolFlag;
  page_competitions_enabled: BoolFlag;
  page_dashboard_enabled: BoolFlag;
  page_bookings_enabled: BoolFlag;
  page_messages_enabled: BoolFlag;
  header_links: string[];
  custom_pages: unknown;
  custom_nav: unknown;
  services_config: unknown;

  // Community stats (numeric but stored as text in the Setting table)
  stats_homes: string;
  stats_years: string;
  stats_bird_species: string;
  stats_native_plants: string;

  // Merit tier thresholds (JSON object)
  merit_tier_thresholds: unknown;

  // Merit expiry (days as string, empty = never)
  merit_expiry_days: string;
};

export function getTypedSetting<K extends keyof SettingValueMap>(
  key: K,
  value: string
): SettingValueMap[K] {
  if (key.startsWith('page_') && key.endsWith('_enabled'))
    return (value === 'true') as SettingValueMap[K];
  if (key === 'header_links') return JSON.parse(value) as SettingValueMap[K];
  if (key === 'custom_pages' || key === 'custom_nav' || key === 'services_config')
    return JSON.parse(value) as SettingValueMap[K];
  return value as SettingValueMap[K];
}
