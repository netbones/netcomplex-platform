import {
  db,
  comments,
  commentVotes,
  commentReports,
  rateLimitMiddleware,
  router,
  tenantProcedure,
  privilegedProcedure,
  toEnvelope,
  revalidateContent,
} from '@api/server';
import { commentDto } from '@api/server';
import { TRPCError } from '@trpc/server';
import { eq, and, isNull, inArray } from 'drizzle-orm';

import {
  createCommentSchema,
  voteSchema,
  reportSchema,
  moderateSchema,
  listCommentsSchema,
  listFlaggedSchema,
} from '@entities/comment';

import {
  buildCommentTree,
  fetchCommentsForContent,
  createCommentService,
  voteOnComment,
  reportCommentService,
  moderateCommentService,
  listFlaggedComments,
} from '@entities/comment/server';

import { canModerateComments, canVote } from '@entities/comment';

export const commentsRouter = router({
  list: tenantProcedure.input(listCommentsSchema).query(async ({ input, ctx }) => {
    const flat = await fetchCommentsForContent(ctx.tenantId, input.contentId);
    const tree = buildCommentTree(flat);

    const userVotes = new Map<string, 'UPVOTE' | 'DOWNVOTE'>();
    if (ctx.userId) {
      const allIds = flat.map(c => c.id);
      if (allIds.length > 0) {
        const votes = await db
          .select()
          .from(commentVotes)
          .where(
            and(
              eq(commentVotes.tenantId, ctx.tenantId),
              eq(commentVotes.userId, ctx.userId),
              inArray(commentVotes.commentId, allIds)
            )
          );
        for (const v of votes) {
          userVotes.set(v.commentId, v.type as 'UPVOTE' | 'DOWNVOTE');
        }
      }
    }

    const items = tree.map(root => ({
      ...root,
      author: root.author,
      userVote: userVotes.get(root.id) ?? null,
      replies: root.replies.map(r => ({
        ...r,
        author: r.author,
        userVote: userVotes.get(r.id) ?? null,
      })),
    }));

    return toEnvelope(items);
  }),

  create: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 10 }))
    .input(createCommentSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }

      const parentId = input.parentId;
      let rootId = input.rootId;
      if (parentId && !rootId) {
        const [parent] = await db
          .select({ rootId: comments.rootId })
          .from(comments)
          .where(and(eq(comments.id, parentId), eq(comments.tenantId, ctx.tenantId)))
          .limit(1);
        if (!parent) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Parent comment not found' });
        }
        rootId = parent.rootId ?? parentId;
      }

      const commentId = await createCommentService(ctx.tenantId, {
        contentId: input.contentId,
        authorId: ctx.userId,
        body: input.body,
        parentId,
        rootId,
      });

      const [created] = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, commentId), eq(comments.tenantId, ctx.tenantId)))
        .limit(1);

      return toEnvelope(commentDto.parse(created));
    }),

  vote: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 30 }))
    .input(voteSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }

      if (!canVote(ctx.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed to vote' });
      }

      await db.transaction(async tx => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await voteOnComment(tx as any, {
          tenantId: ctx.tenantId,
          commentId: input.commentId,
          userId: ctx.userId,
          type: input.type,
        });
      });

      // ADVISORY-037 P1 — vote mutation had no invalidation; concurrent users
      // could not see score changes until page reload. revalidateContent()
      // runs after the tx commits so cached comment trees refresh.
      revalidateContent();

      return toEnvelope({ success: true });
    }),

  report: tenantProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 5 }))
    .input(reportSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      }

      const existing = await db
        .select({ id: commentReports.id })
        .from(commentReports)
        .where(
          and(
            eq(commentReports.commentId, input.commentId),
            eq(commentReports.reporterId, ctx.userId),
            isNull(commentReports.resolvedAt)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Already reported this comment' });
      }

      const reportId = await reportCommentService(ctx.tenantId, {
        commentId: input.commentId,
        reporterId: ctx.userId,
        reason: input.reason,
        note: input.note,
      });

      // ADVISORY-037 P1 — a report can auto-flag the comment at the
      // configured threshold, which mutates the comment row. Without
      // invalidation the flagged status was invisible until page reload.
      revalidateContent();

      return toEnvelope({ id: reportId });
    }),

  moderate: privilegedProcedure
    .use(rateLimitMiddleware({ windowMs: 60_000, maxRequests: 20 }))
    .input(moderateSchema)
    .mutation(async ({ input, ctx }) => {
      if (!canModerateComments(ctx.role)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderation not allowed' });
      }

      await moderateCommentService(ctx.tenantId, {
        commentId: input.commentId,
        action: input.action,
        notes: input.notes,
        moderatedBy: ctx.userId!,
        reportId: input.reportId,
        resolution: input.resolution,
      });

      // ADVISORY-037 P1 — moderation mutates comment status (PUBLISHED →
      // FLAGGED/REMOVED/DELETED). Without invalidation the comment tree
      // served stale state to concurrent readers until page reload.
      revalidateContent();

      return toEnvelope({ success: true });
    }),

  listFlagged: privilegedProcedure.input(listFlaggedSchema).query(async ({ input, ctx }) => {
    if (!canModerateComments(ctx.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Moderation not allowed' });
    }

    const offset = (input.page - 1) * input.limit;
    const { items, total } = await listFlaggedComments(ctx.tenantId, {
      status: input.status,
      contentId: input.contentId,
      limit: input.limit,
      offset,
    });

    return toEnvelope({
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        hasMore: offset + items.length < total,
      },
    });
  }),
});
