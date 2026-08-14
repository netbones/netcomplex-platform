import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { events } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const eventDto = createSelectSchema(events, {
  date: dateSchema,
  endDate: nullableDateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  description: true,
  date: true,
  endDate: true,
  location: true,
  organizer: true,
  image: true,
  isPublic: true,
  isDraft: true,
  category: true,
  maxAttendees: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
});

export const publicEventDto = eventDto.pick({
  id: true,
  title: true,
  description: true,
  date: true,
  location: true,
  organizer: true,
  image: true,
});

export type EventDto = z.infer<typeof eventDto>;
export type PublicEventDto = z.infer<typeof publicEventDto>;

export type EventDTO = EventDto;
export type PublicEventDTO = PublicEventDto;

export function toEventDTO(row: z.input<typeof eventDto>): EventDto {
  return eventDto.parse(row);
}

export function toEventDTOs(rows: z.input<typeof eventDto>[]): EventDto[] {
  return rows.map(row => eventDto.parse(row));
}

export function toPublicEventDTO(row: z.input<typeof publicEventDto>): PublicEventDto {
  return publicEventDto.parse(row);
}
