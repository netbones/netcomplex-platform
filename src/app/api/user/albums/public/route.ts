import { NextRequest } from 'next/server';
import {
  db,
  albums,
  users,
  apiSuccess,
  apiUnauthorized,
  apiInternalError,
  getSessionAndRole,
} from '@api/server';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { withTenant } from '@entities/tenant/server';
import { logError } from '@shared/lib';

export const maxDuration = 8;

export async function GET(request: NextRequest) {
  try {
    const authData = await getSessionAndRole(request);
    if (!authData) return apiUnauthorized();

    const { tenantId } = await withTenant();

    const publicAlbums = await db
      .select({
        id: albums.id,
        title: albums.title,
        description: albums.description,
        mediaIds: albums.mediaIds,
        createdAt: albums.createdAt,
        updatedAt: albums.updatedAt,
        userId: albums.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(albums)
      .innerJoin(users, eq(albums.userId, users.id))
      .where(
        and(eq(albums.tenantId, tenantId), eq(albums.isPublic, true), isNull(albums.deletedAt))
      )
      .orderBy(desc(albums.updatedAt));

    return apiSuccess({ albums: publicAlbums });
  } catch (error) {
    logError(
      { component: 'albums-api', operation: 'GET_PUBLIC' },
      'Get public albums error',
      error
    );
    return apiInternalError();
  }
}
