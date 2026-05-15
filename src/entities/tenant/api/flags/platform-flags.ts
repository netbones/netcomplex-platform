import { db } from '@api/db';
import { settings } from '@api/db';
import { eq } from 'drizzle-orm';
import { SETTINGS_KEYS } from '../settings';
import { v4 as uuidv4 } from 'uuid';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('platform-flags');

export interface PlatformPageFlags {
  campaign: boolean;
  conservation: 'default' | 'managed' | 'external';
  conservationExternalUrl: string;
  chat: boolean;
  news: boolean;
  events: boolean;
  directory: boolean;
  groups: boolean;
  services: boolean;
  resources: boolean;
  maintenance: boolean;
  surveys: boolean;
  competitions: boolean;
}

const DEFAULT_PAGE_FLAGS: PlatformPageFlags = {
  campaign: true,
  conservation: 'default',
  conservationExternalUrl: '',
  chat: true,
  news: true,
  events: true,
  directory: true,
  groups: true,
  services: true,
  resources: true,
  maintenance: true,
  surveys: true,
  competitions: true,
};

export async function getPlatformPageFlags(tenantId: string): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

    const flags: PlatformPageFlags = { ...DEFAULT_PAGE_FLAGS };

    for (const setting of tenantSettings) {
      switch (setting.key) {
        case SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED:
          flags.campaign = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_CONSERVATION_MODE:
          if (['default', 'managed', 'external'].includes(setting.value)) {
            flags.conservation = setting.value as PlatformPageFlags['conservation'];
          }
          break;
        case SETTINGS_KEYS.PAGE_CONSERVATION_URL:
          flags.conservationExternalUrl = setting.value;
          break;
        case SETTINGS_KEYS.PAGE_CHAT_ENABLED:
          flags.chat = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_NEWS_ENABLED:
          flags.news = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_EVENTS_ENABLED:
          flags.events = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED:
          flags.directory = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_GROUPS_ENABLED:
          flags.groups = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_SERVICES_ENABLED:
          flags.services = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_RESOURCES_ENABLED:
          flags.resources = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_MAINTENANCE_ENABLED:
          flags.maintenance = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_SURVEYS_ENABLED:
          flags.surveys = setting.value === 'true';
          break;
        case SETTINGS_KEYS.PAGE_COMPETITIONS_ENABLED:
          flags.competitions = setting.value === 'true';
          break;
      }
    }

    return flags;
  } catch (error) {
    log.error({ operation: 'getPageFlags' }, 'Failed to get platform page flags', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

export async function setPlatformPageFlag(
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean
): Promise<boolean> {
  try {
    const settingKey = mapFlagToSettingKey(key);
    if (!settingKey) return false;

    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(rows => rows.find(s => s.key === settingKey));

    if (existing) {
      await db
        .update(settings)
        .set({ value: String(value) })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: settingKey,
        value: String(value),
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'setPageFlag' }, 'Failed to set platform page flag', error);
    return false;
  }
}

export function mapFlagToSettingKey(key: keyof PlatformPageFlags): string | undefined {
  const mapping: Record<keyof PlatformPageFlags, string> = {
    campaign: SETTINGS_KEYS.PAGE_CAMPAIGN_ENABLED,
    conservation: SETTINGS_KEYS.PAGE_CONSERVATION_MODE,
    conservationExternalUrl: SETTINGS_KEYS.PAGE_CONSERVATION_URL,
    chat: SETTINGS_KEYS.PAGE_CHAT_ENABLED,
    news: SETTINGS_KEYS.PAGE_NEWS_ENABLED,
    events: SETTINGS_KEYS.PAGE_EVENTS_ENABLED,
    directory: SETTINGS_KEYS.PAGE_DIRECTORY_ENABLED,
    groups: SETTINGS_KEYS.PAGE_GROUPS_ENABLED,
    services: SETTINGS_KEYS.PAGE_SERVICES_ENABLED,
    resources: SETTINGS_KEYS.PAGE_RESOURCES_ENABLED,
    maintenance: SETTINGS_KEYS.PAGE_MAINTENANCE_ENABLED,
    surveys: SETTINGS_KEYS.PAGE_SURVEYS_ENABLED,
    competitions: SETTINGS_KEYS.PAGE_COMPETITIONS_ENABLED,
  };
  return mapping[key];
}
