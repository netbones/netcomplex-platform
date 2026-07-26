import {
  auth,
  db,
  users,
  messages,
  bookings,
  events,
  communityServiceListings,
  communityServiceReviews,
  communityServiceInquiries,
  contents,
  announcements,
  competitions,
  groupMembers,
  notifications,
  surveys,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiInternalError,
} from '@api/server';
import { eq, and, lt, isNotNull } from 'drizzle-orm';
import { hasPermission } from '@shared/lib';
import { apiLogger } from '@/shared/lib/logger';

export const maxDuration = 60;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return apiUnauthorized();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!hasPermission(user?.role || 'RESIDENT', 'admin')) return apiForbidden();

  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Each entity with `deletedAt` purged under the same 90-day cutoff.
    // Counts returned per entity so callers can audit retention impact.
    const [
      purgedMessages,
      purgedBookings,
      purgedEvents,
      purgedListings,
      purgedReviews,
      purgedInquiries,
      purgedContents,
      purgedAnnouncements,
      purgedCompetitions,
      purgedGroupMembers,
      purgedNotifications,
      purgedSurveys,
    ] = await Promise.all([
      db
        .delete(messages)
        .where(and(isNotNull(messages.deletedAt), lt(messages.deletedAt, cutoff)))
        .returning({ id: messages.id }),
      db
        .delete(bookings)
        .where(and(isNotNull(bookings.deletedAt), lt(bookings.deletedAt, cutoff)))
        .returning({ id: bookings.id }),
      db
        .delete(events)
        .where(and(isNotNull(events.deletedAt), lt(events.deletedAt, cutoff)))
        .returning({ id: events.id }),
      db
        .delete(communityServiceListings)
        .where(
          and(
            isNotNull(communityServiceListings.deletedAt),
            lt(communityServiceListings.deletedAt, cutoff)
          )
        )
        .returning({ id: communityServiceListings.id }),
      db
        .delete(communityServiceReviews)
        .where(
          and(
            isNotNull(communityServiceReviews.deletedAt),
            lt(communityServiceReviews.deletedAt, cutoff)
          )
        )
        .returning({ id: communityServiceReviews.id }),
      db
        .delete(communityServiceInquiries)
        .where(
          and(
            isNotNull(communityServiceInquiries.deletedAt),
            lt(communityServiceInquiries.deletedAt, cutoff)
          )
        )
        .returning({ id: communityServiceInquiries.id }),
      db
        .delete(contents)
        .where(and(isNotNull(contents.deletedAt), lt(contents.deletedAt, cutoff)))
        .returning({ id: contents.id }),
      db
        .delete(announcements)
        .where(and(isNotNull(announcements.deletedAt), lt(announcements.deletedAt, cutoff)))
        .returning({ id: announcements.id }),
      db
        .delete(competitions)
        .where(and(isNotNull(competitions.deletedAt), lt(competitions.deletedAt, cutoff)))
        .returning({ id: competitions.id }),
      db
        .delete(groupMembers)
        .where(and(isNotNull(groupMembers.deletedAt), lt(groupMembers.deletedAt, cutoff)))
        .returning({ id: groupMembers.id }),
      db
        .delete(notifications)
        .where(and(isNotNull(notifications.deletedAt), lt(notifications.deletedAt, cutoff)))
        .returning({ id: notifications.id }),
      db
        .delete(surveys)
        .where(and(isNotNull(surveys.deletedAt), lt(surveys.deletedAt, cutoff)))
        .returning({ id: surveys.id }),
    ]);

    return apiSuccess({
      purged: {
        messages: purgedMessages.length,
        bookings: purgedBookings.length,
        events: purgedEvents.length,
        listings: purgedListings.length,
        reviews: purgedReviews.length,
        inquiries: purgedInquiries.length,
        contents: purgedContents.length,
        announcements: purgedAnnouncements.length,
        competitions: purgedCompetitions.length,
        groupMembers: purgedGroupMembers.length,
        notifications: purgedNotifications.length,
        surveys: purgedSurveys.length,
      },
      cutoff: cutoff.toISOString(),
      mode: 'soft-delete-retention',
    });
  } catch (error) {
    apiLogger.error({ error }, '[PURGE] Error');
    return apiInternalError();
  }
}
