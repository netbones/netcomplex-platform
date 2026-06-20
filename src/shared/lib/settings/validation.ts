import { z } from 'zod';

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

const enabledFlags = [
  'page_campaign_enabled',
  'page_chat_enabled',
  'page_news_enabled',
  'page_events_enabled',
  'page_directory_enabled',
  'page_groups_enabled',
  'page_services_enabled',
  'page_resources_enabled',
  'page_maintenance_enabled',
  'page_surveys_enabled',
  'page_competitions_enabled',
  'page_dashboard_enabled',
  'page_bookings_enabled',
  'page_messages_enabled',
];

export const SETTINGS_VALUE_SCHEMAS: Record<string, z.ZodTypeAny> = Object.fromEntries([
  ...enabledFlags.map(k => [k, pageEnabledSchema()]),
  ['page_conservation_mode', z.enum(['default', 'iframe', 'external'])],
  ['page_conservation_external_url', z.string().url()],
  ['header_links', jsonStringArraySchema()],
  ['custom_pages', jsonStringSchema()],
  ['custom_nav', jsonStringSchema()],
  ['services_config', jsonStringSchema()],
  ['interest_categories', jsonStringArraySchema()],
] as [string, z.ZodTypeAny][]);

const fallbackSchema = z.string();

export function validateSettingValue(
  key: string,
  value: string
): {
  valid: boolean;
  error?: string;
} {
  const schema = SETTINGS_VALUE_SCHEMAS[key] ?? fallbackSchema;
  const result = schema.safeParse(value);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    return { valid: false, error: firstIssue?.message ?? 'Invalid value' };
  }
  return { valid: true };
}
