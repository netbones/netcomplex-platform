import type { InferSelectModel } from 'drizzle-orm';
import { events } from '../db';

// API-safe event shape
export interface EventDTO {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// Public-facing event shape (no internal fields)
export interface PublicEventDTO {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: string | null;
}

// Maps a Drizzle event row to EventDTO
export function toEventDTO(event: InferSelectModel<typeof events>): EventDTO {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date?.toISOString() ?? new Date().toISOString(),
    location: event.location,
    organizer: event.organizer,
    image: event.image || null,
    isPublic: event.isPublic,
    createdAt: event.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: event.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

// Maps an array of Drizzle event rows to EventDTO[]
export function toEventDTOs(eventRows: InferSelectModel<typeof events>[]): EventDTO[] {
  return eventRows.map(toEventDTO);
}

// Maps a Drizzle event row to PublicEventDTO
export function toPublicEventDTO(event: InferSelectModel<typeof events>): PublicEventDTO {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date?.toISOString() ?? new Date().toISOString(),
    location: event.location,
    organizer: event.organizer,
    image: event.image || null,
  };
}
