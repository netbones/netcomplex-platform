import {
  db,
  contentVersions,
  contents,
  users,
  auth,
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  revalidateContent,
  withErrorHandler,
  now,
} from '@api/server';
import { eq, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { snapshotContentVersion, insertAuditLog } from '@entities/content/server';
import { hasPermission } from '@shared/lib';

export const maxDuration = 8;

export const POST = withErrorHandler(
  async (
    request: Request,
    { params }: { params: Promise<{ id: string; versionId: string }> }
  ) => {
    const { id, versionId } = await params;

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return apiUnauthorized();

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!hasPermission(user?.role || 'RESIDENT', 'content')) return apiForbidden();

    const { tenantId } = await withTenant();

    const [version] = await db
      .select()
      .from(contentVersions)
      .where(
        and(eq(contentVersions.id, versionId), eq(contentVersions.contentId, id))
      )
      .limit(1);

    if (!version) return apiNotFound('Version not found');

    const snap = version.snapshot as Record<string, unknown>;

    await snapshotContentVersion(id, session.user.id, 'Pre-restore snapshot');

    await db
      .update(contents)
      .set({ ...snap, updatedAt: now() } as typeof contents.$inferInsert)
      .where(and(eq(contents.id, id), eq(contents.tenantId, tenantId)));

    await insertAuditLog(id, 'RESTORED', session.user.id, {
      restoredFromVersion: version.version,
      restoredFromVersionId: versionId,
    });

    revalidateContent();

    return apiSuccess({ restored: true, version: version.version });
  }
);
