import { NextRequest } from 'next/server';
import { auth } from '@api/auth';
import { db, albums } from '@api/db';
import { eq, desc, and } from 'drizzle-orm';
import { withTenant } from '@entities/tenant';
import { logError } from '@shared/lib';
import { apiSuccess, apiUnauthorized, apiInternalError, apiError } from '@api/api-response';

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
    const now = new Date();

    switch (action) {
      case 'create': {
        // Check album limit (max 3 per user)
        const existingAlbums = await db
          .select({ id: albums.id })
          .from(albums)
          .where(and(eq(albums.tenantId, tenantId), eq(albums.userId, userId)));

        if (existingAlbums.length >= 3) {
          return apiError('VALIDATION_ERROR', 'Maximum 3 albums allowed', 400);
        }

        const newAlbum = await db
          .insert(albums)
          .values({
            id: crypto.randomUUID(),
            tenantId,
            userId,
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic || false,
            mediaIds: album.mediaIds || [],
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(and(eq(albums.tenantId, tenantId), eq(albums.userId, userId)))
          .orderBy(desc(albums.createdAt));

        return apiSuccess({ albums: allAlbums });
      }

      case 'update': {
        const updatedAlbum = await db
          .update(albums)
          .set({
            title: album.title,
            description: album.description || null,
            isPublic: album.isPublic,
            mediaIds: album.mediaIds || [],
            updatedAt: now,
          })
          .where(
            and(eq(albums.id, album.id), eq(albums.tenantId, tenantId), eq(albums.userId, userId))
          )
          .returning();

        const allAlbums = await db
          .select()
          .from(albums)
          .where(and(eq(albums.tenantId, tenantId), eq(albums.userId, userId)))
          .orderBy(desc(albums.createdAt));

        return apiSuccess({ albums: allAlbums });
      }

      case 'delete': {
        await db
          .delete(albums)
          .where(
            and(eq(albums.id, albumId), eq(albums.tenantId, tenantId), eq(albums.userId, userId))
          );

        const allAlbums = await db
          .select()
          .from(albums)
          .where(and(eq(albums.tenantId, tenantId), eq(albums.userId, userId)))
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
      .where(and(eq(albums.tenantId, tenantId), eq(albums.userId, session.user.id)))
      .orderBy(desc(albums.createdAt));

    return apiSuccess({ albums: userAlbums });
  } catch (error) {
    logError({ component: 'albums-api', operation: 'GET' }, 'Get albums error', error);
    return apiInternalError();
  }
}
