import { z } from 'zod';
import {
  router,
  publicProcedure,
  tenantProcedure,
  privilegedProcedure,
  db,
  competitions,
  competitionEntries,
  users,
  notifications,
  toEnvelope,
  toEnvelopeSchema,
} from '@api/server';

// v3-compatible output schemas — the canonical DTOs in @api/server are
// built with zod/v4, which doesn't satisfy zod v3's ZodTypeAny constraint
// required by toEnvelopeSchema(). These mirror the v4 shapes for tRPC
// output validation; the runtime values are produced by toParticipantDTO().
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

import { TRPCError } from '@trpc/server';
import { eq, and, desc, asc, count, lte, gte, inArray, InferSelectModel } from 'drizzle-orm';
import { createId } from '@shared/lib/id';

// ──────────────────────────────────────────
// Input schemas
// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────

/** Get tenant-scoped competition by ID, or throw NOT_FOUND */
async function getTenantCompetition(competitionId: string, tenantId: string) {
  const [comp] = await db
    .select()
    .from(competitions)
    .where(and(eq(competitions.id, competitionId), eq(competitions.tenantId, tenantId)));
  if (!comp) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Competition not found' });
  }
  return comp;
}

/** Map a raw DB entry row + user data to ParticipantDTO shape */
function toParticipantDTO(
  entry: InferSelectModel<typeof competitionEntries>,
  user: { name: string; avatar: string | null }
) {
  return {
    id: entry.id,
    userId: entry.userId,
    name: user.name,
    avatar: user.avatar || null,
    joinedAt: entry.joinedAt.toISOString(),
    status: entry.status,
    submissionUrl: entry.submissionUrl || null,
    submissionText: entry.submissionText || null,
    score: entry.score ?? null,
    winnerAt: entry.winnerAt?.toISOString() ?? null,
    prize: entry.prize || null,
  };
}

// ──────────────────────────────────────────
// Router
// ──────────────────────────────────────────

