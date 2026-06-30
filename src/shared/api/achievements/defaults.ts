import { db } from '../db';
import { achievementDefinitions } from '@schema/achievement-definitions';
import { createId } from '@shared/lib/id';

const ACHIEVEMENT_SEEDS = [
  {
    key: 'first_booking',
    label: 'First Booking',
    description: 'Book your first facility',
    eventType: 'booking.created',
    threshold: 1,
    category: 'ENGAGEMENT' as const,
  },
  {
    key: 'first_maintenance',
    label: 'First Request',
    description: 'Submit your first maintenance request',
    eventType: 'maintenance.created',
    threshold: 1,
    category: 'ENGAGEMENT' as const,
  },
  {
    key: 'first_event_rsvp',
    label: 'Event Goer',
    description: 'RSVP to your first event',
    eventType: 'event.rsvp',
    threshold: 1,
    category: 'ENGAGEMENT' as const,
  },
  {
    key: 'first_post',
    label: 'Contributor',
    description: 'Create your first post',
    eventType: 'content.created',
    threshold: 1,
    category: 'CONTRIBUTION' as const,
  },
  {
    key: 'first_group_join',
    label: 'Joiner',
    description: 'Join your first group',
    eventType: 'group.joined',
    threshold: 1,
    category: 'ENGAGEMENT' as const,
  },
  {
    key: 'first_competition_entry',
    label: 'Competitor',
    description: 'Enter your first competition',
    eventType: 'competition.entered',
    threshold: 1,
    category: 'ENGAGEMENT' as const,
  },
  {
    key: 'maintenance_5',
    label: 'Handy Resident',
    description: 'Submit 5 maintenance requests',
    eventType: 'maintenance.created',
    threshold: 5,
    category: 'CONTRIBUTION' as const,
  },
  {
    key: 'maintenance_10',
    label: 'Maintenance Pro',
    description: 'Submit 10 maintenance requests',
    eventType: 'maintenance.created',
    threshold: 10,
    category: 'MILESTONE' as const,
  },
  {
    key: 'event_attendee_5',
    label: 'Social Butterfly',
    description: 'RSVP to 5 events',
    eventType: 'event.rsvp',
    threshold: 5,
    category: 'CONTRIBUTION' as const,
  },
  {
    key: 'event_attendee_10',
    label: 'Event Enthusiast',
    description: 'RSVP to 10 events',
    eventType: 'event.rsvp',
    threshold: 10,
    category: 'MILESTONE' as const,
  },
  {
    key: 'content_creator_5',
    label: 'Content Creator',
    description: 'Create 5 posts',
    eventType: 'content.created',
    threshold: 5,
    category: 'CONTRIBUTION' as const,
  },
  {
    key: 'bookings_3',
    label: 'Regular Booker',
    description: 'Complete 3 bookings',
    eventType: 'booking.created',
    threshold: 3,
    category: 'CONTRIBUTION' as const,
  },
];

export async function seedAchievementDefinitions(): Promise<void> {
  for (const seed of ACHIEVEMENT_SEEDS) {
    await db
      .insert(achievementDefinitions)
      .values({
        id: createId(),
        ...seed,
      })
      .onConflictDoNothing();
  }
}
