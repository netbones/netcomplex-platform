import { z } from 'zod';

// ──────────────────────────────────────────
// Enum types
// ──────────────────────────────────────────

export const CompetitionTypeEnum = z.enum(['RAFFLE', 'PHOTO', 'SCORE']);
export type CompetitionType = z.infer<typeof CompetitionTypeEnum>;

export const EntryStatusEnum = z.enum(['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']);
export type EntryStatus = z.infer<typeof EntryStatusEnum>;

// ──────────────────────────────────────────
// Public Competition DTO
// ──────────────────────────────────────────

export const CompetitionDTO = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  rules: z.string().nullable(),
  prizeInfo: z.string().nullable(),
  type: CompetitionTypeEnum,
  startDate: z.string(), // ISO string
  endDate: z.string(), // ISO string
  status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']),
  entryCount: z.number(),
  maxParticipants: z.number().nullable(),
  winnersCount: z.number(),
  image: z.string().nullable(),
  participantCount: z.number().optional(), // computed count of JOINED entries
});

export type CompetitionDTO = z.infer<typeof CompetitionDTO>;

// ──────────────────────────────────────────
// Participant DTO
// ──────────────────────────────────────────

export const ParticipantDTO = z.object({
  id: z.string(), // CompetitionEntry id
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  joinedAt: z.string(), // ISO string
  status: EntryStatusEnum,
  submissionUrl: z.string().nullable(),
  submissionText: z.string().nullable(),
  score: z.number().nullable(),
  winnerAt: z.string().nullable(),
  prize: z.string().nullable(),
});

export type ParticipantDTO = z.infer<typeof ParticipantDTO>;

// ──────────────────────────────────────────
// Winner DTO (public winner info)
// ──────────────────────────────────────────

export const WinnerDTO = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  prize: z.string().nullable(),
  rank: z.string().optional(), // 'WINNER' or 'RUNNER_UP'
});

export type WinnerDTO = z.infer<typeof WinnerDTO>;

// ──────────────────────────────────────────
// tRPC Input Schemas
// ──────────────────────────────────────────

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
