import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { messages } from '../db';

const dateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : new Date().toISOString()));
const nullableDateSchema = z
  .date()
  .nullable()
  .transform(d => (d ? d.toISOString() : null));

export const messageDto = createSelectSchema(messages, {
  deletedAt: nullableDateSchema,
  expiresAt: nullableDateSchema,
  createdAt: dateSchema,
  payload: z.unknown().nullable().default(null),
  mediaUrl: z.string().nullable().default(null),
  messageVersion: z.number().default(1),
}).pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  type: true,
  messageVersion: true,
  payload: true,
  mediaUrl: true,
  deletedAt: true,
  createdAt: true,
  expiresAt: true,
});

export type MessageDto = z.infer<typeof messageDto>;
export type MessageDTO = MessageDto;

export function toMessageDTO(row: z.input<typeof messageDto>): MessageDto {
  return messageDto.parse(row);
}

export function toMessageDTOs(rows: z.input<typeof messageDto>[]): MessageDto[] {
  return rows.map(row => messageDto.parse(row));
}
