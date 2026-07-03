import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod/v4';
import { competitions } from '../db';

const dateSchema = z.date().transform(d => d.toISOString());

export const competitionDto = createSelectSchema(competitions, {
  startDate: dateSchema,
  endDate: dateSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
}).pick({
  id: true,
  title: true,
  description: true,
  rules: true,
  prizeInfo: true,
  type: true,
  startDate: true,
  endDate: true,
  status: true,
  entryCount: true,
  maxParticipants: true,
  winnersCount: true,
  image: true,
  createdAt: true,
  updatedAt: true,
});

const CompetitionTypeEnum = z.enum(['RAFFLE', 'PHOTO', 'SCORE']);
const EntryStatusEnum = z.enum(['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']);

export const CompetitionDTO = competitionDto.extend({
  participantCount: z.number().optional(),
});

export const ParticipantDTO = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  joinedAt: z.string(),
  status: EntryStatusEnum,
  submissionUrl: z.string().nullable(),
  submissionText: z.string().nullable(),
  score: z.number().nullable(),
  winnerAt: z.string().nullable(),
  prize: z.string().nullable(),
});

export const WinnerDTO = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  prize: z.string().nullable(),
  rank: z.string().optional(),
});

export const JoinCompetitionInput = z.object({
  competitionId: z.string(),
});

export const SubmitEntryInput = z.object({
  competitionId: z.string(),
  submissionUrl: z.string().url('Invalid URL').optional(),
  submissionText: z.string().max(2000).optional(),
});

export const UpdateEntryInput = z.object({
  entryId: z.string(),
  score: z.number().min(0).max(100).optional(),
  status: EntryStatusEnum.optional(),
  prize: z.string().optional(),
});

export const DrawWinnersInput = z.object({
  competitionId: z.string(),
  count: z.number().min(1).max(100).optional().default(1),
});

export const MarkWinnerInput = z.object({
  entryId: z.string(),
  prize: z.string().optional(),
});

export type CompetitionDto = z.infer<typeof competitionDto>;
export type CompetitionType = z.infer<typeof CompetitionTypeEnum>;
export type EntryStatus = z.infer<typeof EntryStatusEnum>;
export type CompetitionDTO = z.infer<typeof CompetitionDTO>;
export type ParticipantDTO = z.infer<typeof ParticipantDTO>;
export type WinnerDTO = z.infer<typeof WinnerDTO>;
