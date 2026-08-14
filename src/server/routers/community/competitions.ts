import { z } from 'zod';
import {
  router,
  publicProcedure,
  tenantProcedure,
  privilegedProcedure,
  toEnvelope,
  toEnvelopeSchema,
} from '@api/server';

import { TRPCError } from '@trpc/server';
import {
  findActiveCompetitions,
  getCompetitionDetail,
  joinRaffle,
  submitPhotoEntry,
  listCompetitionParticipants,
  updateEntry,
  markEntryWinner,
  drawWinners,
  listCompetitionWinners,
} from '@/entities/competition/services';

const ParticipantOutput = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  joinedAt: z.string(),
  status: z.enum(['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']),
  submissionUrl: z.string().nullable(),
  submissionText: z.string().nullable(),
  score: z.number().nullable(),
  winnerAt: z.string().nullable(),
  prize: z.string().nullable(),
});

const WinnerOutput = z.object({
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  prize: z.string().nullable(),
  rank: z.string().optional(),
});

const CompetitionIdInput = z.object({ id: z.string() });
const CompetitionIdOnly = z.object({ competitionId: z.string() });

const SubmitEntryInput = z.object({
  competitionId: z.string(),
  submissionUrl: z.string().url('Invalid URL').optional(),
  submissionText: z.string().max(2000).optional(),
});

const UpdateEntryInput = z.object({
  entryId: z.string(),
  score: z.number().min(0).max(100).optional(),
  status: z.enum(['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']).optional(),
  prize: z.string().optional(),
});

const DrawWinnersInput = z.object({
  competitionId: z.string(),
  count: z.number().min(1).max(100).optional().default(1),
});

const MarkWinnerInput = z.object({
  entryId: z.string(),
  prize: z.string().optional(),
});

