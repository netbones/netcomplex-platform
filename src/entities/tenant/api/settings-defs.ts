import { z } from 'zod';
import type { PlatformPageFlags, HeaderLinkId } from '@shared/lib';

type FlagType = 'boolean' | 'enum' | 'json' | 'string';

interface SettingDef {
  dbKey: string;
  flagKey?: keyof PlatformPageFlags;
  type: FlagType;
  enumValues?: readonly string[];
  defaultValue: unknown;
}

const SETTING_DEFS = [
  {
    dbKey: 'page_campaign_enabled',
    flagKey: 'campaign',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_conservation_mode',
    flagKey: 'conservation',
    type: 'enum',
    enumValues: ['default', 'managed', 'external'] as const,
    defaultValue: 'default',
  },
  {
    dbKey: 'page_conservation_external_url',
    flagKey: 'conservationExternalUrl',
    type: 'string',
    defaultValue: '',
  },
  {
    dbKey: 'page_conservation_managed_url',
    flagKey: 'conservationManagedUrl',
    type: 'string',
    defaultValue: '',
  },
  { dbKey: 'page_chat_enabled', flagKey: 'chat', type: 'boolean', defaultValue: true },
  {
    dbKey: 'page_education_enabled',
    flagKey: 'education',
    type: 'boolean',
    defaultValue: true,
  },
  { dbKey: 'page_news_enabled', flagKey: 'news', type: 'boolean', defaultValue: true },
  {
    dbKey: 'page_events_enabled',
    flagKey: 'events',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_directory_enabled',
    flagKey: 'directory',
    type: 'boolean',
    defaultValue: true,
  },
  { dbKey: 'page_groups_enabled', flagKey: 'groups', type: 'boolean', defaultValue: true },
  {
    dbKey: 'page_services_enabled',
    flagKey: 'services',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_resources_enabled',
    flagKey: 'resources',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_maintenance_enabled',
    flagKey: 'maintenance',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_surveys_enabled',
    flagKey: 'surveys',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_competitions_enabled',
    flagKey: 'competitions',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_dashboard_enabled',
    flagKey: 'dashboard',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_disputes_enabled',
    flagKey: 'disputes',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_dwallet_enabled',
    flagKey: 'dWallet',
    type: 'boolean',
    defaultValue: false,
  },
  {
    dbKey: 'page_providers_enabled',
    flagKey: 'providers',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_bookings_enabled',
    flagKey: 'bookings',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'page_marketplace_paypal_enabled',
    flagKey: 'marketplacePaypal',
    type: 'boolean',
    defaultValue: false,
  },
  {
    dbKey: 'page_messages_enabled',
    flagKey: 'messages',
    type: 'boolean',
    defaultValue: true,
  },
  {
    dbKey: 'header_links',
    flagKey: 'headerLinks',
    type: 'json',
    defaultValue: ['directory', 'groups', 'services', 'resources'] as HeaderLinkId[],
  },
  { dbKey: 'services_config', type: 'json', defaultValue: null },
  { dbKey: 'hero_carousel', type: 'json', defaultValue: null },
  {
    dbKey: 'provider_registration_mode',
    type: 'enum',
    enumValues: ['OPEN', 'INVITATION_ONLY'] as const,
    defaultValue: 'INVITATION_ONLY',
  },
  { dbKey: 'interest_categories', type: 'json', defaultValue: [] },
  { dbKey: 'merit_tier_thresholds', type: 'json', defaultValue: {} },
  { dbKey: 'merit_expiry_days', type: 'string', defaultValue: '' },
  { dbKey: 'translation_provider', type: 'string', defaultValue: '' },
  { dbKey: 'translation_api_key', type: 'string', defaultValue: '' },
  { dbKey: 'custom_pages', type: 'json', defaultValue: null },
  { dbKey: 'custom_nav', type: 'json', defaultValue: null },
  { dbKey: 'stats_homes', type: 'string', defaultValue: '180' },
  { dbKey: 'stats_years', type: 'string', defaultValue: '30' },
  { dbKey: 'stats_bird_species', type: 'string', defaultValue: '0' },
  { dbKey: 'stats_native_plants', type: 'string', defaultValue: '0' },
] as const satisfies readonly SettingDef[];

// ── SETTINGS_KEYS — key constants (preserving original names) ──

