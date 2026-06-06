import { apiSuccess, apiInternalError, apiUnauthorized } from '@api/api-response';
import { requireAnyPermission } from '@api/auth-utils';
import { withTenant } from '@entities/tenant';
import {
  runWithRLS,
  getRLSContext,
  maintenanceRequests,
  groupMembershipRequests,
  surveys,
  announcements,
  contents,
  competitions,
} from '@api/db';
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
      const { tenantId } = await withTenant();

      const [
        openMaintenance,
        pendingMembers,
        closingSurveys,
        expiredAnnouncements,
        unpublishedContent,
        draftCompetitions,
      ] = await Promise.all([
        // Open maintenance requests (SUBMITTED status)
        tx
          .select({ count: count() })
          .from(maintenanceRequests)
          .where(
            and(
              eq(maintenanceRequests.tenantId, tenantId),
              eq(maintenanceRequests.status, 'SUBMITTED')
            )
          ),

        // Pending group membership requests
        tx
          .select({ count: count() })
          .from(groupMembershipRequests)
          .where(
            and(
              eq(groupMembershipRequests.tenantId, tenantId),
              eq(groupMembershipRequests.status, 'PENDING')
            )
          ),

        // Active surveys closing within 3 days
        tx
          .select({ count: count() })
          .from(surveys)
          .where(
            and(
              eq(surveys.tenantId, tenantId),
              eq(surveys.status, 'ACTIVE'),
              lte(surveys.endDate, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
            )
          ),

        // Announcements past their expiresAt
        tx
          .select({ count: count() })
          .from(announcements)
          .where(
            and(eq(announcements.tenantId, tenantId), lte(announcements.expiresAt, new Date()))
          ),

        // Content drafts not yet published
        tx
          .select({ count: count() })
          .from(contents)
          .where(and(eq(contents.tenantId, tenantId), eq(contents.published, false))),

        // Competitions in DRAFT status
        tx
          .select({ count: count() })
          .from(competitions)
          .where(and(eq(competitions.tenantId, tenantId), eq(competitions.status, 'DRAFT'))),
      ]);

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
