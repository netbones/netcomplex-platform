import { db, contentVersions, contentAuditLogs, contents } from '@api/server';
import { eq, sql } from 'drizzle-orm';
import { createId } from '@shared/lib';
import { now } from '@api/server';

export type AuditAction = 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'UNPUBLISHED' | 'FLAGGED' | 'DELETED' | 'RESTORED';

export async function snapshotContentVersion(
  contentId: string,
  userId: string | null,
  changeSummary?: string
): Promise<void> {
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) return;

  const [latest] = await db
    .select({ maxVersion: sql<number>`COALESCE(MAX(version), 0)` })
    .from(contentVersions)
    .where(eq(contentVersions.contentId, contentId));

  const nextVersion = (latest?.maxVersion ?? 0) + 1;

  await db.insert(contentVersions).values({
    id: createId(),
    contentId,
    version: nextVersion,
    snapshot: {
      title: content.title,
      content: content.content,
      excerpt: content.excerpt,
      category: content.category,
      tags: content.tags,
      published: content.published,
      featured: content.featured,
      priority: content.priority,
      defaultLocale: content.defaultLocale,
      contentType: content.contentType,
      license: content.license,
      copyrightHolder: content.copyrightHolder,
      moderationStatus: content.moderationStatus,
      groupId: content.groupId,
      publishedAt: content.publishedAt,
      expiresAt: content.expiresAt,
    },
    userId,
    changeSummary: changeSummary ?? null,
    createdAt: now(),
  });
}

export async function insertAuditLog(
  contentId: string,
  action: AuditAction,
  userId: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.insert(contentAuditLogs).values({
    id: createId(),
    contentId,
    userId,
    action,
    metadata: metadata ?? null,
    createdAt: now(),
  });
}
