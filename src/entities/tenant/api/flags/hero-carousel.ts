import { db, settings } from '@api/server';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { SETTINGS_KEYS } from '../settings';
import { createComponentLogger } from '@shared/lib';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { DbSchema } from '@api/server';

export type { CarouselItem, HeroCarouselConfig } from './hero-carousel.types';

const log = createComponentLogger('hero-carousel');

export function defaultHeroCarouselConfig(): HeroCarouselConfig {
  return {
    items: [
      {
        id: '1',
        image: '/carousel/1.jpg',
        title: 'For Sale',
        subtitle: '2 Bedroom Family Home',
        link: '#',
      },
      {
        id: '2',
        image: '/carousel/2.jpg',
        title: 'To Let',
        subtitle: 'Modern Lifestyle',
        link: '#',
      },
      {
        id: '3',
        image: '/carousel/3.jpg',
        title: 'Community',
        subtitle: 'Soralia Village Living',
        link: '#',
      },
      {
        id: '4',
        image: '/carousel/4.jpg',
        title: 'Events',
        subtitle: 'Join Our Community',
        link: '#',
      },
    ],
  };
}

export async function getHeroCarouselConfig(tenantId: string): Promise<HeroCarouselConfig> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.HERO_CAROUSEL)));

    if (rows.length === 0) return defaultHeroCarouselConfig();

    const parsed = JSON.parse(rows[0].value);
    return {
      ...defaultHeroCarouselConfig(),
      ...parsed,
      items: parsed.items ?? defaultHeroCarouselConfig().items,
    };
  } catch (error) {
    log.error({ operation: 'getHeroCarouselConfig' }, 'Failed to get config', error);
    return defaultHeroCarouselConfig();
  }
}

export async function getHeroCarouselConfigWithTx(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string
): Promise<HeroCarouselConfig> {
  try {
    const rows = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.HERO_CAROUSEL)));

    if (rows.length === 0) return defaultHeroCarouselConfig();

    const parsed = JSON.parse(rows[0].value);
    return {
      ...defaultHeroCarouselConfig(),
      ...parsed,
      items: parsed.items ?? defaultHeroCarouselConfig().items,
    };
  } catch (error) {
    log.error({ operation: 'getHeroCarouselConfigWithTx' }, 'Failed to get config', error);
    return defaultHeroCarouselConfig();
  }
}

export async function upsertHeroCarouselConfig(
  tx: NodePgDatabase<DbSchema>,
  tenantId: string,
  config: HeroCarouselConfig
): Promise<boolean> {
  try {
    const [existing] = await tx
      .select()
      .from(settings)
      .where(and(eq(settings.tenantId, tenantId), eq(settings.key, SETTINGS_KEYS.HERO_CAROUSEL)))
      .limit(1);

    const value = JSON.stringify(config);

    if (existing) {
      await tx.update(settings).set({ value }).where(eq(settings.id, existing.id));
    } else {
      await tx.insert(settings).values({
        id: uuidv4(),
        tenantId,
        key: SETTINGS_KEYS.HERO_CAROUSEL,
        value,
      });
    }

    return true;
  } catch (error) {
    log.error({ operation: 'upsertHeroCarouselConfig' }, 'Failed to save config', error);
    return false;
  }
}