export const competitionsRouter = router({
  /** List active competitions — no auth required.
   * @public
   *
   * TODO(BD): Create competitionDto in src/server/dto/misc.ts.
   * The inline output schema below should be replaced with competitionDto
   * derived via drizzle-zod createSelectSchema from the competitions table.
   * Tracked in netcomplex BD-21.
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
      // Inline Zod output schema — replacement tracked in BD-21
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
      const now = new Date();
      const tenantId = ctx.tenantId;

      // Build where conditions
      const conditions = [
        eq(competitions.status, 'ACTIVE'),
        lte(competitions.startDate, now),
        gte(competitions.endDate, now),
      ];
      if (tenantId) {
        conditions.push(eq(competitions.tenantId, tenantId));
      }

      const comps = await db
        .select()
        .from(competitions)
        .where(and(...conditions))
        .orderBy(desc(competitions.startDate));

      // Enrich each competition with participant count and recent participants
      const enriched = await Promise.all(
        comps.map(async comp => {
          const [countResult] = await db
            .select({ total: count() })
            .from(competitionEntries)
            .where(
              and(
                eq(competitionEntries.competitionId, comp.id),
                eq(competitionEntries.status, 'JOINED')
              )
            );
          const participantCount = countResult?.total || 0;

          // Get up to 3 recent participants for avatars
          const recentEntries = await db
            .select()
            .from(competitionEntries)
            .where(
              and(
                eq(competitionEntries.competitionId, comp.id),
                eq(competitionEntries.status, 'JOINED')
              )
            )
            .orderBy(desc(competitionEntries.joinedAt))
            .limit(3);

          const userIds = recentEntries.map(e => e.userId);
          const userRows = userIds.length
            ? await db
                .select({ id: users.id, name: users.name, avatar: users.avatar })
                .from(users)
                .where(inArray(users.id, userIds))
            : [];

          return {
            id: comp.id,
            title: comp.title,
            description: comp.description || null,
            rules: comp.rules || null,
            prizeInfo: comp.prizeInfo || null,
            type: comp.type,
            startDate: comp.startDate.toISOString(),
            endDate: comp.endDate.toISOString(),
            status: comp.status,
            entryCount: comp.entryCount,
            maxParticipants: comp.maxParticipants || null,
            winnersCount: comp.winnersCount,
            image: comp.image || null,
            participantCount,
            topParticipants: userRows.map(u => ({
              userId: u.id,
              name: u.name,
              avatar: u.avatar || null,
            })),
          };
        })
      );

      return toEnvelope(enriched);
    }),

  /** Get competition detail including participant info and current user entry status.
   * @public
   *
   * TODO(BD): Replace inline output schema with competitionDto once created.
   * See BD-21 — competitionDto should be derived via drizzle-zod from competitions table.
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
      // Inline Zod output schema — replacement tracked in BD-21
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
      const conditions = [eq(competitions.id, input.id)];
      if (ctx.tenantId) {
        conditions.push(eq(competitions.tenantId, ctx.tenantId));
      }

      const [comp] = await db
        .select()
        .from(competitions)
        .where(and(...conditions));

      if (!comp) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Competition not found' });
      }

      const [countResult] = await db
        .select({ total: count() })
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, comp.id),
            eq(competitionEntries.status, 'JOINED')
          )
        );
      const participantCount = countResult?.total || 0;

      // Get up to 10 recent participants
      const recentEntries = await db
        .select()
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, comp.id),
            eq(competitionEntries.status, 'JOINED')
          )
        )
        .orderBy(desc(competitionEntries.joinedAt))
        .limit(10);

      const userIds = recentEntries.map(e => e.userId);
      const userRows = userIds.length
        ? await db
            .select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];

      let currentUserEntry = null;
      if (ctx.userId) {
        const [entry] = await db
          .select()
          .from(competitionEntries)
          .where(
            and(
              eq(competitionEntries.competitionId, comp.id),
              eq(competitionEntries.userId, ctx.userId)
            )
          )
          .limit(1);
        if (entry) {
          currentUserEntry = {
            id: entry.id,
            status: entry.status,
            submissionUrl: entry.submissionUrl || null,
            submissionText: entry.submissionText || null,
            joinedAt: entry.joinedAt.toISOString(),
          };
        }
      }

      return toEnvelope({
        id: comp.id,
        title: comp.title,
        description: comp.description || null,
        rules: comp.rules || null,
        prizeInfo: comp.prizeInfo || null,
        type: comp.type,
        startDate: comp.startDate.toISOString(),
        endDate: comp.endDate.toISOString(),
        status: comp.status,
        entryCount: comp.entryCount,
        maxParticipants: comp.maxParticipants || null,
        winnersCount: comp.winnersCount,
        image: comp.image || null,
        participantCount,
        topParticipants: userRows.map(u => ({
          userId: u.id,
          name: u.name,
          avatar: u.avatar || null,
        })),
        currentUserEntry,
      });
    }),

  /** Join a RAFFLE competition as the authenticated user.
   * @tenant */
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
      const comp = await getTenantCompetition(input.competitionId, ctx.tenantId);
      if (comp.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is not active' });
      }
      if (comp.type !== 'RAFFLE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This competition type does not support direct joining',
        });
      }

      // Verify within date range
      const now = new Date();
      if (now < comp.startDate || now > comp.endDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Competition is not open for entries',
        });
      }

      // Check maxParticipants
      if (comp.maxParticipants) {
        const [countResult] = await db
          .select({ total: count() })
          .from(competitionEntries)
          .where(eq(competitionEntries.competitionId, comp.id));
        if ((countResult?.total || 0) >= comp.maxParticipants) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is full' });
        }
      }

      // Check user hasn't already joined
      const [existing] = await db
        .select()
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, comp.id),
            eq(competitionEntries.userId, ctx.userId)
          )
        );
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already joined this competition' });
      }

      const nowDate = new Date();
      const [entry] = await db
        .insert(competitionEntries)
        .values({
          id: createId(),
          competitionId: comp.id,
          userId: ctx.userId,
          status: 'JOINED',
          joinedAt: nowDate,
          createdAt: nowDate,
          updatedAt: nowDate,
        })
        .returning();

      // Update entryCount
      await db
        .update(competitions)
        .set({ entryCount: comp.entryCount + 1, updatedAt: nowDate })
        .where(eq(competitions.id, comp.id));

      const [user] = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, ctx.userId));

      return toEnvelope(toParticipantDTO(entry, user || { name: 'Unknown', avatar: null }));
    }),

  /** Submit a photo entry to a PHOTO competition.
   * @tenant */
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
      const comp = await getTenantCompetition(input.competitionId, ctx.tenantId);
      if (comp.status !== 'ACTIVE') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is not active' });
      }
      if (comp.type !== 'PHOTO') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This competition is not a photo contest',
        });
      }

      // Verify within date range
      const now = new Date();
      if (now < comp.startDate || now > comp.endDate) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Competition is not open for entries',
        });
      }

      // Validate submissionUrl required for PHOTO
      if (!input.submissionUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Photo URL is required' });
      }

      // Check maxParticipants
      if (comp.maxParticipants) {
        const [countResult] = await db
          .select({ total: count() })
          .from(competitionEntries)
          .where(eq(competitionEntries.competitionId, comp.id));
        if ((countResult?.total || 0) >= comp.maxParticipants) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Competition is full' });
        }
      }

      // Check user hasn't already submitted
      const [existing] = await db
        .select()
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, comp.id),
            eq(competitionEntries.userId, ctx.userId)
          )
        );
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already submitted to this competition' });
      }

      const nowDate = new Date();
      const [entry] = await db
        .insert(competitionEntries)
        .values({
          id: createId(),
          competitionId: comp.id,
          userId: ctx.userId,
          status: 'JOINED',
          joinedAt: nowDate,
          submissionUrl: input.submissionUrl || null,
          submissionText: input.submissionText || null,
          createdAt: nowDate,
          updatedAt: nowDate,
        })
        .returning();

      // Update entryCount
      await db
        .update(competitions)
        .set({ entryCount: comp.entryCount + 1, updatedAt: nowDate })
        .where(eq(competitions.id, comp.id));

      const [user] = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, ctx.userId));

      return toEnvelope(toParticipantDTO(entry, user || { name: 'Unknown', avatar: null }));
    }),

  /** List all participants in a competition — staff only.
   * @privileged */
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
      // Verify competition exists in tenant
      await getTenantCompetition(input.competitionId, ctx.tenantId);

      const entries = await db
        .select()
        .from(competitionEntries)
        .where(eq(competitionEntries.competitionId, input.competitionId))
        .orderBy(desc(competitionEntries.joinedAt));

      const userIds = [...new Set(entries.map(e => e.userId))];

      const userMap = new Map<string, { name: string; avatar: string | null }>();
      if (userIds.length) {
        const userRows = await db
          .select({ id: users.id, name: users.name, avatar: users.avatar })
          .from(users)
          .where(inArray(users.id, userIds));
        for (const u of userRows) {
          userMap.set(u.id, { name: u.name, avatar: u.avatar || null });
        }
      }

      const participants = entries.map(entry =>
        toParticipantDTO(entry, userMap.get(entry.userId) || { name: 'Unknown', avatar: null })
      );

      return toEnvelope({ participants, total: participants.length });
    }),

  /** Update entry score, status, or prize — staff only.
   * @privileged */
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
      const [entry] = await db
        .select()
        .from(competitionEntries)
        .where(eq(competitionEntries.id, input.entryId));

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      // Verify competition belongs to this tenant
      const [comp] = await db
        .select()
        .from(competitions)
        .where(
          and(eq(competitions.id, entry.competitionId), eq(competitions.tenantId, ctx.tenantId))
        );
      if (!comp) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Competition not in your tenant' });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.score !== undefined) updateData.score = input.score;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.prize !== undefined) updateData.prize = input.prize;

      const [updated] = await db
        .update(competitionEntries)
        .set(updateData)
        .where(eq(competitionEntries.id, input.entryId))
        .returning();

      const [user] = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, updated.userId));

      return toEnvelope(toParticipantDTO(updated, user || { name: 'Unknown', avatar: null }));
    }),

  /** Mark an entry as winner — staff only.
   * @privileged */
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
      const [entry] = await db
        .select()
        .from(competitionEntries)
        .where(eq(competitionEntries.id, input.entryId));

      if (!entry) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Entry not found' });
      }

      // Verify competition belongs to this tenant
      const [comp] = await db
        .select()
        .from(competitions)
        .where(
          and(eq(competitions.id, entry.competitionId), eq(competitions.tenantId, ctx.tenantId))
        );
      if (!comp) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Competition not in your tenant' });
      }

      const nowDate = new Date();
      const [updated] = await db
        .update(competitionEntries)
        .set({
          status: 'WINNER',
          winnerAt: nowDate,
          prize: input.prize || null,
          updatedAt: nowDate,
        })
        .where(eq(competitionEntries.id, input.entryId))
        .returning();

      // Create notification for the winner
      await db.insert(notifications).values([
        {
          id: createId(),
          tenantId: ctx.tenantId,
          userId: updated.userId,
          title: `You won ${comp.title}!`,
          message: `Congratulations! You won ${comp.title}.`,
          type: 'info',
          link: `/competition/${comp.id}`,
          read: false,
          createdAt: nowDate,
        },
      ] as (typeof notifications.$inferInsert)[]);

      const [user] = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, updated.userId));

      return toEnvelope(toParticipantDTO(updated, user || { name: 'Unknown', avatar: null }));
    }),

  /** Draw random winners for a RAFFLE competition — staff only.
   * @privileged */
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
      const comp = await getTenantCompetition(input.competitionId, ctx.tenantId);
      if (comp.type !== 'RAFFLE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Draw only available for RAFFLE competitions',
        });
      }

      // Fetch all JOINED entries
      const entries = await db
        .select()
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, comp.id),
            eq(competitionEntries.status, 'JOINED')
          )
        );

      if (entries.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No participants to draw from' });
      }

      const drawCount = Math.min(input.count || comp.winnersCount, entries.length);

      // Fisher-Yates shuffle
      const shuffled = [...entries];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const selected = shuffled.slice(0, drawCount);
      const nowDate = new Date();
      const selectedIds = selected.map(e => e.id);

      // Batch UPDATE all winners in one query
      const updatedEntries =
        selectedIds.length > 0
          ? await db
              .update(competitionEntries)
              .set({ status: 'WINNER', winnerAt: nowDate, updatedAt: nowDate })
              .where(inArray(competitionEntries.id, selectedIds))
              .returning()
          : [];

      // Batch INSERT all notifications in one query
      if (selected.length > 0) {
        await db.insert(notifications).values(
          selected.map(entry => ({
            id: createId(),
            tenantId: ctx.tenantId,
            userId: entry.userId,
            title: `You won ${comp.title}!`,
            message: `Congratulations! You won ${comp.title}.`,
            type: 'info' as const,
            link: `/competition/${comp.id}`,
            read: false,
            createdAt: nowDate,
          }))
        );
      }

      // Fetch user data for all winners
      const userIds = updatedEntries.map(e => e.userId);
      const userRows = userIds.length
        ? await db
            .select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));

      return toEnvelope(
        updatedEntries.map(entry =>
          toParticipantDTO(entry, userMap.get(entry.userId) || { name: 'Unknown', avatar: null })
        )
      );
    }),

  /** List winners for a competition — no auth required.
   * @public */
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
      // For tenant-scoped access, join with competition to check tenant
      if (ctx.tenantId) {
        const [comp] = await db
          .select({ tenantId: competitions.tenantId })
          .from(competitions)
          .where(
            and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, ctx.tenantId))
          );
        if (!comp) {
          return toEnvelope([]);
        }
      }

      const winnerEntries = await db
        .select()
        .from(competitionEntries)
        .where(
          and(
            eq(competitionEntries.competitionId, input.competitionId),
            inArray(competitionEntries.status, ['WINNER', 'RUNNER_UP'] as const)
          )
        )
        .orderBy(asc(competitionEntries.winnerAt));

      if (!winnerEntries.length) return toEnvelope([]);

      const userIds = [...new Set(winnerEntries.map(e => e.userId))];
      const userRows = userIds.length
        ? await db
            .select({ id: users.id, name: users.name, avatar: users.avatar })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
      const userMap = new Map(userRows.map(u => [u.id, u]));

      return toEnvelope(
        winnerEntries.map(entry => ({
          userId: entry.userId,
          name: userMap.get(entry.userId)?.name || 'Unknown',
          avatar: userMap.get(entry.userId)?.avatar || null,
          prize: entry.prize || null,
          rank: entry.status === 'WINNER' ? 'WINNER' : 'RUNNER_UP',
        }))
      );
    }),
});