export const SETTINGS_KEYS = {
  PAGE_CAMPAIGN_ENABLED: 'page_campaign_enabled',
  PAGE_CONSERVATION_MODE: 'page_conservation_mode',
  PAGE_CONSERVATION_URL: 'page_conservation_external_url',
  PAGE_CONSERVATION_MANAGED_URL: 'page_conservation_managed_url',
  PAGE_CHAT_ENABLED: 'page_chat_enabled',
  PAGE_EDUCATION_ENABLED: 'page_education_enabled',
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
  HERO_CAROUSEL: 'hero_carousel',
  PROVIDER_REGISTRATION_MODE: 'provider_registration_mode',
  STATS_HOMES: 'stats_homes',
  STATS_YEARS: 'stats_years',
  STATS_BIRD_SPECIES: 'stats_bird_species',
  STATS_NATIVE_PLANTS: 'stats_native_plants',
  MERIT_TIER_THRESHOLDS: 'merit_tier_thresholds',
  MERIT_EXPIRY_DAYS: 'merit_expiry_days',
  TRANSLATION_PROVIDER: 'translation_provider',
  TRANSLATION_API_KEY: 'translation_api_key',
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

// ── SettingValueMap — typed value map ──

type DerivedValueMap = {
  [K in (typeof SETTING_DEFS)[number] as K['dbKey']]: K['defaultValue'];
};

export type SettingValueMap = DerivedValueMap;

// ── SETTINGS_VALUE_SCHEMAS — Zod validators ──

function pageEnabledSchema() {
  return z.enum(['true', 'false']);
}

function jsonStringArraySchema() {
  return z.string().refine(
    val => {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.every(item => typeof item === 'string');
      } catch {
        return false;
      }
    },
    { message: 'Must be a JSON array of strings' }
  );
}

function jsonStringSchema() {
  return z.string().refine(
    val => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid JSON string' }
  );
}

export const SETTINGS_VALUE_SCHEMAS: Record<string, z.ZodTypeAny> = Object.fromEntries(
  SETTING_DEFS.map(d => {
    if (d.type === 'boolean') return [d.dbKey, pageEnabledSchema()];
    if (d.type === 'enum' && 'enumValues' in d && d.enumValues) {
      return [d.dbKey, z.enum(d.enumValues as unknown as [string, ...string[]])];
    }
    if (d.type === 'json') {
      if (d.dbKey === 'header_links' || d.dbKey === 'interest_categories') {
        return [d.dbKey, jsonStringArraySchema()];
      }
      return [d.dbKey, jsonStringSchema()];
    }
    return [d.dbKey, z.string()];
  })
);

const fallbackSchema = z.string();

export function validateSettingValue(
  key: string,
  value: string
): { valid: boolean; error?: string } {
  const schema = SETTINGS_VALUE_SCHEMAS[key] ?? fallbackSchema;
  const result = schema.safeParse(value);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { valid: false, error: firstIssue?.message ?? 'Invalid value' };
  }
  return { valid: true };
}

// ── getTypedSetting — type-safe value parser ──

export function getTypedSetting<K extends keyof SettingValueMap>(
  key: K,
  value: string
): SettingValueMap[K] {
  const def = SETTING_DEFS.find(d => d.dbKey === key);
  if (!def) return value as SettingValueMap[K];

  if (def.type === 'boolean') return (value === 'true') as SettingValueMap[K];
  if (def.type === 'json') return JSON.parse(value) as SettingValueMap[K];
  if (def.type === 'enum') return value as SettingValueMap[K];
  return value as SettingValueMap[K];
}

// ── FLAG_DEFS — page flag → db key mapping ──

export interface FlagDef {
  settingKey: string;
  type: FlagType;
  enumValues?: readonly string[];
}

export const FLAG_DEFS: Record<string, FlagDef> = Object.fromEntries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SETTING_DEFS.filter((d: any) => d.flagKey).map((d: any) => [
    d.flagKey as string,
    {
      settingKey: d.dbKey,
      type: d.type,
      enumValues: d.enumValues,
    },
  ])
);

// ── DEFAULT_PAGE_FLAGS — default values for all page flags ──

export const DEFAULT_PAGE_FLAGS: PlatformPageFlags = Object.assign(
  {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...SETTING_DEFS.filter((d: any) => d.flagKey).map((d: any) => ({
    [d.flagKey]: d.defaultValue,
  }))
) as PlatformPageFlags;
