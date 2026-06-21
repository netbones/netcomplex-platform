import { db, contents, users, settings, apiError, apiSuccess, apiInternalError } from '@api/server';

import { eq, and, desc } from 'drizzle-orm';
import { withTenantOptional } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

// Default campaign configuration
const DEFAULT_CAMPAIGN_CONFIG = {
  linkLabel: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
  pageTitle: { en: 'Campaign', af: 'Veldtog', xh: 'Icampaign', zu: 'I-Campaign' },
  pageDescription: {
    en: 'Support our community campaign',
    af: 'Ondersteun ons gemeenskap se veldtog',
    xh: 'Uxhaso lomphefumlo wethu',
    zu: 'Sisekela umcamango weqembu lethu',
  },
  contentCategory: 'CAMPAIGN',
};

/**
 * GET /api/campaign
 *
 * Returns campaign configuration and content for the tenant.
 * Uses tenant settings if configured, otherwise falls back to defaults.
 * Supports multilingual content.
 */
export async function GET(request: Request) {
  try {
    // Get tenant context (optional for public pages)
    const { tenantId } = await withTenantOptional();
    if (!tenantId) {
      // For public pages, we need to get tenant from settings or use header-based resolution
      // In production, this should come from middleware/host header
      return apiSuccess({
        config: DEFAULT_CAMPAIGN_CONFIG,
        content: [],
      });
    }

    // Fetch tenant campaign settings
    const tenantSettings = await db.select().from(settings).where(eq(settings.tenantId, tenantId));

    const settingsMap = tenantSettings.reduce(
      (acc, s) => {
        acc[s.key] = s.value;
        return acc;
      },
      {} as Record<string, string>
    );

    // Build campaign config from settings (stored as JSON strings)
    const campaignConfig = {
      linkLabel: settingsMap.campaignLinkLabel
        ? JSON.parse(settingsMap.campaignLinkLabel)
        : DEFAULT_CAMPAIGN_CONFIG.linkLabel,
      pageTitle: settingsMap.campaignPageTitle
        ? JSON.parse(settingsMap.campaignPageTitle)
        : DEFAULT_CAMPAIGN_CONFIG.pageTitle,
      pageDescription: settingsMap.campaignPageDescription
        ? JSON.parse(settingsMap.campaignPageDescription)
        : DEFAULT_CAMPAIGN_CONFIG.pageDescription,
      contentCategory: settingsMap.campaignCategory || DEFAULT_CAMPAIGN_CONFIG.contentCategory,
    };

    // Fetch campaign content for the tenant
    // The category filter allows different tenants to have different campaign types
    // (e.g., CONSERVATION, UPLIFTMENT, FUNDRAISING, etc.)
    const campaignCategory =
      campaignConfig.contentCategory as (typeof contents.category.enumValues)[number];

    const contentList = await db
      .select({
        id: contents.id,
        title: contents.title,
        content: contents.content,
        excerpt: contents.excerpt,
        image: contents.image,
        category: contents.category,
        publishedAt: contents.publishedAt,
        featured: contents.featured,
        priority: contents.priority,
        defaultLocale: contents.defaultLocale,
        author: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(contents)
      .leftJoin(users, eq(contents.authorId, users.id))
      .where(
        and(
          eq(contents.published, true),
          eq(contents.category, campaignCategory),
          eq(contents.tenantId, tenantId)
        )
      )
      .orderBy(desc(contents.featured), desc(contents.priority), desc(contents.publishedAt));

    return apiSuccess({
      config: campaignConfig,
      content: contentList,
    });
  } catch (error) {
    logError(
      { component: 'campaign-api', operation: 'GET' },
      'Failed to fetch campaign data',
      error
    );
    return apiInternalError('Failed to fetch campaign data');
  }
}
