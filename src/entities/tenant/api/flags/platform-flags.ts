import { db, settings, CACHE_TAGS } from '@api/server';

import type { DbSchema } from '@api/server';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

import { createId } from '@shared/lib/id';
import { createComponentLogger } from '@shared/lib';

const log = createComponentLogger('platform-flags');

import { type PlatformPageFlags } from '@shared/lib';
export type { PlatformPageFlags };

import { FLAG_DEFS, DEFAULT_PAGE_FLAGS, type FlagDef } from '../settings-defs';

function applySettingToFlags(flags: PlatformPageFlags, key: string, value: string): void {
  const entry = Object.entries(FLAG_DEFS).find(([_, def]) => def.settingKey === key) as
    | [keyof PlatformPageFlags, FlagDef]
    | undefined;
  if (!entry) return;

  const [flagKey, def] = entry;

  if (def.type === 'boolean') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (flags as any)[flagKey] = value === 'true';
  } else if (def.type === 'json') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (flags as any)[flagKey] = parsed;
      }
    } catch {
      /* keep default */
    }
  } else {
    const raw = value as unknown;
    if (!def.enumValues || def.enumValues.includes(raw as string)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (flags as any)[flagKey] = raw;
    }
  }
}

function buildFlagsFromSettings(rows: { key: string; value: string }[]): PlatformPageFlags {
  const flags: PlatformPageFlags = { ...DEFAULT_PAGE_FLAGS };
  for (const row of rows) {
    applySettingToFlags(flags, row.key, row.value);
  }
  return flags;
}

export async function getPlatformPageFlagsImpl(tenantId: string): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
    return buildFlagsFromSettings(tenantSettings);
  } catch (error) {
    log.error({ operation: 'getPageFlags' }, 'Failed to get platform page flags', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

export const getPlatformPageFlags = unstable_cache(
  getPlatformPageFlagsImpl,
  ['platform-page-flags'],
  {
    revalidate: 300,
    tags: [CACHE_TAGS.SETTINGS],
  }
);

function serializeValue(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

export async function setPlatformPageFlag(
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean | string[]
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
        .set({ value: serializeValue(value) })
        .where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({
        id: createId(),
        tenantId,
        key: settingKey,
        value: serializeValue(value),
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'setPageFlag' }, 'Failed to set platform page flag', error);
    return false;
  }
}

export async function getPlatformPageFlagsWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string
): Promise<PlatformPageFlags> {
  try {
    const tenantSettings = await tx.select().from(settings).where(eq(settings.tenantId, tenantId));
    return buildFlagsFromSettings(tenantSettings);
  } catch (error) {
    log.error({ operation: 'getPageFlagsWithTx' }, 'Failed to get platform page flags', error);
    return DEFAULT_PAGE_FLAGS;
  }
}

export async function setPlatformPageFlagWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string,
  key: keyof PlatformPageFlags,
  value: string | boolean | string[]
): Promise<boolean> {
  try {
    const settingKey = mapFlagToSettingKey(key);
    if (!settingKey) return false;

    const existing = await tx
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(rows => rows.find(s => s.key === settingKey));

    if (existing) {
      await tx
        .update(settings)
        .set({ value: serializeValue(value) })
        .where(eq(settings.id, existing.id));
    } else {
      await tx.insert(settings).values({
        id: createId(),
        tenantId,
        key: settingKey,
        value: serializeValue(value),
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'setPageFlagWithTx' }, 'Failed to set platform page flag', error);
    return false;
  }
}

export function mapFlagToSettingKey(key: keyof PlatformPageFlags): string | undefined {
  return FLAG_DEFS[key]?.settingKey;
}