export const competitionsRouter = router({
  /**
   * List active competitions for the tenant. Public read.
   * @public
   */
  listPublicCompetitions: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/competitions/public',
        tags: ['Competitions'],
        summary: 'List active competitions',
        protect: false,
      },
    })
    .input(z.object({}).optional())
    .output(
      toEnvelopeSchema(
        z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().nullable(),
            rules: z.string().nullable(),
            prizeInfo: z.string().nullable(),
            type: z.enum(['RAFFLE', 'PHOTO', 'SCORE']),
            startDate: z.string(),
            endDate: z.string(),
            status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']),
            entryCount: z.number(),
            maxParticipants: z.number().nullable(),
            winnersCount: z.number(),
            image: z.string().nullable(),
            participantCount: z.number(),
            topParticipants: z
              .array(
                z.object({
                  userId: z.string(),
                  name: z.string(),
                  avatar: z.string().nullable(),
                })
              )
              .optional(),
          })
        )
      )
    )
    .query(async ({ ctx }) => {
      if (!ctx.tenantId)
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Tenant context required' });
      const enriched = await findActiveCompetitions(ctx.tenantId);
      return toEnvelope(enriched);
    }),

  /**
   * Get competition detail for the tenant.
   * @public
   */
  getCompetitionDetail: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/competitions/{id}',
        tags: ['Competitions'],
        summary: 'Get competition detail',
        protect: false,
      },
    })
    .input(CompetitionIdInput)
    .output(
      toEnvelopeSchema(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          rules: z.string().nullable(),
          prizeInfo: z.string().nullable(),
          type: z.enum(['RAFFLE', 'PHOTO', 'SCORE']),
          startDate: z.string(),
          endDate: z.string(),
          status: z.enum(['DRAFT', 'ACTIVE', 'ENDED', 'CANCELLED']),
          entryCount: z.number(),
          maxParticipants: z.number().nullable(),
          winnersCount: z.number(),
          image: z.string().nullable(),
          participantCount: z.number(),
          topParticipants: z
            .array(
              z.object({
                userId: z.string(),
                name: z.string(),
                avatar: z.string().nullable(),
              })
            )
            .optional(),
          currentUserEntry: z
            .object({
              id: z.string(),
              status: z.enum(['JOINED', 'WITHDRAWN', 'WINNER', 'RUNNER_UP']),
              submissionUrl: z.string().nullable(),
              submissionText: z.string().nullable(),
              joinedAt: z.string(),
            })
            .nullable()
            .optional(),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      const detail = await getCompetitionDetail(input.id, ctx.tenantId ?? undefined, ctx.userId);
      return toEnvelope(detail);
    }),

  /**
   * Join a competition for the signed-in tenant member.
   * @tenant
   */
  joinCompetition: tenantProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/competitions/{competitionId}/join',
        tags: ['Competitions'],
        summary: 'Join a competition',
        protect: true,
      },
    })
    .input(CompetitionIdOnly)
    .output(toEnvelopeSchema(ParticipantOutput))
    .mutation(async ({ input, ctx }) => {
      const participant = await joinRaffle(input.competitionId, ctx.userId, ctx.tenantId);
      return toEnvelope(participant);
    }),

  /**
   * Submit a photo entry to a competition.
   * @tenant
   */
  submitPhotoEntry: tenantProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/competitions/{competitionId}/entries',
        tags: ['Competitions'],
        summary: 'Submit a photo entry',
        protect: true,
      },
    })
    .input(SubmitEntryInput)
    .output(toEnvelopeSchema(ParticipantOutput))
    .mutation(async ({ input, ctx }) => {
      if (!input.submissionUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Photo URL is required' });
      }
      const participant = await submitPhotoEntry(
        input.competitionId,
        ctx.userId,
        ctx.tenantId,
        input.submissionUrl,
        input.submissionText
      );
      return toEnvelope(participant);
    }),

  /**
   * List competition participants. Requires elevated permissions.
   * @privileged
   */
  listParticipants: privilegedProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/competitions/{competitionId}/participants',
        tags: ['Competitions'],
        summary: 'List competition participants (admin)',
        protect: true,
      },
    })
    .input(CompetitionIdOnly)
    .output(
      toEnvelopeSchema(
        z.object({
          participants: z.array(ParticipantOutput),
          total: z.number(),
        })
      )
    )
    .query(async ({ input, ctx }) => {
      const result = await listCompetitionParticipants(input.competitionId, ctx.tenantId);
      return toEnvelope(result);
    }),

  /**
   * Update an entry. Requires elevated permissions.
   * @privileged
   */
  updateEntry: privilegedProcedure
    .meta({
      openapi: {
        method: 'PATCH',
        path: '/competitions/entries/{entryId}',
        tags: ['Competitions'],
        summary: 'Update entry (admin)',
        protect: true,
      },
    })
    .input(UpdateEntryInput)
    .output(toEnvelopeSchema(ParticipantOutput))
    .mutation(async ({ input, ctx }) => {
      const participant = await updateEntry(input.entryId, input, ctx.tenantId);
      return toEnvelope(participant);
    }),

  /**
   * Mark an entry as winner. Requires elevated permissions.
   * @privileged
   */
  markWinner: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/competitions/entries/{entryId}/winner',
        tags: ['Competitions'],
        summary: 'Mark entry as winner (admin)',
        protect: true,
      },
    })
    .input(MarkWinnerInput)
    .output(toEnvelopeSchema(ParticipantOutput))
    .mutation(async ({ input, ctx }) => {
      const participant = await markEntryWinner(input.entryId, input.prize, ctx.tenantId);
      return toEnvelope(participant);
    }),

  /**
   * Draw random winners. Requires elevated permissions.
   * @privileged
   */
  drawWinners: privilegedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/competitions/{competitionId}/draw',
        tags: ['Competitions'],
        summary: 'Draw random winners (admin)',
        protect: true,
      },
    })
    .input(DrawWinnersInput)
    .output(toEnvelopeSchema(z.array(ParticipantOutput)))
    .mutation(async ({ input, ctx }) => {
      const winners = await drawWinners(input.competitionId, ctx.tenantId, input.count);
      return toEnvelope(winners);
    }),

  /**
   * List competition winners. Public read.
   * @public
   */
  listWinners: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/competitions/{competitionId}/winners',
        tags: ['Competitions'],
        summary: 'List competition winners',
        protect: false,
      },
    })
    .input(z.object({ competitionId: z.string() }))
    .output(toEnvelopeSchema(z.array(WinnerOutput)))
    .query(async ({ input, ctx }) => {
      const winners = await listCompetitionWinners(input.competitionId, ctx.tenantId ?? undefined);
      return toEnvelope(winners);
    }),
});
