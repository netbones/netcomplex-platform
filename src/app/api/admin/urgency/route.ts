import {
  apiSuccess,
  apiInternalError,
  apiUnauthorized,
  requireAnyPermission,
  runWithRLS,
  getRLSContext,
  maintenanceRequests,
  groupMembershipRequests,
  surveys,
  announcements,
  contents,
  competitions,
  now,
} from '@api/server';

import { count, eq, and, lte } from 'drizzle-orm';
import { createComponentLogger } from '@shared/lib';

export const maxDuration = 8;

const log = createComponentLogger('urgency-api');

export async function GET(request: Request) {
  try {
    const authError = await requireAnyPermission(['admin', 'settings']);
    if (authError) return authError;

    const ctx = await getRLSContext(request);
    if (!ctx) return apiUnauthorized();

    return runWithRLS(ctx, async tx => {
      const tenantId = ctx.tenantId;

      // Run queries sequentially — the transaction connection (single pg client)
      // cannot safely handle concurrent queries. Concurrent queries on one client
      // trigger the pg@8.x deprecation "client.query() when already executing".
      const openMaintenance = await tx
        .select({ count: count() })
        .from(maintenanceRequests)
        .where(
          and(
            eq(maintenanceRequests.tenantId, tenantId),
            eq(maintenanceRequests.status, 'SUBMITTED')
          )
        );

      const pendingMembers = await tx
        .select({ count: count() })
        .from(groupMembershipRequests)
        .where(
          and(
            eq(groupMembershipRequests.tenantId, tenantId),
            eq(groupMembershipRequests.status, 'PENDING')
          )
        );

      const closingSurveys = await tx
        .select({ count: count() })
        .from(surveys)
        .where(
          and(
            eq(surveys.tenantId, tenantId),
            eq(surveys.status, 'ACTIVE'),
            lte(surveys.endDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
          )
        );

      const expiredAnnouncements = await tx
        .select({ count: count() })
        .from(announcements)
        .where(and(eq(announcements.tenantId, tenantId), lte(announcements.expiresAt, now())));

      const unpublishedContent = await tx
        .select({ count: count() })
        .from(contents)
        .where(and(eq(contents.tenantId, tenantId), eq(contents.published, false)));

      const draftCompetitions = await tx
        .select({ count: count() })
        .from(competitions)
        .where(and(eq(competitions.tenantId, tenantId), eq(competitions.status, 'DRAFT')));

      const extractCount = (result: { count: number }[]) => result[0]?.count ?? 0;

      const openMaintenanceCount = extractCount(openMaintenance);
      const pendingMembersCount = extractCount(pendingMembers);
      const closingSurveysCount = extractCount(closingSurveys);
      const expiredAnnouncementsCount = extractCount(expiredAnnouncements);
      const unpublishedContentCount = extractCount(unpublishedContent);
      const draftCompetitionsCount = extractCount(draftCompetitions);

      return apiSuccess({
        commandBar: {
          openMaintenance: openMaintenanceCount,
          pendingMembers: pendingMembersCount,
          closingSurveys: closingSurveysCount,
          expiredAnnouncements: expiredAnnouncementsCount,
        },
        domainBadges: {
          users: pendingMembersCount,
          maintenance: openMaintenanceCount,
          content: unpublishedContentCount,
          events: 0,
          competitions: draftCompetitionsCount,
          resources: 0,
          surveys: closingSurveysCount,
          announcements: expiredAnnouncementsCount,
          system: 0,
        },
      });
    });
  } catch (error) {
    log.error({ operation: 'GET' }, 'Failed to get urgency counts', error);
    return apiInternalError(String(error));
  }
}
