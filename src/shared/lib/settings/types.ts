import type { SettingsKey } from '@/entities/tenant/api/settings';

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
};

// compile-time guard: all keys in SettingsKey must be in SettingValueMap
type _AssertKeysCovered<T extends Record<SettingsKey, unknown>> = T;
type _Check = _AssertKeysCovered<SettingValueMap>;

export function getTypedSetting<K extends SettingsKey>(key: K, value: string): SettingValueMap[K] {
  if (key.startsWith('page_') && key.endsWith('_enabled'))
    return (value === 'true') as SettingValueMap[K];
  if (key === 'header_links') return JSON.parse(value) as SettingValueMap[K];
  if (key === 'custom_pages' || key === 'custom_nav' || key === 'services_config')
    return JSON.parse(value) as SettingValueMap[K];
  return value as SettingValueMap[K];
}
