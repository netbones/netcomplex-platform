import { db, settings } from '@api/server';
import { eq, and } from 'drizzle-orm';
import { createId } from '@shared/lib/id';
import { SETTINGS_KEYS } from '../settings';
import { createComponentLogger } from '@shared/lib';
import {
  defaultServiceCategories,
  additionalServices,
  serviceHours,
  emergencyContacts,
} from '@entities/service';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbSchema } from '@api/server';

export type {
  CategoryConfig,
  EmergencyContactConfig,
  HourConfig,
  AdditionalServiceConfig,
  ServicesPageConfig,
} from './services-config.types';

const log = createComponentLogger('services-config');

export function defaultServicesConfig(): ServicesPageConfig {
  return {
    heroVisible: true,
    categoriesVisible: true,
    emergencyVisible: true,
    hoursVisible: true,
    additionalVisible: true,
    directoryCtaVisible: true,
    categories: defaultServiceCategories.map(c => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      icon: c.icon,
      items: [...c.items],
    })),
    emergencyContacts: emergencyContacts.map(c => ({
      label: c.label,
      phone: c.phone,
    })),
    hours: serviceHours.map(h => ({
      service: h.service,
      hours: h.hours,
      highlight: h.highlight ?? false,
    })),
    additionalServices: additionalServices.map(a => ({
      id: a.id,
      icon: a.icon,
      title: a.title,
      desc: a.desc,
    })),
  };
}

export async function getServicesConfig(tenantId: string): Promise<ServicesPageConfig> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.SERVICES_CONFIG)));

    if (rows.length === 0) return defaultServicesConfig();

    const parsed = JSON.parse(rows[0].value);
    return { ...defaultServicesConfig(), ...parsed };
  } catch (error) {
    log.error({ operation: 'getServicesConfig' }, 'Failed to get config', error);
    return defaultServicesConfig();
  }
}

/**
 * Tx-aware sibling of getServicesConfig; used by routes that wrap
 * in runWithRLS() so the query executes under the app_user role.
 * Original getServicesConfig(tenantId) is kept unchanged for callers
 * outside RLS.
 */
export async function getServicesConfigWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string
): Promise<ServicesPageConfig> {
  try {
    const rows = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.SERVICES_CONFIG)));

    if (rows.length === 0) return defaultServicesConfig();

    const parsed = JSON.parse(rows[0].value);
    return { ...defaultServicesConfig(), ...parsed };
  } catch (error) {
    log.error({ operation: 'getServicesConfigWithTx' }, 'Failed to get config', error);
    return defaultServicesConfig();
  }
}

export async function upsertServicesConfig(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string,
  config: ServicesPageConfig
): Promise<boolean> {
  try {
    const [existing] = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.SERVICES_CONFIG)))
      .limit(1);

    const value = JSON.stringify(config);

    if (existing) {
      await tx.update(settings).set({ value }).where(eq(settings.id, existing.id));
    } else {
      await tx.insert(settings).values({
        id: createId(),
        tenantId,
        key: SETTINGS_KEYS.SERVICES_CONFIG,
        value,
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'upsertServicesConfig' }, 'Failed to save config', error);
    return false;
  }
}
