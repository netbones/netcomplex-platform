import { and, eq, isNull, sql, count } from 'drizzle-orm';
import { db, comments, commentVotes, commentReports, users } from '@api/server';
import { createId } from '@shared/lib/id';

export interface CommentTreeItem {
  id: string;
  contentId: string;
  authorId: string;
  parentId: string | null;
  rootId: string | null;
  body: string;
  status: string;
  score: number;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
    profileSlug: string | null;
  } | null;
}

export function buildCommentTree(
  flat: CommentTreeItem[]
): (CommentTreeItem & { replies: CommentTreeItem[] })[] {
  const map = new Map<string, CommentTreeItem & { replies: CommentTreeItem[] }>();
  const roots: (CommentTreeItem & { replies: CommentTreeItem[] })[] = [];

  for (const item of flat) {
    map.set(item.id, { ...item, replies: [] });
  }

  for (const item of flat) {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function fetchCommentsForContent(
  tenantId: string,
  contentId: string
): Promise<CommentTreeItem[]> {
  const rows = await db
    .select({
      id: comments.id,
      contentId: comments.contentId,
      authorId: comments.authorId,
      parentId: comments.parentId,
      rootId: comments.rootId,
      body: comments.body,
      status: comments.status,
      score: comments.score,
      upvotes: comments.upvotes,
      downvotes: comments.downvotes,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      authorId_: users.id,
      authorName: users.name,
      authorAvatar: users.avatar,
      authorProfileSlug: users.profileSlug,
    })
    .from(comments)
    .leftJoin(users, eq(comments.authorId, users.id))
    .where(
      and(
        eq(comments.tenantId, tenantId),
        eq(comments.contentId, contentId),
        sql`${comments.status} IN ('PUBLISHED', 'FLAGGED')`,
        isNull(comments.deletedAt)
      )
    )
    .orderBy(sql`${comments.createdAt} ASC`);

  return rows.map(r => ({
    id: r.id,
    contentId: r.contentId,
    authorId: r.authorId,
    parentId: r.parentId,
    rootId: r.rootId,
    body: r.deletedAt ? '[deleted]' : r.body,
    status: r.status,
    score: r.score,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    editedAt: r.editedAt,
    deletedAt: r.deletedAt,
    author: r.authorId_
      ? {
          id: r.authorId_,
          name: r.authorName,
          avatar: r.authorAvatar,
          profileSlug: r.authorProfileSlug,
        }
      : null,
  }));
}

export async function createCommentService(
  tenantId: string,
  data: { contentId: string; authorId: string; body: string; parentId?: string; rootId?: string }
) {
  const id = createId();
  const now = new Date();
  await db.insert(comments).values({
    id,
    tenantId,
    contentId: data.contentId,
    authorId: data.authorId,
    body: data.body,
    parentId: data.parentId ?? null,
    rootId: data.rootId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function voteOnComment(
  tx: any,
  input: { tenantId: string; commentId: string; userId: string; type: 'UPVOTE' | 'DOWNVOTE' }
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(commentVotes)
    .where(and(eq(commentVotes.commentId, input.commentId), eq(commentVotes.userId, input.userId)))
    .limit(1);

  let upvoteDelta = 0;
  let downvoteDelta = 0;

  if (!existing) {
    await tx.insert(commentVotes).values({
      id: createId(),
      tenantId: input.tenantId,
      commentId: input.commentId,
      userId: input.userId,
      type: input.type,
    });
    if (input.type === 'UPVOTE') upvoteDelta = 1;
    else downvoteDelta = 1;
  } else if (existing.type === input.type) {
    await tx.delete(commentVotes).where(eq(commentVotes.id, existing.id));
    if (input.type === 'UPVOTE') upvoteDelta = -1;
    else downvoteDelta = -1;
  } else {
    await tx
      .update(commentVotes)
      .set({ type: input.type, updatedAt: new Date() })
      .where(eq(commentVotes.id, existing.id));
    if (input.type === 'UPVOTE') {
      upvoteDelta = 1;
      downvoteDelta = -1;
    } else {
      upvoteDelta = -1;
      downvoteDelta = 1;
    }
  }

  await tx
    .update(comments)
    .set({
      upvotes: sql`${comments.upvotes} + ${upvoteDelta}`,
      downvotes: sql`${comments.downvotes} + ${downvoteDelta}`,
      score: sql`${comments.score} + ${upvoteDelta - downvoteDelta}`,
    })
    .where(and(eq(comments.id, input.commentId), eq(comments.tenantId, input.tenantId)));
}

export async function reportCommentService(
  tenantId: string,
  data: { commentId: string; reporterId: string; reason: string; note?: string }
) {
  const id = createId();
  await db.insert(commentReports).values({
    id,
    tenantId,
    commentId: data.commentId,
    reporterId: data.reporterId,
    reason: data.reason as never,
    note: data.note ?? null,
  });

  const threshold = 3;
  const [{ count: openReports }] = await db
    .select({ count: count() })
    .from(commentReports)
    .where(and(eq(commentReports.commentId, data.commentId), isNull(commentReports.resolvedAt)));

  if (openReports >= threshold) {
    await db
      .update(comments)
      .set({ status: 'FLAGGED' })
      .where(and(eq(comments.id, data.commentId), eq(comments.tenantId, tenantId)));
  }

  return id;
}

export async function moderateCommentService(
  tenantId: string,
  data: {
    commentId: string;
    action: string;
    notes?: string;
    moderatedBy: string;
    reportId?: string;
    resolution?: string;
  }
) {
  const now = new Date();
  const statusMap: Record<string, string> = {
    HIDDEN: 'HIDDEN',
    REMOVED: 'REMOVED',
    PUBLISHED: 'PUBLISHED',
  };
  const newStatus = statusMap[data.action] ?? 'PUBLISHED';

  await db
    .update(comments)
    .set({
      status: newStatus as never,
      moderatedBy: data.moderatedBy,
      moderatedAt: now,
      moderationNotes: data.notes ?? null,
    })
    .where(and(eq(comments.id, data.commentId), eq(comments.tenantId, tenantId)));

  if (data.reportId && data.resolution) {
    await db
      .update(commentReports)
      .set({
        resolvedAt: now,
        resolvedBy: data.moderatedBy,
        resolution: data.resolution as never,
      })
      .where(eq(commentReports.id, data.reportId));
  }
}

export async function getUserVotes(
  userId: string,
  commentIds: string[]
): Promise<Map<string, 'UPVOTE' | 'DOWNVOTE'>> {
  if (commentIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(commentVotes)
    .where(
      and(
        eq(commentVotes.userId, userId),
        sql`${commentVotes.commentId} IN (${commentIds.join(',')})`
      )
    );
  const map = new Map<string, 'UPVOTE' | 'DOWNVOTE'>();
  for (const row of rows) {
    map.set(row.commentId, row.type as 'UPVOTE' | 'DOWNVOTE');
  }
  return map;
}
