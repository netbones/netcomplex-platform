import * as eventsService from '../services';
import { toEventDTO } from '@api/server';
import { createId } from '@shared/lib/id';

/**
 * Lists events for a tenant with optional limit and upcoming filter.
 */
export async function listEvents(params: { tenantId: string; limit?: number; upcoming?: boolean }) {
  const eventItems = await eventsService.listEvents(params);
  return eventItems.map(toEventDTO);
}

/**
 * Validates event fields and creates a new event.
 */
export async function createEvent(data: {
  tenantId: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  organizer: string;
  image?: string | null;
  isPublic: boolean;
}) {
  return eventsService.createEvent({
    id: createId(),
    ...data,
  });
}
