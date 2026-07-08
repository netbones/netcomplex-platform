import { NextRequest } from 'next/server';
import {
  auth,
  db,
  albums,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  apiError,
  now,
} from '@api/server';

import { eq, desc, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';
import { createId } from '@shared/lib/id';

export const maxDuration = 8;

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    // Enforce tenant isolation
    const { tenantId } = await withTenant();

    const { action, album, albumId } = await request.json();
    const userId = session.user.id;
    const ts = now();

    switch (action) {
      case 'create': {
        // Check album limit (max 3 per user)
        const existingAlbums = await db
          .select({ id: albums.id })
          .from(albums)
          .where(
            and(eq(albums.tenantId, tenantId), eq(albums.userId, userId), isNull(albums.deletedAt))
          );

        if (existingAlbums.length >= 3) {
          return apiError('VALIDATION_ERROR', 'Maximum 3 albums allowed', 400);
        }

        await db
          .insert(albums)
          .values({
            id: createId(),
            tenantId,
            userId,
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic || false,
            mediaIds: album.mediaIds || [],
            createdAt: ts,
            updatedAt: ts,
          })
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(
            and(eq(albums.tenantId, tenantId), eq(albums.userId, userId), isNull(albums.deletedAt))
          )
          .orderBy(desc(albums.createdAt));

        return apiSuccess({ albums: allAlbums });
      }

      case 'update': {
        await db
          .update(albums)
          .set({
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic,
            mediaIds: album.mediaIds || [],
            updatedAt: ts,
          })
          .where(
            and(eq(albums.id, album.id), eq(albums.tenantId, tenantId), eq(albums.userId, userId))
          )
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(
            and(eq(albums.tenantId, tenantId), eq(albums.userId, userId), isNull(albums.deletedAt))
          )
          .orderBy(desc(albums.createdAt));

        return apiSuccess({ albums: allAlbums });
      }

      case 'delete': {
        await db
          .update(albums)
          .set({ deletedAt: now(), updatedAt: now() })
          .where(
            and(eq(albums.id, albumId), eq(albums.tenantId, tenantId), eq(albums.userId, userId))
          );

        const allAlbums = await db
          .select()
          .from(albums)
          .where(
            and(eq(albums.tenantId, tenantId), eq(albums.userId, userId), isNull(albums.deletedAt))
          )
          .orderBy(desc(albums.createdAt));

        return apiSuccess({ albums: allAlbums });
      }

      default:
        return apiError('VALIDATION_ERROR', 'Invalid action', 400);
    }
  } catch (error) {
    logError({ component: 'albums-api', operation: 'POST' }, 'Album API error', error);
    return apiInternalError();
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      return apiUnauthorized();
    }

    const { tenantId } = await withTenant();

    const userAlbums = await db
      .select()
      .from(albums)
      .where(
        and(
          eq(albums.tenantId, tenantId),
          eq(albums.userId, session.user.id),
          isNull(albums.deletedAt)
        )
      )
      .orderBy(desc(albums.createdAt));

    return apiSuccess({ albums: userAlbums });
  } catch (error) {
    logError({ component: 'albums-api', operation: 'GET' }, 'Get albums error', error);
    return apiInternalError();
  }
}
