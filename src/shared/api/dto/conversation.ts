import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { conversations } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));

export const conversationDto = createSelectSchema(conversations, {
  createdAt: dateSchema,
  updatedAt: dateSchema,
  name: z.string().nullable().default(null),
  capabilities: z.unknown().nullable().default(null),
}).pick({
  id: true,
  name: true,
  type: true,
  capabilities: true,
  createdAt: true,
  updatedAt: true,
});

export type ConversationDto = z.infer<typeof conversationDto>;
export type ConversationDTO = ConversationDto;

export function toConversationDTO(row: z.input<typeof conversationDto>): ConversationDto {
  return conversationDto.parse(row);
}

export function toConversationDTOs(rows: z.input<typeof conversationDto>[]): ConversationDto[] {
  return rows.map(row => conversationDto.parse(row));
}
