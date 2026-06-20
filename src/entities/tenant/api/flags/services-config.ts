import { db, settings } from '@api/server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
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

const log = createComponentLogger('services-config');

export interface CategoryConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  items: string[];
}

export interface EmergencyContactConfig {
  label: string;
  phone: string;
}

export interface HourConfig {
  service: string;
  hours: string;
  highlight: boolean;
}

export interface AdditionalServiceConfig {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface ServicesPageConfig {
  heroVisible: boolean;
  categoriesVisible: boolean;
  emergencyVisible: boolean;
  hoursVisible: boolean;
  additionalVisible: boolean;
  directoryCtaVisible: boolean;
  categories: CategoryConfig[];
  emergencyContacts: EmergencyContactConfig[];
  hours: HourConfig[];
  additionalServices: AdditionalServiceConfig[];
}

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
      .where(eq(settings.tenantId, tenantId))
      .then(r => r.filter(s => s.key === SETTINGS_KEYS.SERVICES_CONFIG));

    if (rows.length === 0) return defaultServicesConfig();

    const parsed = JSON.parse(rows[0].value);
    return { ...defaultServicesConfig(), ...parsed };
  } catch (error) {
    log.error({ operation: 'getServicesConfig' }, 'Failed to get config', error);
    return defaultServicesConfig();
  }
}

export async function upsertServicesConfig(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string,
  config: ServicesPageConfig
): Promise<boolean> {
  try {
    const existing = await tx
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId))
      .then(r => r.find(s => s.key === SETTINGS_KEYS.SERVICES_CONFIG));

    const value = JSON.stringify(config);

    if (existing) {
      await tx.update(settings).set({ value }).where(eq(settings.id, existing.id));
    } else {
      await tx.insert(settings).values({
        id: uuidv4(),
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
